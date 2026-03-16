const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./logic/GameRoom');
const settings = require('./settings');
const { generateBattleId, saveBattleLog, readBattleLogs, listAvailableMonths, updateIPDatabase } = require('./BattleLogger');

// アクティブな対戦ログ情報を管理
// roomId -> { battleId, startTime, playerIPs: Map<userId, ip>, playerFingerprints: Map<userId, fingerprint> }
const activeBattleLogs = new Map();

// プレイヤー名をCSVファイルに記録する関数
// 同じ名前が再度使われた場合は日付のみ更新する
const PLAYER_LOG_FILE = path.join(process.cwd(), 'player-names.csv');

// 役満記録ファイル
const YAKUMAN_LOG_FILE = path.join(process.cwd(), 'yakuman-records.json');

// 役満記録を追記する関数
function logYakumanRecord(playerName, yakuNames, scoreType) {
  try {
    let records = [];
    if (fs.existsSync(YAKUMAN_LOG_FILE)) {
      const content = fs.readFileSync(YAKUMAN_LOG_FILE, 'utf8');
      records = JSON.parse(content);
    }
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    records.push({ date, playerName, yakuNames, scoreType });
    fs.writeFileSync(YAKUMAN_LOG_FILE, JSON.stringify(records, null, 2), 'utf8');
    console.log(`🏆 Yakuman logged: ${playerName} - ${yakuNames} (${date})`);
  } catch (err) {
    console.error('❌ Failed to log yakuman record:', err.message);
  }
}

function logPlayerName(playerName) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let records = [];
    let found = false;

    if (fs.existsSync(PLAYER_LOG_FILE)) {
      const content = fs.readFileSync(PLAYER_LOG_FILE, 'utf8');
      records = content
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const commaIndex = line.indexOf(',');
          return {
            date: line.slice(0, commaIndex).trim(),
            name: line.slice(commaIndex + 1).trim(),
          };
        });
    }

    records = records.map(record => {
      if (record.name === playerName) {
        found = true;
        return { date: today, name: playerName };
      }
      return record;
    });

    if (!found) {
      records.push({ date: today, name: playerName });
    }

    const content = records.map(r => `${r.date},${r.name}`).join('\n') + '\n';
    fs.writeFileSync(PLAYER_LOG_FILE, content, 'utf8');
    console.log(`📝 Player name logged: ${playerName} (${today})`);
  } catch (err) {
    console.error('❌ Failed to log player name:', err.message);
  }
}

