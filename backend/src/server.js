const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./logic/GameRoom');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Room management
const rooms = new Map(); // roomId -> GameRoom
const connections = new Map(); // ws -> { userId, roomId, playerName }

// 非アクティブタイマーのコールバック関数を生成
function createInactivityCallback(roomId) {
  return () => {
    console.log(`🗑️ [INACTIVITY] Deleting room ${roomId} due to inactivity`);
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`⚠️ Room ${roomId} already deleted`);
      return;
    }
    // 全プレイヤーにルーム削除を通知
    broadcastToRoom(roomId, {
      type: 'roomDeleted',
      payload: { message: 'Room has been deleted due to inactivity (no activity for 5 minutes)' },
    });
    // タイマーをクリア
    room.clearAutoReadyTimer();
    room.clearGameOverTimer();
    room.clearInactivityTimer();
    // ルームを削除
    rooms.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted due to inactivity`);
  };
}

// REST API Routes

// Create a new room
app.get('/', (req, res) => {
  res.json({ message: 'Mahjong backend is running', port });
});

app.get('/api/debug', (req, res) => {
  const roomsInfo = [];
  rooms.forEach((room, roomId) => {
    const playersInfo = [];
    room.players.forEach((player) => {
      playersInfo.push({
        userId: player.userId,
        playerName: player.playerName,
        wsReady: player.ws?.readyState === 1,
      });
    });
    roomsInfo.push({
      roomId,
      players: playersInfo,
      status: room.status,
    });
  });
  res.json({
    totalConnections: connections.size,
    rooms: roomsInfo,
  });
});

app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  const rawInitialScore = Number(req.body?.initialScore);
  const initialScore = Number.isFinite(rawInitialScore) && rawInitialScore >= 0
    ? Math.floor(rawInitialScore)
    : 25000;
  const rawWallTiles = Number(req.body?.wallTiles);
  // wallTiles: 配牌を除いた、ゲーム進行中にツモできる壁牌の枚数
  // 計算: 全牌136枚 - 配牌27枚 - 予約牌22枚 = 87枚
  const minWallTiles = 30;
  const maxWallTiles = 87; // Updated for usable wall tiles (excluding deal and reserved)
  const wallTiles = Number.isFinite(rawWallTiles)
    ? Math.min(maxWallTiles, Math.max(minWallTiles, Math.floor(rawWallTiles)))
    : maxWallTiles;
  const oneRoundMatch = req.body?.oneRoundMatch === true;
  
  // Extract and validate tsumo luck for both players
  const rawMyTsumoLuck = Number(req.body?.myTsumoLuck);
  const myTsumoLuck = Number.isFinite(rawMyTsumoLuck)
    ? Math.max(0, Math.min(3, Math.floor(rawMyTsumoLuck)))
    : 1;
  
  const rawOpponentTsumoLuck = Number(req.body?.opponentTsumoLuck);
  const opponentTsumoLuck = Number.isFinite(rawOpponentTsumoLuck)
    ? Math.max(0, Math.min(3, Math.floor(rawOpponentTsumoLuck)))
    : 1;
  
  // Extract and validate auto-action timer
  const rawAutoActionTimerSeconds = Number(req.body?.autoActionTimerSeconds);
  const autoActionTimerSeconds = Number.isFinite(rawAutoActionTimerSeconds)
    ? Math.max(3, Math.min(60, Math.floor(rawAutoActionTimerSeconds)))
    : 10;
  
  const room = new GameRoom(roomId, { initialScore, wallTiles, oneRoundMatch, autoActionTimerSeconds });
  // Store pending tsumo luck settings to be applied when players join
  room.setPendingTsumoLuckSettings(myTsumoLuck, opponentTsumoLuck);
  rooms.set(roomId, room);
  
  // 非アクティブタイマーを開始
  room.startInactivityTimer(createInactivityCallback(roomId));
  
  console.log(`Room created: ${roomId} (myTsumoLuck=${myTsumoLuck}, opponentTsumoLuck=${opponentTsumoLuck})`);
  res.json({ roomId });
});

// List active rooms
app.get('/api/rooms', (req, res) => {
  const roomsInfo = [];
  rooms.forEach((room, roomId) => {
    // Only show rooms that have at least one connected player
    // or are waiting for players
    const connectedCount = room.getConnectedPlayersCount();
    if (connectedCount > 0 || room.getStatus() === 'waiting') {
      roomsInfo.push({
        roomId,
        status: room.getStatus(),
        playersCount: connectedCount,
      });
    }
  });
  res.json({ rooms: roomsInfo });
});

// Get room info
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    roomId,
    players: room.getPlayers(),
    status: room.getStatus(),
  });
});

// Remove a player from room (used for cleanup before joining a different room)
app.delete('/api/rooms/:roomId/players/:userId', (req, res) => {
  const { roomId, userId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const player = room.players.get(userId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  console.log(`🗑️ Removing player ${player.playerName} (${userId}) from room ${roomId}`);
  
  // Clear any pending disconnect timer
  if (player.disconnectTimerId) {
    clearTimeout(player.disconnectTimerId);
    player.disconnectTimerId = null;
  }
  
  room.removePlayer(userId);
  
  // Notify other connected players
  if (!room.isEmpty()) {
    broadcastToRoom(roomId, {
      type: 'playerLeft',
      payload: {
        playerName: player.playerName,
        players: room.getPlayers(),
      },
    });
  } else {
    // Delete room if empty
    room.clearAutoReadyTimer();
    room.clearGameOverTimer();
    rooms.delete(roomId);
    console.log(`Room deleted: ${roomId}`);
  }
  
  res.json({ success: true, message: 'Player removed' });
});

// Add CPU player to room
app.post('/api/rooms/:roomId/add-cpu', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.isFull()) {
    return res.status(400).json({ error: 'Room is full' });
  }
  
  // Generate CPU player
  const cpuId = uuidv4();
  const cpuName = `CPU${room.players.size + 1}`;
  
  const addResult = room.addPlayer(cpuId, cpuName, null, true);
  
  if (!addResult.success) {
    return res.status(400).json({ error: addResult.message });
  }
  
  console.log(`🤖 CPU player added: ${cpuName} (${cpuId}) to room ${roomId}`);
  
  // アクティビティを記録してタイマーをリセット
  room.recordActivity(createInactivityCallback(roomId));
  
  // Notify all players about the new CPU
  broadcastToRoom(roomId, {
    type: 'playerJoined',
    payload: {
      playerName: cpuName,
      players: room.getPlayers(),
    },
  });
  
  // If room is full, start the game
  if (room.isFull()) {
    console.log(`🎮 Starting game in room: ${roomId}`);
    room.start();
    const gameStartedPayload = room.getGameState();
    broadcastToRoom(roomId, {
      type: 'gameStarted',
      payload: gameStartedPayload,
    });
    
    // ゲーム開始後、非アクティブタイマーを再開
    room.startInactivityTimer(createInactivityCallback(roomId));
    
    // Check if CPU should play first
    executeCPUTurnIfNeeded(room);
  }
  
  res.json({
    success: true,
    cpuId,
    cpuName,
    players: room.getPlayers(),
  });
});

// WebSocket Connection
wss.on('connection', (ws) => {
  console.log(`\n✓✓✓ New WebSocket client connected (Total connections: ${wss.clients.size})`);
  
  ws.on('message', (message) => {
    try {
      console.log(`📨 Received message: ${message}`);
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log(`\n✗✗✗ Client disconnected (Total connections: ${wss.clients.size})`);
    handleDisconnect(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Message handlers
function handleMessage(ws, data) {
  const { type, payload } = data;
  
  switch (type) {
    case 'join':
      handleJoin(ws, payload);
      break;
    case 'action':
      handleAction(ws, payload);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function handleJoin(ws, payload) {
  if (!payload || typeof payload !== 'object') {
    console.log('❌ Invalid payload for join message');
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    return;
  }
  
  const { roomId, playerName, userId: existingUserId, myTsumoLuck, opponentTsumoLuck } = payload;
  
  if (!roomId || !playerName) {
    ws.send(JSON.stringify({ type: 'error', message: 'roomId and playerName are required' }));
    return;
  }
  
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`❌ Room not found: ${roomId}`);
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }
  
  let userId = existingUserId;
  let isReconnecting = false;
  
  // Check if this is a reconnection attempt
  if (existingUserId) {
    console.log(`🔍 Reconnection attempt: userId=${existingUserId}, playerName=${playerName}`);
    console.log(`🔍 Room players:`, Array.from(room.players.keys()));
    console.log(`🔍 Room status: ${room.status}`);
    
    const existingPlayer = room.players.get(existingUserId);
    console.log(`🔍 Player found:`, existingPlayer ? `yes (name: ${existingPlayer.playerName})` : 'no');
    
    if (existingPlayer && existingPlayer.playerName === playerName) {
      // Reconnecting - update the WebSocket connection
      console.log(`🔄 Player reconnecting: ${playerName} (${existingUserId}) to room ${roomId}`);
      existingPlayer.ws = ws;
      if (existingPlayer.disconnectTimerId) {
        clearTimeout(existingPlayer.disconnectTimerId);
        existingPlayer.disconnectTimerId = null;
      }
      existingPlayer.disconnectedAt = null;
      isReconnecting = true;
    } else if (existingPlayer) {
      // UserId exists but playerName doesn't match
      console.log(`❌ UserId exists but playerName doesn't match: expected=${existingPlayer.playerName}, got=${playerName}`);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid reconnection attempt' }));
      return;
    } else {
      // UserId provided but player not found - treat as new connection
      console.log(`⚠️ UserId provided but player not found in room - treating as new player`);
      userId = null;
    }
  } else {
    console.log(`ℹ️ No userId provided - new player joining`);
  }
  
  if (!isReconnecting) {
    // New player joining - check connected players count, not total count
    // This allows new players to join if a previous player is disconnected
    if (room.getConnectedPlayersCount() >= 2) {
      console.log(`❌ Room is full (2 players connected): ${roomId}`);
      ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
      return;
    }
    
    userId = uuidv4();
    const addPlayerResult = room.addPlayer(userId, playerName, ws);
    
    if (!addPlayerResult.success) {
      console.log(`❌ Failed to add player: ${playerName} - ${addPlayerResult.message}`);
      ws.send(JSON.stringify({ type: 'error', message: addPlayerResult.message }));
      return;
    }
    
    // Determine which player this is (1st or 2nd) to assign correct tsumo luck
    const playerIndex = room.getPlayers().length; // 1 or 2
    let assignedTsumoLuck = 1; // default
    
    // Try to use pending settings first (set during room creation)
    const pendingSettings = room.getPendingTsumoLuckSettings?.();
    if (pendingSettings) {
      assignedTsumoLuck = playerIndex === 1 ? pendingSettings.my : pendingSettings.opponent;
      console.log(`✓ Using pending tsumo luck for player ${playerIndex}: level ${assignedTsumoLuck}`);
    } else if (playerIndex === 1) {
      // First player - use myTsumoLuck from join message if provided
      if (Number.isFinite(myTsumoLuck) && myTsumoLuck >= 0 && myTsumoLuck <= 3) {
        assignedTsumoLuck = Math.floor(myTsumoLuck);
      }
      console.log(`✓ Set tsumo luck for ${playerName} (player 1): level ${assignedTsumoLuck}`);
    } else {
      // Second player - use opponentTsumoLuck from join message if provided
      if (Number.isFinite(opponentTsumoLuck) && opponentTsumoLuck >= 0 && opponentTsumoLuck <= 3) {
        assignedTsumoLuck = Math.floor(opponentTsumoLuck);
      }
      console.log(`✓ Set tsumo luck for ${playerName} (player 2): level ${assignedTsumoLuck}`);
    }
    
    room.setTsumoLuck(userId, assignedTsumoLuck);
  }
  
  connections.set(ws, { userId, roomId, playerName });
  
  if (isReconnecting) {
    console.log(`✓ Player reconnected: ${playerName} (${userId}) to room ${roomId}`);
  } else {
    console.log(`✓ Player joined: ${playerName} (${userId}) to room ${roomId}`);
  }
  
  // Send join confirmation
  const joinedPayload = {
    userId,
    playerName,
    roomId,
    players: room.getPlayers(),
    gameState: room.getGameState(),
    isReconnecting,
  };
  
  console.log('Sending joined message:', JSON.stringify(joinedPayload, null, 2));
  try {
    ws.send(JSON.stringify({
      type: 'joined',
      payload: joinedPayload,
    }));
    console.log('✅ joined message sent successfully to', playerName);
  } catch (err) {
    console.error('❌ Error sending joined message:', err);
  }
  
  // Notify other players (only if not reconnecting, or notify about reconnection)
  if (isReconnecting) {
    console.log(`Broadcasting playerReconnected to room: ${roomId}`);
    broadcastToRoom(roomId, {
      type: 'playerReconnected',
      payload: {
        playerName,
        players: room.getPlayers(),
      },
    }, ws);
  } else {
    console.log(`Broadcasting playerJoined to room: ${roomId}`);
    broadcastToRoom(roomId, {
      type: 'playerJoined',
      payload: {
        playerName,
        players: room.getPlayers(),
      },
    }, ws);
  }
  
  // If room is full and waiting, start the game (avoid restarting on reconnect)
  if (!isReconnecting && room.isFull() && room.status === 'waiting') {
    console.log(`🎮 Starting game in room: ${roomId}`);
    room.start();
    const gameStartedPayload = room.getGameState();
    console.log('Game state:', JSON.stringify(gameStartedPayload, null, 2));
    broadcastToRoom(roomId, {
      type: 'gameStarted',
      payload: gameStartedPayload,
    });
    
    // ゲーム開始後、非アクティブタイマーを再開
    room.startInactivityTimer(createInactivityCallback(roomId));
  } else {
    // アクティビティを記録してタイマーをリセット（ゲームが開始されない場合）
    room.recordActivity(createInactivityCallback(roomId));
  }
}