const app = express();
const port = process.env.PORT || settings.server.port;

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
    activeBattleLogs.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted due to inactivity`);
  };
}

// REST API Routes

// Create a new room
app.get('/', (req, res) => {
  res.json({ message: 'Mahjong backend is running', port });
});

app.get('/playerNames', (req, res) => {
  try {
    if (!fs.existsSync(PLAYER_LOG_FILE)) {
      return res.json({ playerNames: [] });
    }
    const content = fs.readFileSync(PLAYER_LOG_FILE, 'utf8');
    const playerNames = content
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const commaIndex = line.indexOf(',');
        return {
          date: line.slice(0, commaIndex).trim(),
          name: line.slice(commaIndex + 1).trim(),
        };
      });
    res.json({ playerNames });
  } catch (err) {
    console.error('❌ Failed to read player names:', err.message);
    res.status(500).json({ error: 'Failed to read player names' });
  }
});

app.get('/yakumanRecords', (req, res) => {
  try {
    if (!fs.existsSync(YAKUMAN_LOG_FILE)) {
      return res.json({ records: [] });
    }
    const content = fs.readFileSync(YAKUMAN_LOG_FILE, 'utf8');
    const records = JSON.parse(content);
    // 新しい日付順にソート
    records.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    res.json({ records });
  } catch (err) {
    console.error('❌ Failed to read yakuman records:', err.message);
    res.status(500).json({ error: 'Failed to read yakuman records' });
  }
});

// ---- 対戦ログ API -------------------------------------------------------

// 利用可能な月のリストを返す
app.get('/api/battle-logs/months', (req, res) => {
  res.json({ months: listAvailableMonths() });
});

// 月別対戦ログ一覧（デフォルトは概要のみ、?full=true で全データ）
app.get('/api/battle-logs', (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }
  const logs = readBattleLogs(year, month);
  if (req.query.full === 'true') {
    return res.json({ year, month, count: logs.length, logs });
  }
  // デフォルトは概要（rounds・hand詳細を省略）
  const summary = logs.map(l => ({
    battleId: l.battleId,
    roomId: l.roomId,
    startTime: l.startTime,
    endTime: l.endTime,
    players: (l.players || []).map(p => ({ playerName: p.playerName, ip: p.ip, fingerprint: p.fingerprint || null })),
    rules: l.rules,
    finalScores: l.finalScores,
    roundCount: (l.rounds || []).length,
  }));
  res.json({ year, month, count: summary.length, logs: summary });
});

// 特定の対戦ログを battleId で取得
app.get('/api/battle-logs/:battleId', (req, res) => {
  const { battleId } = req.params;
  // battleId の先頭 6 桁から YYYYMM を取得
  const match = battleId.match(/^(\d{4})(\d{2})\d{2}-/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid battle ID format (expected YYYYMMDD-roomId-timestamp)' });
  }
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const logs = readBattleLogs(year, month);
  const log = logs.find(l => l.battleId === battleId);
  if (!log) {
    return res.status(404).json({ error: 'Battle log not found' });
  }
  res.json(log);
});

// ---- 対戦ログ API ここまで -----------------------------------------------

// IP データベース取得
app.get('/api/ip-database', (req, res) => {
  const filePath = path.join(process.cwd(), 'battle-logs', 'ip-database.json');
  try {
    if (!fs.existsSync(filePath)) {
      return res.json({});
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read IP database', detail: err.message });
  }
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
  // 部屋数の上限チェック（4桁: 1000〜9999 = 9000通り、その半数を上限とする）
  if (rooms.size >= 4500) {
    return res.status(503).json({ error: 'Server is full. Please try again later.' });
  }

  let roomId;
  let attempts = 0;
  const maxAttempts = 20;
  do {
    roomId = String(Math.floor(1000 + Math.random() * 9000));
    attempts++;
    if (attempts >= maxAttempts) {
      return res.status(503).json({ error: 'Could not generate a unique room ID. Please try again.' });
    }
  } while (rooms.has(roomId));

  const rawInitialScore = Number(req.body?.initialScore);
  const initialScore = Number.isFinite(rawInitialScore) && rawInitialScore >= 0
    ? Math.floor(rawInitialScore)
    : settings.game.defaultInitialScore;
  const rawWallTiles = Number(req.body?.wallTiles);
  // wallTiles: 配牌を除いた、ゲーム進行中にツモできる壁牌の枚数
  // 計算: 全牌136枚 - 配牌27枚 - 予約牌22枚 = 87枚
  const wallTiles = Number.isFinite(rawWallTiles)
    ? Math.min(settings.wall.maxTiles, Math.max(settings.wall.minTiles, Math.floor(rawWallTiles) + settings.game.dealTilesOffset + settings.game.reservedTiles))
    : settings.wall.maxTiles;

  // ゲームモード: 'oneRound' (1局勝負), 'easternsouthern' (東南戦), 'endless' (エンドレス)
  const supportedGameModes = ['oneRound', 'easternsouthern', 'endless'];
  const gameMode = supportedGameModes.includes(req.body?.gameMode)
    ? req.body.gameMode
    : 'oneRound';

  // 後方互換性: oldoneRoundMatch パラメーターがある場合を処理
  let finalGameMode = gameMode;
  if (req.body?.oneRoundMatch === true && !req.body?.gameMode) {
    finalGameMode = 'oneRound';
  }

  // Extract and validate tsumo luck for both players
  const maxTsumoLuckLevel = settings.tsumoLuck.maxLevel;
  const rawMyTsumoLuck = Number(req.body?.myTsumoLuck);
  const myTsumoLuck = Number.isFinite(rawMyTsumoLuck)
    ? Math.max(0, Math.min(maxTsumoLuckLevel, Math.floor(rawMyTsumoLuck)))
    : 1;

  const rawOpponentTsumoLuck = Number(req.body?.opponentTsumoLuck);
  const opponentTsumoLuck = Number.isFinite(rawOpponentTsumoLuck)
    ? Math.max(0, Math.min(maxTsumoLuckLevel, Math.floor(rawOpponentTsumoLuck)))
    : 1;

  // Extract and validate auto-action timer
  const rawAutoActionTimerSeconds = Number(req.body?.autoActionTimerSeconds);
  const autoActionTimerSeconds = Number.isFinite(rawAutoActionTimerSeconds)
    ? Math.max(settings.timers.autoActionTimer.minSeconds, Math.min(settings.timers.autoActionTimer.maxSeconds, Math.floor(rawAutoActionTimerSeconds)))
    : settings.timers.autoActionTimer.defaultSeconds;

  // 赤ドラの使用
  const useRedDora = req.body?.useRedDora === true;

  // ノーテン罰符
  const notenPenalty = req.body?.notenPenalty === true;

  // リーチ供託点必須
  const riichiDepositRequired = req.body?.riichiDepositRequired !== false;

  // 青天井モード
  const aotenjou = req.body?.aotenjou === true;

  // 切り上げ満貫（4翻30符・3翻60符を満貫扱い）デフォルト有効
  const kiriagemangan = req.body?.kiriagemangan !== false;

  // ロン倍率: 1 (デフォルト), 1.5, 2
  const supportedRonMultipliers = [1, 1.5, 2];
  const rawRonMultiplier = Number(req.body?.ronMultiplier);
  const ronMultiplier = supportedRonMultipliers.includes(rawRonMultiplier) ? rawRonMultiplier : 1;

  // 親の開始設定: 'random' | 'self' | 'opponent'
  const supportedDealerSelections = ['random', 'self', 'opponent'];
  const dealerSelection = supportedDealerSelections.includes(req.body?.dealerSelection)
    ? req.body.dealerSelection
    : 'random';

  // 透明手牌ルール: 同種3枚保有で透けて見える
  const transparentHand = req.body?.transparentHand === true;

  const room = new GameRoom(roomId, { initialScore, wallTiles, gameMode: finalGameMode, autoActionTimerSeconds, useRedDora, notenPenalty, riichiDepositRequired, aotenjou, kiriagemangan, ronMultiplier, dealerSelection, transparentHand });
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
    // Only show rooms that have at least one connected player,
    // are waiting for players, or have finished a round/game
    const connectedCount = room.getConnectedPlayersCount();
    const status = room.getStatus();
    if (connectedCount > 0 || status === 'waiting' || status === 'finished' || status === 'gameOver') {
      const players = room.getPlayers();
      roomsInfo.push({
        roomId,
        status,
        playersCount: connectedCount,
        playerNames: players.map(p => p.playerName),
        createdAt: room.createdAt,
        spectatorCount: room.getSpectatorCount(),
      });
    }
  });
  // 新しいルームが上に来るようにソート
  roomsInfo.sort((a, b) => b.createdAt - a.createdAt);
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
    activeBattleLogs.delete(roomId);
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

// 試合履歴を取得（最大100件）
app.get('/api/rooms/:roomId/match-history', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ matchHistory: room.getMatchHistory() });
});

// WebSocket Connection
wss.on('connection', (ws, req) => {
  console.log(`\n✓✓✓ New WebSocket client connected (Total connections: ${wss.clients.size})`);

  ws.on('message', async (message) => {
    try {
      console.log(`📨 Received message: ${message}`);
      const data = JSON.parse(message);
      await handleMessage(ws, data, req);
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
async function handleMessage(ws, data, req = null) {
  const { type, payload } = data;

  switch (type) {
    case 'join':
      handleJoin(ws, payload, req);
      break;
    case 'action':
      await handleAction(ws, payload);
      break;
    case 'rematch':
      handleRematch(ws);
      break;
    case 'startRematch':
      handleStartRematch(ws);
      break;
    case 'deleteRoom':
      handleDeleteRoom(ws);
      break;
    case 'shareIcon':
      handleShareIcon(ws, payload);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function handleShareIcon(ws, payload) {
  const conn = connections.get(ws);
  if (!conn) return;
  const { userId, roomId, isSpectator } = conn;
  if (isSpectator) return; // 観戦者はアイコンをプレイヤーとして共有しない
  const room = rooms.get(roomId);
  if (!room) return;
  const { iconData } = payload || {};
  if (!iconData || typeof iconData !== 'string') return;
  room.setPlayerIcon(userId, iconData);

  // Forward to the opponent (non-broadcast)
  room.players.forEach((player, pid) => {
    if (pid !== userId && player.ws && player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ type: 'opponentIcon', payload: { iconData } }));
    }
  });

  // Also notify spectators of the icon update
  room.spectators.forEach((spectator) => {
    if (spectator.ws && spectator.ws.readyState === 1) {
      // Find which player this is (for spectators to update the correct icon slot)
      const player = room.players.get(userId);
      const playerIndex = room.getPlayers().findIndex(p => p.userId === userId);
      spectator.ws.send(JSON.stringify({
        type: 'playerIconUpdated',
        payload: { userId, playerIndex, iconData }
      }));
    }
  });
}

function handleJoin(ws, payload, req = null) {
  if (!payload || typeof payload !== 'object') {
    console.log('❌ Invalid payload for join message');
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    return;
  }

  const { roomId, playerName, userId: existingUserId, myTsumoLuck, opponentTsumoLuck, spectator: wantSpectator, fingerprint } = payload;

  if (!roomId || !playerName) {
    ws.send(JSON.stringify({ type: 'error', message: 'roomId and playerName are required' }));
    return;
  }

  // プレイヤー名をCSVログに記録
  logPlayerName(playerName);

  const room = rooms.get(roomId);
  if (!room) {
    console.log(`❌ Room not found: ${roomId}`);
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  // ---- 見学者として参加 -------------------------------------------------------
  if (wantSpectator) {
    return handleSpectatorJoin(ws, room, roomId, playerName, existingUserId);
  }
  // ---- ここまで ---------------------------------------------------------------

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
      // UserId provided but player not found in this room - new connection, reuse provided userId
      console.log(`ℹ️ UserId provided but not in room - new player joining with existing userId`);
      // Keep userId as-is (do not reset to null) so the persistent client ID is preserved
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

    if (!userId) {
      userId = uuidv4();
    }
    const addPlayerResult = room.addPlayer(userId, playerName, ws);

    if (!addPlayerResult.success) {
      console.log(`❌ Failed to add player: ${playerName} - ${addPlayerResult.message}`);
      ws.send(JSON.stringify({ type: 'error', message: addPlayerResult.message }));
      return;
    }

    // プレイヤーのIPアドレスおよびデバイスフィンガープリントを対戦ログ用に記録
    const playerIP = req?.headers['x-forwarded-for']?.split(',').shift().trim() || req?.socket?.remoteAddress || 'unknown';
    if (!activeBattleLogs.has(roomId)) {
      activeBattleLogs.set(roomId, { battleId: null, startTime: null, playerIPs: new Map(), playerFingerprints: new Map() });
    }
    const battleLogEntry = activeBattleLogs.get(roomId);
    battleLogEntry.playerIPs.set(userId, playerIP);
    if (fingerprint && typeof fingerprint === 'string' && /^[0-9a-f]{32}$/i.test(fingerprint)) {
      battleLogEntry.playerFingerprints?.set(userId, fingerprint);
      console.log(`🔏 Fingerprint recorded for ${playerName}: ${fingerprint}`);
    }

    // IPデータベース（全ログイン者）を更新
    updateIPDatabase(playerIP, playerName, fingerprint || null);

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
    hostId: room.getHostId(),
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

  // If the opponent already shared their icon, forward it to the joining player
  const opponentIconData = room.getOpponentIcon(userId);
  if (opponentIconData) {
    try {
      ws.send(JSON.stringify({ type: 'opponentIcon', payload: { iconData: opponentIconData } }));
    } catch (err) {
      console.error('❌ Error sending opponentIcon:', err);
    }
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

    // CPU対戦でない場合、対戦ログを初期化
    const hasCPUForLog = Array.from(room.players.values()).some(p => p.isCPU);
    if (!hasCPUForLog) {
      const battleId = generateBattleId(roomId);
      const startTime = new Date().toISOString();
      const existing = activeBattleLogs.get(roomId) || { playerIPs: new Map(), playerFingerprints: new Map() };
      activeBattleLogs.set(roomId, { battleId, startTime, playerIPs: existing.playerIPs, playerFingerprints: existing.playerFingerprints });
      console.log(`📊 Battle log initialized: ${battleId}`);
    }
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

// 見学者用参加処理
function handleSpectatorJoin(ws, room, roomId, spectatorName, existingUserId) {
  let userId = existingUserId;
  let isReconnecting = false;

  if (existingUserId && room.spectators.has(existingUserId)) {
    // 再接続
    const result = room.addSpectator(existingUserId, spectatorName, ws);
    isReconnecting = result.isReconnecting && result.spectator?.spectatorName === spectatorName;
    if (isReconnecting) {
      userId = existingUserId;
      console.log(`🔄 Spectator reconnecting: ${spectatorName} (${existingUserId}) to room ${roomId}`);
    }
  }

  if (!isReconnecting) {
    if (!userId) {
      userId = uuidv4();
    }
    room.addSpectator(userId, spectatorName, ws);
    console.log(`👀 Spectator joined: ${spectatorName} (${userId}) to room ${roomId}`);
  }

  connections.set(ws, { userId, roomId, playerName: spectatorName, isSpectator: true });

  // 現在のゲーム状態（全牌公開）を送信
  const gameState = room.getGameState();
  // 局間（playing以外）に参加した観戦者には前局の結果も送信する
  const lastFinishedPayload = room.status !== 'playing' ? (room.lastFinishedPayload || null) : null;

  // 両プレイヤーのアイコンを取得して観戦者に送信
  const playerIconsData = {};
  const players = room.getPlayers();
  players.forEach((player, index) => {
    const icon = room.getPlayerIcon(player.userId);
    if (icon) {
      playerIconsData[player.userId] = icon;
    }
  });

  const joinedPayload = {
    userId,
    spectatorName,
    roomId,
    players: room.getPlayers(),
    spectators: room.getSpectators(),
    gameState: { ...gameState, isSpectatorView: true },
    isSpectator: true,
    isReconnecting,
    spectatorShowHandsByDefault: settings.spectator.showHandsByDefault,
    lastFinishedPayload,
    playerIcons: playerIconsData,
  };

  try {
    ws.send(JSON.stringify({ type: 'spectatorJoined', payload: joinedPayload }));
    console.log(`✅ spectatorJoined sent to ${spectatorName}`);
  } catch (err) {
    console.error('❌ Error sending spectatorJoined:', err);
  }

  // 他の全員に見学者参加を通知
  broadcastToRoom(roomId, {
    type: 'spectatorJoinedNotify',
    payload: { spectatorName, spectators: room.getSpectators(), spectatorCount: room.getSpectatorCount() },
  }, ws);

  // アクティビティを記録
  room.recordActivity(createInactivityCallback(roomId));
}

async function handleAction(ws, payload) {
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

  let result = room.handlePlayerAction(userId, payload);

  console.log(`[🔵 ${requestId}] [CHECK] handlePlayerAction returned:`, {
    success: result.success,
    finished: result.finished,
    gameOver: result.gameOver,
    message: result.message,
  });

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

  // 相手がリーチ中のため、相手のツモ切りが保留中の場合
  // 現在の打牌状態を先にブロードキャストし、一定時間後に相手のツモ切りを処理する
  if (result.riichiAutoDiscardPending) {
    const pendingUserId = room.gameLogic.getCurrentTurn();
    const pendingPlayer = room.players.get(pendingUserId);

    // まず自分の打牌（相手のツモ前）の状態をブロードキャスト
    broadcastToRoom(roomId, {
      type: 'gameStateUpdate',
      payload: room.getGameState(),
    });

    if (pendingPlayer?.isCPU || pendingPlayer?.autoPlay) {
      // CPU の場合は通常のターン処理に委ねる（CPU ターンの遅延が適用される）
      console.log(`[🔵 ${requestId}] 🔴 Riichi auto-discard pending for CPU ${pendingPlayer.playerName} - delegating to executeCPUTurnIfNeeded`);
      executeCPUTurnIfNeeded(room);
    } else {
      // 人間プレイヤーがリーチ中: 0.5 秒後にツモ切りを処理
      console.log(`[🔵 ${requestId}] 🔴 Riichi auto-discard pending for human ${pendingPlayer?.playerName} - delaying ${settings.cpuDelays.riichiAutoDiscardDelayMs}ms`);
      setTimeout(() => {
        console.log(`[🔵 ${requestId}] 🔴 Executing delayed riichi auto-discard for ${pendingUserId}`);
        const autoDiscardResult = room.handlePlayerAction(pendingUserId, { type: 'discard' });
        console.log(`[🔵 ${requestId}] 🔴 Riichi auto-discard result:`, { success: autoDiscardResult?.success, finished: autoDiscardResult?.finished });

        broadcastToRoom(roomId, {
          type: 'gameStateUpdate',
          payload: room.getGameState(),
        });

        if (room.isFinished()) {
          handleAutoPlayGameFinished(room, 'RIICHI_AUTO_DISCARD');
        } else {
          executeCPUTurnIfNeeded(room);
        }
      }, settings.cpuDelays.riichiAutoDiscardDelayMs);
    }
    return;
  }

  // Broadcast game state to all players
  broadcastToRoom(roomId, {
    type: 'gameStateUpdate',
    payload: room.getGameState(),
  });

  console.log(`[🔵 ${requestId}] After broadcast, checking: room.isFinished()=${room.isFinished()}, result.finished=${result.finished}`);

  // 両方リーチ時の自動進行処理
  if (result.bothRiichiAutoPlay && !room.isFinished()) {
    console.log(`[🔵 ${requestId}] 🔴 Both players in riichi - starting auto-play loop`);
    const autoPlayResult = await room.executeBothRiichiAutoPlay(() => {
      broadcastToRoom(roomId, {
        type: 'gameStateUpdate',
        payload: room.getGameState(),
      });
    });
    if (autoPlayResult) {
      result = autoPlayResult;
      console.log(`[🔵 ${requestId}] 🔴 Auto-play loop completed: finished=${result.finished}, bothRiichiAutoPlay=${result.bothRiichiAutoPlay}`);
    }
  }

  // Check if CPU should play next
  executeCPUTurnIfNeeded(room);

  console.log(`[🔵 ${requestId}] After CPU check, room.isFinished()=${room.isFinished()}, room.status=${room.status}`);

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
        tenpaiStatus: isDraw ? (latestRound?.tenpai || null) : null,  // 流局時の聴牌状態
        notenPenalty: isDraw ? (latestRound?.notenPenalty || result.notenPenalty || null) : null,  // ノーテン罰符情報
      };

      // ゲームオーバー（誰かの点数がマイナス）の場合
      if (result.gameOver) {
        finishedPayload.gameOver = true;
        finishedPayload.finalResults = result.finalResults;
        const finalResultsLength = result.finalResults?.length ?? 'null/undefined';
        console.log(`[🔵 ${requestId}] 🏁 Game Over detected! finalResults: ${finalResultsLength} rounds`);
        if (result.finalResults && result.finalResults.length > 0) {
          const summary = result.finalResults.map(r => `${r.roundName}(winner:${r.winner})`).join(', ');
          console.log(`[🔵 ${requestId}] 🏁 finalResults: ${summary}`);
        }
      }

      console.log(`[🔵 ${requestId}] 📢 Broadcasting gameFinished to all players in room ${roomId}`);
      console.log(`[🔵 ${requestId}] 📢 gameFinished payload:`, {
        gameOver: finishedPayload.gameOver,
        finalResults_length: finishedPayload.finalResults?.length ?? 'undefined',
        winner: finishedPayload.winner,
        isDraw: finishedPayload.isDraw,
        roundName: finishedPayload.roundName,
      });

      broadcastToRoom(roomId, {
        type: 'gameFinished',
        payload: finishedPayload,
      });

      // 観戦者が局間に参加したときに前局の結果を表示できるよう保存
      room.lastFinishedPayload = finishedPayload;

      // 役満の場合は記録を保存（CPU対戦は除く）
      const hasCPUPlayer = Array.from(room.players.values()).some(p => p.isCPU);
      if (!hasCPUPlayer && scoreResult && scoreResult.scoreType && scoreResult.scoreType.includes('役満')) {
        const winnerName = finishedPayload.winner
          ? (room.players.get(finishedPayload.winner)?.playerName || finishedPayload.winner)
          : null;
        if (winnerName) {
          const yakumanYaku = scoreResult.yaku
            ? scoreResult.yaku.filter(y => y.isYakuman).map(y => y.name)
            : [];
          const yakuNames = yakumanYaku.length > 0 ? yakumanYaku.join('・') : '数え役満';
          logYakumanRecord(winnerName, yakuNames, scoreResult.scoreType);
        }
      }

      // gameOver時に対戦ログを保存（CPU対戦は除く）
      if (!hasCPUPlayer && result.gameOver) {
        const battleLogInfo = activeBattleLogs.get(roomId);
        if (battleLogInfo?.battleId) {
          saveBattleLog(room, battleLogInfo.battleId, battleLogInfo.startTime, battleLogInfo.playerIPs, battleLogInfo.playerFingerprints || new Map());
          activeBattleLogs.delete(roomId);
        }
      }

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
        activeBattleLogs.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted successfully`);
      });
      console.log(`[🔵 ${requestId}] [TIMER] Game-over timer setup completed`);
    }
  }
}

function handleDisconnect(ws) {
  const connection = connections.get(ws);
  if (!connection) return;

  const { roomId, userId, playerName, isSpectator } = connection;
  const room = rooms.get(roomId);

  if (room) {
    connections.delete(ws);

    // 見学者が切断した場合はすぐに削除
    if (isSpectator) {
      room.removeSpectator(userId);
      console.log(`👀❌ Spectator disconnected: ${playerName} (${userId}) from room ${roomId}`);
      broadcastToRoom(roomId, {
        type: 'spectatorLeft',
        payload: { spectatorName: playerName, spectators: room.getSpectators(), spectatorCount: room.getSpectatorCount() },
      });
      return;
    }

    const player = room.markDisconnected(userId);

    if (player && !player.isCPU) {
      // プレイヤーが切断されたらタイマーを切断時点からリセット。
      // こうすることで「非アクティブ削除タイマー」が切断猶予期間より先に
      // 発火してルームを消してしまう競合状態を防ぐ。
      // gameOver 状態では gameOverTimer が後始末を担うのでリセットしない。
      if (room.status !== 'gameOver') {
        room.startInactivityTimer(createInactivityCallback(roomId));
      }

      const gracePeriodMs = settings.timers.disconnectGracePeriodMs;
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
          activeBattleLogs.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        }
      }, gracePeriodMs);
    }
  }
}