function handleAction(ws, payload) {
  const connection = connections.get(ws);
  if (!connection) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not connected to a room' }));
    return;
  }
  
  const { roomId, userId } = connection;
  const room = rooms.get(roomId);
  
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }
  
  // アクティビティを記録してタイマーをリセット
  room.recordActivity(createInactivityCallback(roomId));
  
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n[🔵 ${requestId}] ============ INCOMING ACTION ============`);
  console.log(`[🔵 ${requestId}] [server.handleAction] Received action from userId=${userId}`);
  console.log(`[🔵 ${requestId}] Payload:`, JSON.stringify(payload));
  if (payload.type === 'discard') {
    console.log(`[🔵 ${requestId}] >>> Discard action with tileId='${payload.tileId}'`);
  }
  
  const result = room.handlePlayerAction(userId, payload);
  
  if (!result.success) {
    ws.send(JSON.stringify({ 
      type: 'actionResponse',
      payload: {
        success: false,
        message: result.message
      }
    }));
    return;
  }

  // Handle next round start
  if (result.startNextRound) {
    console.log(`\n🎮 Starting next round in room: ${roomId}`);
    room.start();
    broadcastToRoom(roomId, {
      type: 'gameStarted',
      payload: room.getGameState(),
    });
    
    // 次のラウンドが開始されたので非アクティブタイマーを再開
    room.startInactivityTimer(createInactivityCallback(roomId));
    
    // Check if CPU should play first
    executeCPUTurnIfNeeded(room);
    return;
  }

  // nextRoundアクションで準備状況が更新された場合、gameStateをbroadcast
  if (payload.type === 'nextRound' && result.success) {
    console.log(`📢 nextRound action processed: userId=${userId}, startNextRound=${result.startNextRound}`);
    
    // Both players are ready - start the next round
    if (result.startNextRound) {
      console.log(`\n🎮 Starting next round in room: ${roomId} (both players ready)`);
      
      // 全員準備完了したので自動タイマーをクリア
      room.clearAutoReadyTimer();
      
      room.start();
      broadcastToRoom(roomId, {
        type: 'gameStarted',
        payload: room.getGameState(),
      });
      
      // Check if CPU should play first
      executeCPUTurnIfNeeded(room);
      return;
    }
    
    // Otherwise, just broadcast the updated ready count
    // タイマーは継続（残りのプレイヤーが準備完了しない場合でも自動進行する）
    console.log(`📢 Broadcasting updated nextRound status to room: ${roomId}`);
    broadcastToRoom(roomId, {
      type: 'gameStateUpdate',
      payload: room.getGameState(),
    });
    return;
  }
  
  // For riichi actions, send confirmation to the player
  if (payload.type === 'riichi') {
    ws.send(JSON.stringify({ 
      type: 'actionResponse',
      payload: {
        success: true,
        riichi: true,
        message: result.message || 'リーチ宣言しました！'
      }
    }));
  }
  
  // Broadcast game state to all players
  broadcastToRoom(roomId, {
    type: 'gameStateUpdate',
    payload: room.getGameState(),
  });
  
  console.log(`[🔵 ${requestId}] After broadcast, checking: room.isFinished()=${room.isFinished()}, result.finished=${result.finished}`);
  
  // Check if CPU should play next
  executeCPUTurnIfNeeded(room);
  
  console.log(`[🔵 ${requestId}] After CPU check, room.isFinished()=${room.isFinished()}`);
  
  // Check if game is finished
  if (room.isFinished()) {
    console.log(`[🔵 ${requestId}] [CHECK] ✅ Game is finished! room.status=${room.status}`);
    
    if (result?.scoreResult?.valid === false) {
      // 役がない場合はゲーム状態を更新せず、エラーのみ返す
      // ただし、相手プレイヤーにはゲーム状態を送信して同期を保つ
      ws.send(JSON.stringify({
        type: 'actionResponse',
        payload: {
          success: false,
          message: result.scoreResult.error || '役がありません'
        }
      }));
      
      // 相手プレイヤーにゲーム状態を送信して同期を保つ
      broadcastToRoom(roomId, {
        type: 'gameStateUpdate',
        payload: room.getGameState(),
      }, ws);
      
      return;
    }

    try {
      // 最新のラウンド履歴から winType と scoreResult を取得
      const roundHistory = room.getRoundHistory();
      const latestRound = roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;
      const winType = result.message || latestRound?.winType || '';
      const scoreResult = result.scoreResult || latestRound?.scoreResult || null;
      const isDraw = result.isDraw === true || latestRound?.isDraw === true || false;

      const gameState = room.getGameState();
      const finishedPayload = {
        winner: room.getWinner(),
        scores: room.getScores(),
        scoreResult: scoreResult,
        winType: winType,
        isDraw: isDraw,
        currentRound: room.getCurrentRound(),
        roundWind: room.getRoundWindNumber(),
        roundNumber: room.getRoundNumber(),
        roundName: room.getRoundName(),
        dealerId: room.getDealerId(),
        seatWinds: room.buildSeatWinds(room.playerOrder),
        nextRoundReadyCount: room.getNextRoundReadyCount(),
        totalPlayers: room.players.size,
        tiles: gameState.tiles || {},  // フロント側で winner の hand データを取得するために必要
      };

      // ゲームオーバー（誰かの点数がマイナス）の場合
      if (result.gameOver) {
        finishedPayload.gameOver = true;
        finishedPayload.finalResults = result.finalResults;
      }

      console.log(`[🔵 ${requestId}] 📢 Broadcasting gameFinished to all players in room ${roomId}`);
      console.log(`[🔵 ${requestId}] finishedPayload:`, JSON.stringify(finishedPayload, null, 2));
      
      broadcastToRoom(roomId, {
        type: 'gameFinished',
        payload: finishedPayload,
      });
      
      console.log(`[🔵 ${requestId}] ✅ gameFinished broadcast complete`);
      console.log(`[🔵 ${requestId}] [CHECK] room.status=${room.status}, room.isFinished()=${room.isFinished()}`);
    } catch (err) {
      console.error(`[🔵 ${requestId}] ❌ Error while broadcasting gameFinished:`, err);
      console.error(`[🔵 ${requestId}] Error details:`, err.message, err.stack);
      // 繰り返し実行を防ぐため、スタックトレース出力のみで処理を続行
    }
    
    // ゲーム終了時は非アクティブタイマーをクリア（auto-ready or game-overタイマーで管理）
    room.clearInactivityTimer();
    
    // ゲーム終了（流局や勝ちなど）後の処理
    console.log(`[🔵 ${requestId}] [TIMER] gameOver=${result.gameOver}`);
    if (!result.gameOver) {
      console.log(`[🔵 ${requestId}] [TIMER] Setting up auto-ready timer...`);
      room.startAutoReadyTimer(() => {
        // タイマー満了時に全員が準備完了状態になっているので、
        // 自動的に次のラウンドを開始する
        console.log(`🎮 [AUTO] Auto-starting next round for room ${roomId} (timer expired)`);
        try {
          console.log(`🎮 [AUTO] Calling room.start()...`);
          room.start();
          console.log(`🎮 [AUTO] room.start() completed`);
          
          const gameStartPayload = room.getGameState();
          console.log(`🎮 [AUTO] Broadcasting gameStarted...`);
          broadcastToRoom(roomId, {
            type: 'gameStarted',
            payload: gameStartPayload,
          });
          console.log(`🎮 [AUTO] gameStarted broadcast complete`);
          
          // 次のラウンドが開始されたので非アクティブタイマーを再開
          room.startInactivityTimer(createInactivityCallback(roomId));
          
          // Check if CPU should play first
          console.log(`🎮 [AUTO] Checking if CPU should play...`);
          executeCPUTurnIfNeeded(room);
          console.log(`🎮 [AUTO] CPU turn check complete`);
        } catch (err) {
          console.error(`🎮 [ERROR] Exception in auto-ready callback:`, err);
        }
      });
      console.log(`[🔵 ${requestId}] [TIMER] Auto-ready timer setup completed`);
    } else {
      console.log(`[🔵 ${requestId}] [TIMER] Skipping auto-ready timer (gameOver=true)`);
      // ゲームオーバーの場合5分後にルームを削除
      console.log(`[🔵 ${requestId}] [TIMER] Starting game-over timer (5 minutes)...`);
      room.startGameOverTimer(() => {
        console.log(`🗑️ [AUTO] Deleting room ${roomId} after game over`);
        // 全プレイヤーにルーム削除を通知
        broadcastToRoom(roomId, {
          type: 'roomDeleted',
          payload: { message: 'Room has been deleted due to game over' },
        });
        // ルームを削除
        rooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted successfully`);
      });
      console.log(`[🔵 ${requestId}] [TIMER] Game-over timer setup completed`);
    }
  }
}