// Handle rematch ready - marks the player as ready for rematch
function handleRematch(ws) {
  const connection = connections.get(ws);
  if (!connection) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not connected to a room' }));
    return;
  }

  const { roomId, userId, playerName } = connection;
  const room = rooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  if (room.status !== 'gameOver') {
    ws.send(JSON.stringify({ type: 'error', message: 'Game is not over yet' }));
    return;
  }

  // このプレイヤーを再戦準備完了としてマーク
  room.rematchReady.add(userId);
  console.log(`🔄 Rematch ready: ${playerName} in room ${roomId} (${room.rematchReady.size}/${room.players.size})`);

  // CPU対戦時は人間プレイヤーが押したら即座に全CPUも準備完了にする
  for (const [playerId, player] of room.players) {
    if (player.isCPU && !room.rematchReady.has(playerId)) {
      room.rematchReady.add(playerId);
    }
  }

  // 全員に再戦準備状況を通知
  broadcastToRoom(roomId, {
    type: 'rematchReadyUpdate',
    payload: {
      readyUserIds: Array.from(room.rematchReady),
      readyCount: room.rematchReady.size,
      totalPlayers: room.players.size,
    },
  });
}

// Handle start rematch - host-only action to begin the rematch
function handleStartRematch(ws) {
  const connection = connections.get(ws);
  if (!connection) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not connected to a room' }));
    return;
  }

  const { roomId, userId, playerName } = connection;
  const room = rooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  if (room.status !== 'gameOver') {
    ws.send(JSON.stringify({ type: 'error', message: 'Game is not over yet' }));
    return;
  }

  // ホストのみ使用可能
  if (room.getHostId() !== userId) {
    ws.send(JSON.stringify({ type: 'error', message: '部屋の作成者のみ再戦を開始できます' }));
    return;
  }

  // CPUプレイヤーは自動的に準備完了にする
  for (const [playerId, player] of room.players) {
    if (player.isCPU && !room.rematchReady.has(playerId)) {
      room.rematchReady.add(playerId);
    }
  }

  // 全プレイヤーが準備完了しているか確認
  if (room.rematchReady.size < room.players.size) {
    ws.send(JSON.stringify({ type: 'error', message: '全員が再戦準備OKを押していません' }));
    return;
  }

  room.resetForRematch();
  room.start();

  // CPU対戦でない場合、再戦用の新しい対戦ログを初期化
  const hasCPUForRematch = Array.from(room.players.values()).some(p => p.isCPU);
  if (!hasCPUForRematch) {
    const existingLog = activeBattleLogs.get(roomId);
    const rematchBattleId = generateBattleId(roomId);
    activeBattleLogs.set(roomId, {
      battleId: rematchBattleId,
      startTime: new Date().toISOString(),
      playerIPs: existingLog?.playerIPs || new Map(),
    });
    console.log(`📊 Rematch battle log initialized: ${rematchBattleId}`);
  }

  console.log(`🔄 Rematch started by host ${playerName} in room ${roomId}`);

  broadcastToRoom(roomId, {
    type: 'rematchStart',
    payload: room.getGameState(),
  });

  // 非アクティブタイマーを再開
  room.startInactivityTimer(createInactivityCallback(roomId));

  // CPUが最初に動く必要があるか確認
  executeCPUTurnIfNeeded(room);
}

// Handle delete room - host-only action to remove the room
function handleDeleteRoom(ws) {
  const connection = connections.get(ws);
  if (!connection) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not connected to a room' }));
    return;
  }

  const { roomId, userId, playerName } = connection;
  const room = rooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  // ホストのみ使用可能
  if (room.getHostId() !== userId) {
    ws.send(JSON.stringify({ type: 'error', message: '部屋の作成者のみ部屋を削除できます' }));
    return;
  }

  console.log(`🗑️ Room ${roomId} manually deleted by host ${playerName}`);

  broadcastToRoom(roomId, {
    type: 'roomDeleted',
    payload: { message: '部屋が履唱者によって削除されました' },
  });

  room.clearAutoReadyTimer();
  room.clearGameOverTimer();
  room.clearInactivityTimer();
  rooms.delete(roomId);
  activeBattleLogs.delete(roomId);
  console.log(`🗑️ Room ${roomId} deleted successfully`);
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`⚠️ Room ${roomId} not found for broadcast`);
    return;
  }

  // Access players directly from the room's internal players map to get WebSocket references
  console.log(`📡 Broadcasting ${message.type} to room ${roomId} with ${room.players.size} players, ${room.spectators.size} spectators`);
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

  // 見学者にも送信
  room.spectators.forEach((spectator) => {
    if (spectator.ws && spectator.ws !== excludeWs && spectator.ws.readyState === 1) {
      // 見学者向けにもゲーム状態を送信（手牌は全員分公開）
      const spectatorMessage = buildSpectatorMessage(message);
      spectator.ws.send(JSON.stringify(spectatorMessage));
      broadcastCount++;
    }
  });

  console.log(`📡 Broadcast complete: sent to ${broadcastCount}/${room.players.size + room.spectators.size} players+spectators`);
}