function handleDisconnect(ws) {
  const connection = connections.get(ws);
  if (!connection) return;
  
  const { roomId, userId, playerName } = connection;
  const room = rooms.get(roomId);
  
  if (room) {
    const player = room.markDisconnected(userId);
    connections.delete(ws);

    if (player && !player.isCPU) {
      const gracePeriodMs = 10 * 60 * 1000; // 10 minutes
      if (player.disconnectTimerId) {
        clearTimeout(player.disconnectTimerId);
      }
      player.disconnectTimerId = setTimeout(() => {
        const stillRoom = rooms.get(roomId);
        const stillPlayer = stillRoom?.players.get(userId);

        if (!stillRoom || !stillPlayer) {
          return;
        }

        if (stillPlayer.ws) {
          return;
        }

        console.log(`⏰ Reconnect grace expired for ${playerName} (${userId}) - removing from room ${roomId}`);
        stillRoom.removePlayer(userId);

        broadcastToRoom(roomId, {
          type: 'playerLeft',
          payload: {
            playerName,
            players: stillRoom.getPlayers(),
          },
        });

        if (stillRoom.isEmpty()) {
          stillRoom.clearAutoReadyTimer();
          stillRoom.clearGameOverTimer();
          rooms.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        }
      }, gracePeriodMs);
    }
  }
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`⚠️ Room ${roomId} not found for broadcast`);
    return;
  }
  
  // Access players directly from the room's internal players map to get WebSocket references
  console.log(`📡 Broadcasting ${message.type} to room ${roomId} with ${room.players.size} players`);
  let broadcastCount = 0;
  
  room.players.forEach((player) => {
    console.log(`  - Checking player: ${player.playerName} (${player.userId}) - isCPU: ${player.isCPU} - ws ready: ${player.ws?.readyState === 1}`);
    // CPUプレイヤーはスキップ
    if (player.isCPU) {
      console.log(`    🤖 Skipped (CPU player)`);
      return;
    }
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === 1) {
      console.log(`    ✅ Broadcasting to ${player.playerName}`);
      player.ws.send(JSON.stringify(message));
      broadcastCount++;
    } else {
      console.log(`    ❌ Skipped (ws: ${!!player.ws}, ready: ${player.ws?.readyState})`);
    }
  });
  
  console.log(`📡 Broadcast complete: sent to ${broadcastCount}/${room.players.size} players`);
}