// 見学者向けメッセージ生成（gameState 内の tiles を全公開フラグ付きで送信）
function buildSpectatorMessage(message) {
  if (
    (message.type === 'gameStateUpdate' || message.type === 'gameStarted' || message.type === 'rematchStart') &&
    message.payload
  ) {
    return {
      ...message,
      payload: { ...message.payload, isSpectatorView: true },
    };
  }
  if (message.type === 'gameFinished' && message.payload) {
    return {
      ...message,
      payload: { ...message.payload, isSpectatorView: true },
    };
  }
  return message;
}

// CPU/自動プレイ後のゲーム終了処理を共通化
function handleAutoPlayGameFinished(room, logPrefix = 'AUTO') {
  const roomId = room.roomId;
  console.log(`[🔵 ${logPrefix}] ✅ gameFinished detected`);
  console.log(`[🔵 ${logPrefix}] [CHECK] room.status=${room.status}, room.isFinished()=${room.isFinished()}`);

  let finishedPayload = null;
  try {
    // 最新のラウンド履歴から winType と scoreResult を取得
    const roundHistory = room.getRoundHistory();
    const latestRound = roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;
    const winType = room.lastResult?.message || latestRound?.winType || '';
    const scoreResult = room.lastResult?.scoreResult || latestRound?.scoreResult || null;

    console.log(`[🔵 ${logPrefix}] [DEBUG] room.lastResult?.isDraw = ${room.lastResult?.isDraw}`);
    console.log(`[🔵 ${logPrefix}] [DEBUG] latestRound?.isDraw = ${latestRound?.isDraw}`);
    const isDraw = room.lastResult?.isDraw === true || latestRound?.isDraw === true || false;
    console.log(`[🔵 ${logPrefix}] [DEBUG] Final isDraw = ${isDraw}`);

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
      tiles: gameState.tiles || {},
      tenpaiStatus: isDraw ? (latestRound?.tenpai || null) : null,
      notenPenalty: isDraw ? (latestRound?.notenPenalty || room.lastResult?.notenPenalty || null) : null,
    };

    if (room.isGameOver()) {
      finishedPayload.gameOver = true;
      finishedPayload.finalResults = room.getRoundHistory();
    }

    console.log(`[🔵 ${logPrefix}] 📢 Broadcasting gameFinished`);
    console.log(`[🔵 ${logPrefix}] Payload:`, JSON.stringify(finishedPayload, null, 2));
    broadcastToRoom(roomId, {
      type: 'gameFinished',
      payload: finishedPayload,
    });

    // 観戦者が局間に参加したときに前局の結果を表示できるよう保存
    room.lastFinishedPayload = finishedPayload;

    // 役満の場合は記録を保存（CPU対戦は除く）
    const hasCPUPlayer = Array.from(room.players.values()).some(p => p.isCPU);
    if (!hasCPUPlayer && scoreResult && scoreResult.scoreType && scoreResult.scoreType.includes('役満')) {
      const winnerPlayerId = finishedPayload.winner;
      const winnerPlayerName = winnerPlayerId
        ? (room.players.get(winnerPlayerId)?.playerName || winnerPlayerId)
        : null;
      if (winnerPlayerName) {
        const yakumanYaku = scoreResult.yaku
          ? scoreResult.yaku.filter(y => y.isYakuman).map(y => y.name)
          : [];
        const yakuNames = yakumanYaku.length > 0 ? yakumanYaku.join('・') : '数え役満';
        logYakumanRecord(winnerPlayerName, yakuNames, scoreResult.scoreType);
      }
    }

    // gameOver時に対戦ログを保存（CPU対戦は除く）
    if (!hasCPUPlayer && finishedPayload?.gameOver) {
      const battleLogInfo = activeBattleLogs.get(roomId);
      if (battleLogInfo?.battleId) {
        saveBattleLog(room, battleLogInfo.battleId, battleLogInfo.startTime, battleLogInfo.playerIPs, battleLogInfo.playerFingerprints || new Map());
        activeBattleLogs.delete(roomId);
      }
    }
  } catch (err) {
    console.error(`[🔵 ${logPrefix}] ❌ Error while broadcasting gameFinished:`, err);
    console.error(`[🔵 ${logPrefix}] Error details:`, err.message, err.stack);
  }

  // ゲーム終了時は非アクティブタイマーをクリア
  room.clearInactivityTimer();

  const isGameOver = finishedPayload?.gameOver || false;
  console.log(`[🔵 ${logPrefix}] [TIMER] gameOver=${isGameOver}`);

  if (!isGameOver) {
    console.log(`[🔵 ${logPrefix}] [TIMER] Setting up auto-ready timer...`);
    room.startAutoReadyTimer(() => {
      console.log(`🎮 [AUTO] Auto-starting next round for room ${roomId} (timer expired)`);
      try {
        room.start();
        broadcastToRoom(roomId, {
          type: 'gameStarted',
          payload: room.getGameState(),
        });
        room.startInactivityTimer(createInactivityCallback(roomId));
        executeCPUTurnIfNeeded(room);
      } catch (err) {
        console.error(`🎮 [ERROR] Exception in auto-ready callback:`, err);
      }
    });
  } else {
    console.log(`[🔵 ${logPrefix}] [TIMER] Starting game-over timer (5 minutes)...`);
    room.startGameOverTimer(() => {
      console.log(`🗑️ [AUTO] Deleting room ${roomId} after game over`);
      broadcastToRoom(roomId, {
        type: 'roomDeleted',
        payload: { message: 'Room has been deleted due to game over' },
      });
      rooms.delete(roomId);
      activeBattleLogs.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted successfully`);
    });
  }
}

// CPU自動プレイを実行（必要な場合）
function executeCPUTurnIfNeeded(room) {
  if (!room || room.status !== 'playing') {
    return;
  }

  // 両方リーチの場合は自動進行ループを開始（CPUターンかどうかに関わらず）
  if (room.gameLogic && room.gameLogic.areBothPlayersInRiichi() &&
      !room.gameLogic.getRonPossibleFor() && !room.gameLogic.getPendingPungFor()) {
    // ツモ和了可能な場合はauto-playループに入らない（通常のターン処理で対応）
    const ct = room.gameLogic.getCurrentTurn();
    const hasTsumoOpportunity = room.gameLogic.getDrawnTileIndex(ct) >= 0 && room.gameLogic.isWinningHand(ct);
    if (hasTsumoOpportunity) {
      const cp = room.players?.get(ct);
      if (cp?.isCPU || cp?.autoPlay) {
        // CPU: 通常のCPUターン処理へフォールスルー（ツモ和了を実行する）
        console.log('🔴 Both riichi but CPU has tsumo opportunity - falling through to normal CPU turn');
      } else {
        // 人間プレイヤーのツモ和了待ち
        console.log('🔴 Both riichi but human has tsumo opportunity - waiting for player decision');
        return;
      }
    } else {
    const roomId = room.roomId;
    console.log('🔴 Both players in riichi detected in executeCPUTurnIfNeeded - starting auto-play loop');
    room.executeBothRiichiAutoPlay(() => {
      broadcastToRoom(roomId, {
        type: 'gameStateUpdate',
        payload: room.getGameState(),
      });
    }).then(autoPlayResult => {
      // ループ終了後の最終状態をブロードキャスト
      broadcastToRoom(roomId, {
        type: 'gameStateUpdate',
        payload: room.getGameState(),
      });

      if (room.isFinished()) {
        room.lastResult = autoPlayResult;
        handleAutoPlayGameFinished(room, 'BOTH_RIICHI');
      } else {
        // ロン可能やツモ可能で停止した場合 → 次のアクションを待つ
        setTimeout(() => executeCPUTurnIfNeeded(room), settings.cpuDelays.cpuTurnRecheckDelayMs);
      }
    });
    return;
    } // end of !hasTsumoOpportunity block
  }

  // 人間プレイヤーがリーチ中・ツモ牌あり・和了不可 → ツモ切りを自動実行
  const ct = room.gameLogic.getCurrentTurn();
  const cp = room.players?.get(ct);
  if (
    cp && !cp.isCPU && !cp.autoPlay &&
    room.gameLogic.isPlayerRiichi(ct) &&
    room.gameLogic.getDrawnTileIndex(ct) >= 0 &&
    !room.gameLogic.isWinningHand(ct)
  ) {
    const roomId = room.roomId;
    console.log(`🔴 [executeCPUTurnIfNeeded] Human ${cp.playerName} in riichi with drawn tile - triggering tsumo-giri in ${settings.cpuDelays.riichiAutoDiscardDelayMs}ms`);
    setTimeout(() => {
      console.log(`🔴 [executeCPUTurnIfNeeded] Executing tsumo-giri for ${ct}`);
      const autoDiscardResult = room.handlePlayerAction(ct, { type: 'discard' });
      console.log(`🔴 [executeCPUTurnIfNeeded] Tsumo-giri result:`, { success: autoDiscardResult?.success, finished: autoDiscardResult?.finished });

      broadcastToRoom(roomId, {
        type: 'gameStateUpdate',
        payload: room.getGameState(),
      });

      if (room.isFinished()) {
        handleAutoPlayGameFinished(room, 'RIICHI_TSUMOGIRI');
      } else {
        executeCPUTurnIfNeeded(room);
      }
    }, settings.cpuDelays.riichiAutoDiscardDelayMs);
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
        handleAutoPlayGameFinished(room, 'CPU CALLBACK');
      } else {
        // 次のターンがCPUなら再度実行
        setTimeout(() => executeCPUTurnIfNeeded(room), settings.cpuDelays.cpuTurnRecheckDelayMs);
      }
    });
  }
}

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