// CPU自動プレイを実行（必要な場合）
function executeCPUTurnIfNeeded(room) {
  if (!room || room.status !== 'playing') {
    return;
  }
  
  if (room.isCurrentTurnCPU()) {
    console.log('🤖 Executing CPU turn...');
    room.executeCPUTurn(() => {
      // CPUのターンが終わったら、状態をブロードキャスト
      const roomId = room.roomId;
      broadcastToRoom(roomId, {
        type: 'gameStateUpdate',
        payload: room.getGameState(),
      });
      
      // ゲームが終了しているかチェック
      if (room.isFinished()) {
        console.log(`[🔵 CPU CALLBACK] ✅ gameFinished detected in CPU callback`);
        console.log(`[🔵 CPU CALLBACK] [CHECK] room.status=${room.status}, room.isFinished()=${room.isFinished()}`);
        
        let finishedPayload = null;
        try {
          // 最新のラウンド履歴から winType と scoreResult を取得
          const roundHistory = room.getRoundHistory();
          const latestRound = roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;
          const winType = room.lastResult?.message || latestRound?.winType || '';
          const scoreResult = room.lastResult?.scoreResult || latestRound?.scoreResult || null;
          
          console.log(`[🔵 CPU CALLBACK] [DEBUG] room.lastResult?.isDraw = ${room.lastResult?.isDraw}`);
          console.log(`[🔵 CPU CALLBACK] [DEBUG] latestRound?.isDraw = ${latestRound?.isDraw}`);
          const isDraw = room.lastResult?.isDraw === true || latestRound?.isDraw === true || false;
          console.log(`[🔵 CPU CALLBACK] [DEBUG] Final isDraw = ${isDraw}`);

          const gameState = room.getGameState();
          finishedPayload = {
            winner: room.getWinner(),
            scores: room.getScores(),
            scoreResult: scoreResult,
            winType: winType,
            isDraw: isDraw,
            currentRound: room.getCurrentRound(),
            roundWind: room.getRoundWindNumber(),
            roundNumber: room.getRoundNumber(),
            roundName: room.getRoundName(),
            dealerId: room.getDealerId(),
            seatWinds: room.buildSeatWinds(room.playerOrder),
            nextRoundReadyCount: room.getNextRoundReadyCount(),
            totalPlayers: room.players.size,
            tiles: gameState.tiles || {},  // フロント側で winner の hand データを取得するために必要
          };
          
          if (room.isGameOver()) {
            finishedPayload.gameOver = true;
            finishedPayload.finalResults = room.getRoundHistory();
          }
          
          console.log(`[🔵 CPU CALLBACK] 📢 Broadcasting gameFinished`);
          console.log(`[🔵 CPU CALLBACK] Payload:`, JSON.stringify(finishedPayload, null, 2));
          broadcastToRoom(roomId, {
            type: 'gameFinished',
            payload: finishedPayload,
          });
        } catch (err) {
          console.error(`[🔵 CPU CALLBACK] ❌ Error while broadcasting gameFinished:`, err);
          console.error(`[🔵 CPU CALLBACK] Error details:`, err.message, err.stack);
        }
        
        // ゲーム終了時は非アクティブタイマーをクリア（auto-ready or game-overタイマーで管理）
        room.clearInactivityTimer();
        
        const cpuCallbackGameOver = finishedPayload?.gameOver || false;
        console.log(`[🔵 CPU CALLBACK] [TIMER] gameOver=${cpuCallbackGameOver}`);
        
        // ゲームオーバーでない場合、10秒のタイマーを開始
        if (!cpuCallbackGameOver) {
          console.log(`[🔵 CPU CALLBACK] [TIMER] Setting up auto-ready timer...`);
          room.startAutoReadyTimer(() => {
            console.log(`🎮 [AUTO] Auto-starting next round for room ${roomId} (timer expired)`);
            try {
              console.log(`🎮 [AUTO] Calling room.start()...`);
              room.start();
              console.log(`🎮 [AUTO] room.start() completed`);
              
              const gameStartPayload = room.getGameState();
              console.log(`🎮 [AUTO] Broadcasting gameStarted...`);
              broadcastToRoom(roomId, {
                type: 'gameStarted',
                payload: gameStartPayload,
              });
              console.log(`🎮 [AUTO] gameStarted broadcast complete`);
              
              // 次のラウンドが開始されたので非アクティブタイマーを再開
              room.startInactivityTimer(createInactivityCallback(roomId));
              
              // Check if CPU should play first
              console.log(`🎮 [AUTO] Checking if CPU should play...`);
              executeCPUTurnIfNeeded(room);
              console.log(`🎮 [AUTO] CPU turn check complete`);
            } catch (err) {
              console.error(`🎮 [ERROR] Exception in auto-ready callback:`, err);
            }
          });
          console.log(`[🔵 CPU CALLBACK] [TIMER] Auto-ready timer setup completed`);
        } else {
          console.log(`[🔵 CPU CALLBACK] [TIMER] Skipping auto-ready timer (gameOver=true)`);
          // ゲームオーバーの場合5分後にルームを削除
          console.log(`[🔵 CPU CALLBACK] [TIMER] Starting game-over timer (5 minutes)...`);
          room.startGameOverTimer(() => {
            console.log(`🗑️ [AUTO] Deleting room ${roomId} after game over`);
            // 全プレイヤーにルーム削除を通知
            broadcastToRoom(roomId, {
              type: 'roomDeleted',
              payload: { message: 'Room has been deleted due to game over' },
            });
            // ルームを削除
            rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted successfully`);
          });
          console.log(`[🔵 CPU CALLBACK] [TIMER] Game-over timer setup completed`);
        }
      } else {
        // 次のターンがCPUなら再度実行
        setTimeout(() => executeCPUTurnIfNeeded(room), 100);
      }
    });
  }
}

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});