const MahjongLogic = require('./MahjongLogic');
const AIPlayer = require('./AIPlayer');

class GameRoom {
  constructor(roomId, options = {}) {
    this.roomId = roomId;
    this.players = new Map(); // userId -> { userId, playerName, ws, hand, score }
    this.gameLogic = null;
    this.status = 'waiting'; // waiting, playing, finished, gameOver
    this.roundHistory = []; // 局の履歴
    this.nextRoundReady = new Set(); // 次の局への準備完了プレイヤー
    this.currentRound = 0; // 現在の局数
    this.roundWindIndex = 0; // 0=東, 1=南
    this.roundNumber = 1; // 東1局から開始
    this.dealerIndex = 0; // 0=最初の参加者が親
    this.nextRoundState = null; // 次局の状態（親・場風・局数）
    this.playerOrder = []; // 局開始時のプレイヤー順
    this.aiPlayers = new Map(); // userId -> AIPlayer instance
    this.testMode = options.testMode || false; // テストモード時は遅延をスキップ
    this.autoReadyTimerId = null; // 自動準備完了タイマーID
    this.gameOverTimerId = null; // ゲーム終了後の自動削除タイマーID
    this.inactivityTimerId = null; // 非アクティブタイマーID（5分間操作がない場合の削除用）
    this.lastActivityTime = Date.now(); // 最後のアクティビティ時刻
    this.lastResult = null; // 最後のアクション結果を保存（CPU callback用）
    this.initialScore = Number.isFinite(options.initialScore) && options.initialScore >= 0
      ? Math.floor(options.initialScore)
      : 25000;
    const rawWallTiles = Number(options.wallTiles);
    // wallTiles: 配牌を除いた、ゲーム進行中にツモできる壁牌の枚数
    // 計算: 全牌136枚 - 配牌27枚 - 予約牌22枚 = 87枚
    const minWallTiles = 30;
    const maxWallTiles = 136;
    this.wallTiles = Number.isFinite(rawWallTiles)
      ? Math.min(maxWallTiles, Math.max(minWallTiles, Math.floor(rawWallTiles)))
      : maxWallTiles;
    // gameMode: 'oneRound' (1局勝負) | 'easternsouthern' (東南戦: 2回目の東1局に入る時点で終了) | 'endless' (エンドレス: 0点になるまで継続)
    const supportedModes = ['oneRound', 'easternsouthern', 'endless'];
    this.gameMode = supportedModes.includes(options.gameMode) ? options.gameMode : 'oneRound';
    // 後方互換性: oneRoundMatch が true の場合は gameMode を 'oneRound' に設定
    if (options.oneRoundMatch === true && !options.gameMode) {
      this.gameMode = 'oneRound';
    }
    this.oneRoundMatch = this.gameMode === 'oneRound'; // 後方互換性のため保持
    const rawAutoActionTimerSeconds = Number(options.autoActionTimerSeconds);
    const minAutoActionTimerSeconds = 3;
    const maxAutoActionTimerSeconds = 60;
    this.autoActionTimerSeconds = Number.isFinite(rawAutoActionTimerSeconds)
      ? Math.min(maxAutoActionTimerSeconds, Math.max(minAutoActionTimerSeconds, Math.floor(rawAutoActionTimerSeconds)))
      : 10; // Default 10 seconds
    this.riichiDepositsCarryover = 0; // 流局時の供託点持ち越し
    this.tsumoLuckSettings = new Map(); // userId -> luck level (0=none, 1=light, 2=heavy, 3=heavy)
    this.pendingTsumoLuckSettings = { my: 1, opponent: 1 }; // Default pending settings to be applied on player join
    this.useRedDora = options.useRedDora || false; // 赤ドラを使用するか
  }
  
  setPendingTsumoLuckSettings(myTsumoLuck, opponentTsumoLuck) {
    this.pendingTsumoLuckSettings = {
      my: Math.max(0, Math.min(3, Math.floor(myTsumoLuck))),
      opponent: Math.max(0, Math.min(3, Math.floor(opponentTsumoLuck))),
    };
  }
  
  getPendingTsumoLuckSettings() {
    return this.pendingTsumoLuckSettings;
  }
  
  setTsumoLuck(userId, luckLevel) {
    // luckLevel: 0=no luck, 1=light (30%), 2=medium (50%), 3=heavy (70%)
    const level = Number.isFinite(luckLevel) ? Math.max(0, Math.min(3, Math.floor(luckLevel))) : 0;
    this.tsumoLuckSettings.set(userId, level);
  }
  
  getTsumoLuck(userId) {
    return this.tsumoLuckSettings.get(userId) || 0;
  }
  
  addPlayer(userId, playerName, ws, isCPU = false) {
    // Check if room is full
    if (this.players.size >= 2) {
      return { success: false, message: 'Room is full' };
    }
    
    // Check if player with same name already exists
    for (const player of this.players.values()) {
      if (player.playerName === playerName) {
        return { success: false, message: 'Player with this name already exists in the room' };
      }
    }
    
    // Check if same userId already exists (shouldn't happen but safety check)
    if (this.players.has(userId)) {
      return { success: false, message: 'Player already connected to this room' };
    }
    
    const player = {
      userId,
      playerName,
      ws: isCPU ? null : ws, // CPUの場合はws不要
      hand: [],
      score: this.initialScore, // 初期持ち点
      autoDrawMode: false, // Auto-discard mode for drawn tiles
      noMeldMode: false, // No-meld mode (don't allow pung, chi, kan)
      riichi: false, // リーチ状態
      isCPU: isCPU, // CPU判定フラグ
      disconnectedAt: null,
      disconnectTimerId: null,
    };
    
    this.players.set(userId, player);
    
    // CPUプレイヤーの場合はAIPlayerを初期化
    if (isCPU) {
      this.aiPlayers.set(userId, new AIPlayer(false)); // false = 通常モード（ツモ切りではない）
    }
    
    return { success: true, player };
  }
  
  removePlayer(userId) {
    const player = this.players.get(userId);
    if (player?.disconnectTimerId) {
      clearTimeout(player.disconnectTimerId);
    }
    this.players.delete(userId);
    this.aiPlayers.delete(userId); // AIPlayerも削除
    if (this.players.size === 0) {
      this.status = 'waiting';
      this.gameLogic = null;      // \u5168\u54e1\u304c\u3044\u306a\u304f\u306a\u3063\u305f\u5834\u5408\u3001\u30bf\u30a4\u30de\u30fc\u3092\u30af\u30ea\u30a2
      this.clearAutoReadyTimer();
      this.clearGameOverTimer();
      this.clearInactivityTimer();    }
  }

  markDisconnected(userId) {
    const player = this.players.get(userId);
    if (!player) {
      return null;
    }
    player.ws = null;
    player.disconnectedAt = Date.now();
    return player;
  }
  
  getPlayers() {
    return Array.from(this.players.values()).map((p) => ({
      userId: p.userId,
      playerName: p.playerName,
      isCPU: p.isCPU || false,
    }));
  }

  getConnectedPlayersCount() {
    // Count only players that are actually connected
    // CPUs are always counted as connected, human players need ws connection
    let count = 0;
    this.players.forEach((player) => {
      if (player.isCPU || (player.ws && player.ws.readyState === 1)) {
        count++;
      }
    });
    return count;
  }
  
  isFull() {
    return this.players.size === 2;
  }
  
  isEmpty() {
    return this.players.size === 0;
  }
  
  start() {
    if (this.players.size !== 2) {
      return false;
    }
    
    this.status = 'playing';
    this.nextRoundReady.clear(); // 準備状態をクリア
    // Prevent stale timers from firing during an active round.
    this.clearAutoReadyTimer();
    this.clearGameOverTimer();

    if (this.nextRoundState) {
      this.roundWindIndex = this.nextRoundState.roundWindIndex;
      this.roundNumber = this.nextRoundState.roundNumber;
      this.dealerIndex = this.nextRoundState.dealerIndex;
      this.nextRoundState = null;
    }

    this.playerOrder = Array.from(this.players.keys());
    if (this.dealerIndex >= this.playerOrder.length) {
      this.dealerIndex = 0;
    }
    this.currentRound = this.getRoundIndex();
    
    // 初期持ち点を取得
    const playerScores = {};
    this.players.forEach((player, userId) => {
      playerScores[userId] = player.score;
      player.riichi = false; // リーチ状態をリセット
    });
    
    // Create a callback function to check if a player is in no-meld mode
    const isPlayerInNoMeldMode = (userId) => {
      const player = this.players.get(userId);
      return player?.noMeldMode || false;
    };
    
    const seatWinds = this.buildSeatWinds(this.playerOrder);
    
    // Build tsumo luck settings for each player
    const tsumoLuckSettings = {};
    this.playerOrder.forEach((userId) => {
      tsumoLuckSettings[userId] = this.getTsumoLuck(userId);
    });
    
    this.gameLogic = new MahjongLogic(
      this.playerOrder,
      playerScores,
      isPlayerInNoMeldMode,
      {
        wallTiles: this.wallTiles,
        dealerIndex: this.dealerIndex,
        roundWindNumber: this.getRoundWindNumber(),
        seatWinds: seatWinds,
        tsumoLuckSettings: tsumoLuckSettings,
        useRedDora: this.useRedDora,
      }
    );
    if (this.riichiDepositsCarryover > 0) {
      this.gameLogic.riichiDeposits = this.riichiDepositsCarryover;
    }
    this.gameLogic.initialize();
    
    // Deal initial tiles
    this.gameLogic.dealTiles();
    
    return true;
  }
  
  handlePlayerAction(userId, action) {
    // Handle next round ready - これはfinished状態でも受け付ける
    if (action.type === 'nextRound') {
      if (this.status !== 'finished') {
        return { success: false, message: 'Can only advance to next round after current round is finished' };
      }
      
      this.nextRoundReady.add(userId);
      
      // CPU対戦時は、人間プレイヤーが押したら即座に全CPUプレイヤーも準備完了にする
      for (const [playerId, player] of this.players) {
        if (player.isCPU && !this.nextRoundReady.has(playerId)) {
          this.nextRoundReady.add(playerId);
        }
      }
      
      console.log(`Player ${userId} ready for next round (${this.nextRoundReady.size}/${this.players.size})`);
      
      // 全プレイヤーが準備完了したら次の局を開始
      if (this.nextRoundReady.size === this.players.size) {
        return { success: true, startNextRound: true };
      }
      
      return { success: true, message: 'Waiting for other players...' };
    }

    if (this.status !== 'playing' || !this.gameLogic) {
      return { success: false, message: 'Game is not in progress' };
    }

    // Handle autoDrawMode toggle
    if (action.type === 'setAutoDrawMode') {
      const player = this.players.get(userId);
      if (!player) {
        return { success: false, message: 'Player not found' };
      }
      player.autoDrawMode = action.enabled;
      return { success: true, message: `Auto-draw mode ${action.enabled ? 'enabled' : 'disabled'}` };
    }

    // Handle noMeldMode toggle
    if (action.type === 'setNoMeldMode') {
      const player = this.players.get(userId);
      if (!player) {
        return { success: false, message: 'Player not found' };
      }
      player.noMeldMode = action.enabled;
      return { success: true, message: `No-meld mode ${action.enabled ? 'enabled' : 'disabled'}` };
    }

    // Handle riichi declaration
    if (action.type === 'riichi') {
      const result = this.gameLogic.declareRiichi(userId, action.tileId);
      if (result.success) {
        const player = this.players.get(userId);
        player.riichi = true;
      }
      return result;
    }
    
    const result = this.gameLogic.processAction(userId, action);
    
    if (result.finished) {
      console.log(`[GameRoom.handlePlayerAction] 🏁 Game finished detected, message: "${result.message}"`);
      this.status = 'finished';
      this.lastResult = result; // CPU callback用に保存
      
      try {
        // 局の結果を履歴に保存
        const tenpaiStatus = result.isDraw === true ? this.gameLogic.getTenpaiStatus() : null;
        const roundResult = {
          round: this.currentRound,
          roundName: this.getRoundName(),
          roundWind: this.getRoundWindNumber(),
          roundNumber: this.roundNumber,
          dealerId: this.getDealerId(),
          seatWinds: this.buildSeatWinds(this.playerOrder),
          winner: this.gameLogic.getWinner(),
          winType: result.message,
          scoreResult: result.scoreResult,
          scores: {},
          previousScores: {},
          isDraw: result.isDraw === true,
          tenpai: tenpaiStatus,
        };
        
        // 各プレイヤーの前回点数を保存
        this.players.forEach((player, uid) => {
          roundResult.previousScores[uid] = player.score;
        });
        
        // 各プレイヤーの点数を更新・保存
        this.players.forEach((player, uid) => {
          const newScore = this.gameLogic.getPlayerScore(uid);
          player.score = newScore;
          roundResult.scores[uid] = newScore;
        });
        
        this.roundHistory.push(roundResult);
        console.log(`[GameRoom.handlePlayerAction] ✅ Round history saved: ${roundResult.winType}, winner: ${roundResult.winner || 'none (draw)'}`);

        this.riichiDepositsCarryover = result.isDraw === true
          ? this.gameLogic.getRiichiDeposits()
          : 0;
        this.nextRoundState = this.computeNextRoundState(roundResult);
        
        // ゲーム終了判定ロジック
        let shouldGameEnd = false;
        let endReason = '';
        
        if (this.gameMode === 'oneRound') {
          // 1局勝負: 和了があったらゲーム終了
          if (!result.isDraw) {
            shouldGameEnd = true;
            endReason = 'One-round match';
          }
        } else if (this.gameMode === 'easternsouthern') {
          // 東南戦: 2回目の東1局に入る条件を満たした時点で終了
          // 南2局で和了または流局（親が聴牌しない場合も含む）して、次局が東1局になればゲーム終了
          console.log(`[GameRoom.easternsouthern check] currentRound: ${this.currentRound}, roundName: ${this.getRoundName()}`);
          console.log(`[GameRoom.easternsouthern check] nextRoundState:`, this.nextRoundState);
          if (this.nextRoundState && 
              this.nextRoundState.roundWindIndex === 0 && 
              this.nextRoundState.roundNumber === 1) {
            shouldGameEnd = true;
            endReason = 'Eastern-Southern match - reached second east round';
            console.log(`[GameRoom.easternsouthern] ✅ Game will end: nextRound is 東1局`);
          } else {
            console.log(`[GameRoom.easternsouthern] ❌ Game will NOT end: nextRound is NOT 東1局`);
          }
        } else if (this.gameMode === 'endless') {
          // エンドレス: 誰かの点数がマイナスになったらゲーム終了
          let hasNegativeScore = false;
          this.players.forEach((player) => {
            if (player.score < 0) {
              hasNegativeScore = true;
            }
          });
          if (hasNegativeScore) {
            shouldGameEnd = true;
            endReason = 'Endless - negative score detected';
          }
        }
        
        if (shouldGameEnd) {
          console.log(`[GameRoom.handlePlayerAction] 🏁 Game over - ${endReason}`);
          console.log(`[GameRoom.handlePlayerAction] 📊 roundHistory length: ${this.roundHistory.length}`);
          console.log(`[GameRoom.handlePlayerAction] 📊 roundHistory:`, this.roundHistory.map(r => ({ round: r.roundName, winner: r.winner })));
          this.status = 'gameOver';
          result.gameOver = true;
          result.finalResults = this.roundHistory;
          console.log(`[GameRoom.handlePlayerAction] ✅ result.finalResults set:`, result.finalResults.length, 'rounds');
        }
      } catch (err) {
        console.error(`[GameRoom.handlePlayerAction] ❌ Error while processing finished game state:`, err);
      }
    }
    
    return result;
  }
  
  getGameState() {
    if (!this.gameLogic) {
      return {
        status: this.status,
        players: this.getPlayers(),
        currentRound: this.currentRound,
        roundWind: this.getRoundWindNumber(),
        roundNumber: this.roundNumber,
        roundName: this.getRoundName(),
        dealerId: this.getDealerId(),
        seatWinds: this.buildSeatWinds(this.playerOrder),
        nextRoundReadyCount: this.nextRoundReady.size,
        totalPlayers: this.players.size,
      };
    }
    
    const playerIds = Array.from(this.players.keys());
    const state = {
      status: this.status,
      players: this.getPlayers(),
      currentTurn: this.gameLogic.getCurrentTurn(),
      pendingPungFor: this.gameLogic.getPendingPungFor(),
      pendingDaiminkanFor: this.gameLogic.getPendingDaiminkanFor(),
      ronPossibleFor: this.gameLogic.getRonPossibleFor(), // Add Ron state
      autoDrawMode: {}, // Add auto-draw mode state for each player
      noMeldMode: {}, // Add no-meld mode state for each player
      canWinFor: null, // Player who can currently win (if any)
      scores: this.gameLogic.getScores(), // 持ち点
      riichi: this.gameLogic.getRiichiStatus(), // リーチ状態
      riichiDeposits: this.gameLogic.getRiichiDeposits(), // 供託点
      dora: this.gameLogic.getDora(), // ドラ情報
      kanningWall: this.gameLogic.getKanningWall(), // 嶺上牌情報
      tiles: {},
      currentRound: this.currentRound, // 現在の局数
      roundWind: this.getRoundWindNumber(),
      roundNumber: this.roundNumber,
      roundName: this.getRoundName(),
      dealerId: this.getDealerId(),
      seatWinds: this.buildSeatWinds(this.playerOrder),
      nextRoundReadyCount: this.nextRoundReady.size, // 次の局への準備完了人数
      totalPlayers: this.players.size, // 総プレイヤー数
      autoActionTimerSeconds: this.autoActionTimerSeconds, // ツモ切り・ポン見逃しのタイマー秒数
    };
    
    // Send each player their own hand and public information
    // Only if game is in progress or finished (including gameOver to show winning hand)
    if (this.status === 'playing' || this.status === 'finished' || this.status === 'gameOver') {
      playerIds.forEach((userId) => {
        try {
          const hand = this.gameLogic.getPlayerHand(userId);
          const melds = this.gameLogic.getPlayerMelds(userId);
          const drawnTileIndex = this.gameLogic.getDrawnTileIndex(userId);
          const player = this.players.get(userId);
          const concealedMeldIndices = Array.from(this.gameLogic.players[userId].concealedMeldIndices);
          const daiminkanMeldIndices = Array.from(this.gameLogic.players[userId].daiminkanMeldIndices);
          state.tiles[userId] = {
            hand,
            melds,
            drawnTileIndex, // Index of the tile drawn this turn in the hand array
            concealedMeldIndices, // Indices of concealed kans (暗槓)
            daiminkanMeldIndices, // Indices of daiminkan (大明槓)
          };
          state.autoDrawMode[userId] = player?.autoDrawMode || false;
          state.noMeldMode[userId] = player?.noMeldMode || false;
          
          // Check if this player can win
          if (this.gameLogic.getCurrentTurn() === userId && this.gameLogic.isWinningHand(userId)) {
            state.canWinFor = userId;
          }
        } catch (err) {
          console.error(`Error getting game state for player ${userId}:`, err.message);
          // Still set empty state for this player
          state.tiles[userId] = {
            hand: [],
            melds: [],
            drawnTileIndex: -1,
          };
          const player = this.players.get(userId);
          state.autoDrawMode[userId] = player?.autoDrawMode || false;
          state.noMeldMode[userId] = player?.noMeldMode || false;
        }
      });
    }
    
    // Add wall and discards info
    state.wall = this.gameLogic.getWallCount();
    const discardsData = this.gameLogic.getDiscards();
    state.discards = discardsData.discards;
    state.riichiDiscards = discardsData.riichiDiscards;
    
    return state;
  }
  
  getStatus() {
    return this.status;
  }
  
  isFinished() {
    return this.status === 'finished' || this.status === 'gameOver';
  }
  
  getWinner() {
    if (!this.gameLogic) return null;
    return this.gameLogic.getWinner();
  }
  
  getScores() {
    if (!this.gameLogic) {
      const scores = {};
      this.players.forEach((player) => {
        scores[player.playerName] = player.score;
      });
      return scores;
    }
    const scores = {};
    this.players.forEach((player, userId) => {
      scores[player.playerName] = this.gameLogic.getPlayerScore(userId);
      // ゲーム終了時に持ち点を更新
      if (this.status === 'finished') {
        player.score = this.gameLogic.getPlayerScore(userId);
      }
    });
    return scores;
  }

  getRoundHistory() {
    return this.roundHistory;
  }

  getCurrentRound() {
    return this.currentRound;
  }

  getRoundWindNumber() {
    return this.roundWindIndex + 1;
  }

  getRoundNumber() {
    return this.roundNumber;
  }

  getRoundName() {
    const windName = this.roundWindIndex === 0 ? '東' : '南';
    return `${windName}${this.roundNumber}局`;
  }

  getRoundIndex() {
    return this.roundWindIndex * 2 + this.roundNumber;
  }

  getDealerId() {
    return this.playerOrder[this.dealerIndex] || null;
  }

  buildSeatWinds(playerOrder) {
    const order = playerOrder && playerOrder.length > 0 ? playerOrder : Array.from(this.players.keys());
    const seatWinds = {};
    if (order.length >= 2) {
      const dealerId = order[this.dealerIndex] || order[0];
      const otherId = order.find((id) => id !== dealerId) || order[1];
      seatWinds[dealerId] = 1; // 東
      if (otherId) {
        seatWinds[otherId] = 2; // 南
      }
    }
    return seatWinds;
  }

  computeNextRoundState(roundResult) {
    // 次の局の状態を計算する
    // shouldDealerContinueで親が続くかどうかを判定し、
    // 親が変わる場合は局を進める
    const dealerId = this.getDealerId();
    const dealerContinues = this.shouldDealerContinue(roundResult, dealerId);

    if (dealerContinues) {
      // 親が続く場合：同じ親で同じ局
      return {
        roundWindIndex: this.roundWindIndex,
        roundNumber: this.roundNumber,
        dealerIndex: this.dealerIndex,
      };
    }

    // 親が変わる場合（和了した仔か、聴牌しなかった親）：次の親に交代して局を進める
    const nextDealerIndex = this.playerOrder.length > 0
      ? (this.dealerIndex + 1) % this.playerOrder.length
      : 0;
    let nextRoundNumber = this.roundNumber;
    let nextRoundWindIndex = this.roundWindIndex;

    // 局数を進める：1局→2局→1局（場風も進むので東→南へ）
    if (nextRoundNumber < 2) {
      nextRoundNumber += 1;
    } else {
      nextRoundNumber = 1;
      nextRoundWindIndex = (nextRoundWindIndex + 1) % 2;
    }

    return {
      roundWindIndex: nextRoundWindIndex,
      roundNumber: nextRoundNumber,
      dealerIndex: nextDealerIndex,
    };
  }

  shouldDealerContinue(roundResult, dealerId) {
    // 2人麻雀の局進行ルール：
    // 1. 和了の場合：親が和了したら親が続く、仔が和了したら親が変わる（局進）
    // 2. 流局の場合：親が聴牌したら親が続く、親が聴牌しなかったら親が変わる（局進）
    if (!dealerId) {
      return false;
    }
    if (roundResult.isDraw) {
      // 流局時の処理：親が聴牌していたら親が続く
      const dealerTenpai = roundResult.tenpai && roundResult.tenpai[dealerId];
      return dealerTenpai === true;
    }
    // 和了時の処理：親が和了したら親が続く、親以外が和了したら親が変わる
    return roundResult.winner === dealerId;
  }

  getNextRoundReadyCount() {
    return this.nextRoundReady.size;
  }

  isGameOver() {
    return this.status === 'gameOver';
  }

  getGameMode() {
    return this.gameMode;
  }

  // 10秒のタイマーを開始して、準備完了していないプレイヤーを自動準備完了にする
  startAutoReadyTimer(onAutoReady) {
    // 既存のタイマーがあればクリア
    if (this.autoReadyTimerId) {
      clearTimeout(this.autoReadyTimerId);
      this.autoReadyTimerId = null;
    }

    // ゲームが終了していない場合は何もしない
    if (this.status !== 'finished') {
      console.log(`⏱️ [WARNING] Cannot start auto-ready timer: status=${this.status} (expected 'finished')`);
      return;
    }

    console.log(`⏱️ Starting auto-ready timer for room ${this.roomId}`);
    console.log(`⏱️ Current players:`, Array.from(this.players.entries()).map(([uid, p]) => `${p.playerName}(${uid})`).join(', '));
    
    this.autoReadyTimerId = setTimeout(() => {
      console.log(`⏱️ [TIMEOUT] Auto-ready timeout triggered for room ${this.roomId}`);
      
      // CPUプレイヤーと人間プレイヤーの両方を自動的に準備完了にする
      this.players.forEach((player, userId) => {
        if (!this.nextRoundReady.has(userId)) {
          console.log(`⏱️   ➕ Auto-ready: ${player.playerName} (${userId})`);
          this.nextRoundReady.add(userId);
        }
      });

      // 全員が準備完了になった
      const readyCount = this.nextRoundReady.size;
      const totalCount = this.players.size;
      console.log(`⏱️ Ready count: ${readyCount}/${totalCount}`);
      
      if (readyCount === totalCount && totalCount > 0) {
        console.log(`⏱️ ✅ All players auto-ready, calling callback`);
        // コールバック関数を呼び出してserver側で次のラウンドを開始
        if (typeof onAutoReady === 'function') {
          console.log(`⏱️ Executing callback...`);
          onAutoReady();
          console.log(`⏱️ Callback executed`);
        } else {
          console.log(`⏱️ [ERROR] onAutoReady is not a function!`);
        }
      } else {
        console.log(`⏱️ Not all players ready yet`);
      }

      this.autoReadyTimerId = null;
    }, 10000); // 10秒
  }

  // 準備完了タイマーをクリア
  clearAutoReadyTimer() {
    if (this.autoReadyTimerId) {
      clearTimeout(this.autoReadyTimerId);
      this.autoReadyTimerId = null;
      console.log(`⏱️ Auto-ready timer cleared for room ${this.roomId}`);
    }
  }

  // ゲーム終了後5分でルームを削除するタイマーを開始
  startGameOverTimer(onGameOverTimeout) {
    // 既存のタイマーがあればクリア
    if (this.gameOverTimerId) {
      clearTimeout(this.gameOverTimerId);
      this.gameOverTimerId = null;
    }

    // ゲームオーバー状態でない場合は何もしない
    if (this.status !== 'gameOver') {
      console.log(`⏱️ [WARNING] Cannot start game-over timer: status=${this.status} (expected 'gameOver')`);
      return;
    }

    console.log(`⏱️ Starting game-over timer for room ${this.roomId} (5 minutes until deletion)`);
    
    this.gameOverTimerId = setTimeout(() => {
      console.log(`⏱️ [TIMEOUT] Game-over timeout triggered for room ${this.roomId}`);
      console.log(`⏱️ Room ${this.roomId} will be deleted now`);
      
      // コールバック関数を呼び出してserver側でルームを削除
      if (typeof onGameOverTimeout === 'function') {
        console.log(`⏱️ Executing game-over callback...`);
        onGameOverTimeout();
        console.log(`⏱️ Game-over callback executed`);
      } else {
        console.log(`⏱️ [ERROR] onGameOverTimeout is not a function!`);
      }

      this.gameOverTimerId = null;
    }, 5 * 60 * 1000); // 5分
  }

  // ゲーム終了タイマーをクリア
  clearGameOverTimer() {
    if (this.gameOverTimerId) {
      clearTimeout(this.gameOverTimerId);
      this.gameOverTimerId = null;
      console.log(`⏱️ Game-over timer cleared for room ${this.roomId}`);
    }
  }

  // 5分間操作がない場合にルームを削除するタイマーを開始
  startInactivityTimer(onInactivityTimeout) {
    // 既存のタイマーがあればクリア
    if (this.inactivityTimerId) {
      clearTimeout(this.inactivityTimerId);
      this.inactivityTimerId = null;
    }

    this.lastActivityTime = Date.now();
    console.log(`⏱️ Starting inactivity timer for room ${this.roomId} (5 minutes until deletion)`);
    
    this.inactivityTimerId = setTimeout(() => {
      console.log(`⏱️ [TIMEOUT] Inactivity timeout triggered for room ${this.roomId}`);
      console.log(`⏱️ Room ${this.roomId} will be deleted due to inactivity`);
      
      // コールバック関数を呼び出してserver側でルームを削除
      if (typeof onInactivityTimeout === 'function') {
        console.log(`⏱️ Executing inactivity callback...`);
        onInactivityTimeout();
        console.log(`⏱️ Inactivity callback executed`);
      } else {
        console.log(`⏱️ [ERROR] onInactivityTimeout is not a function!`);
      }

      this.inactivityTimerId = null;
    }, 5 * 60 * 1000); // 5分
  }

  // 非アクティブタイマーをクリア
  clearInactivityTimer() {
    if (this.inactivityTimerId) {
      clearTimeout(this.inactivityTimerId);
      this.inactivityTimerId = null;
      console.log(`⏱️ Inactivity timer cleared for room ${this.roomId}`);
    }
  }

  // アクティビティを記録し、非アクティブタイマーをリセット
  recordActivity(onInactivityTimeout) {
    this.lastActivityTime = Date.now();
    // タイマーをリセット（再設定）
    if (onInactivityTimeout && (this.status === 'playing' || this.status === 'waiting')) {
      this.startInactivityTimer(onInactivityTimeout);
    }
  }

  /**
   * 両方リーチ時の自動進行ループ
   * 0.5秒ごとにツモ→ツモ切りを繰り返し、フロントエンドに経過を表示する
   * @param {Function} broadcastCallback - ゲーム状態をブロードキャストするコールバック
   * @returns {Promise<Object>} - 最終的なアクション結果
   */
  async executeBothRiichiAutoPlay(broadcastCallback) {
    const delay = this.testMode ? 0 : 500; // 0.5秒遅延（テストモード時はスキップ）

    while (this.status === 'playing') {
      const currentTurnId = this.gameLogic.getCurrentTurn();

      // Step 1: 現在のプレイヤーのツモ（draw）
      const drawResult = this.handlePlayerAction(currentTurnId, { type: 'draw' });

      if (drawResult.finished) {
        // 流局（壁牌切れ）
        broadcastCallback();
        return drawResult;
      }

      if (!drawResult.bothRiichiAutoPlay) {
        // ツモ和了可能 - プレイヤーに選択させる
        broadcastCallback();
        return drawResult;
      }

      // ツモした状態をブロードキャスト（引いた牌が見える）
      broadcastCallback();
      if (delay > 0) await new Promise(r => setTimeout(r, delay));

      // Step 2: ツモ切り（discard）
      const discardResult = this.handlePlayerAction(currentTurnId, { type: 'discard' });

      // ツモ切り後の状態をブロードキャスト
      broadcastCallback();

      if (discardResult.finished) {
        return discardResult;
      }

      // ロン可能になった場合は停止（プレイヤーがロンを選択する）
      if (this.gameLogic.getRonPossibleFor()) {
        return discardResult;
      }

      // bothRiichiAutoPlay でなければ停止（想定外だがセーフティ）
      if (!discardResult.bothRiichiAutoPlay) {
        return discardResult;
      }

      // 次のイテレーションの前に遅延
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }

    return { success: true };
  }

  // CPU自動プレイを実行
  executeCPUTurn(callback) {
    if (this.status !== 'playing' || !this.gameLogic) {
      return;
    }

    // ロン待ちまたはポン待ちの状態をチェック
    const ronPossibleFor = this.gameLogic.getRonPossibleFor();
    const pendingPungFor = this.gameLogic.getPendingPungFor();

    // ロン可能状態: CPUがロンを取るべきかチェック
    if (ronPossibleFor && this.players.get(ronPossibleFor)?.isCPU) {
      console.log(`🤖 CPU Can Ron: ${this.players.get(ronPossibleFor).playerName}`);
      this.executeCPURon(ronPossibleFor, callback);
      return;
    }

    // ポン待機状態: CPUがポンするか draw するかチェック
    if (pendingPungFor && this.players.get(pendingPungFor)?.isCPU) {
      console.log(`🤖 CPU Pung Pending: ${this.players.get(pendingPungFor).playerName}`);
      this.executeCPUPung(pendingPungFor, callback);
      return;
    }

    // 通常のターン処理
    const currentTurn = this.gameLogic.getCurrentTurn();
    const currentPlayer = this.players.get(currentTurn);

    // 現在のターンのプレイヤーがCPUでない場合は何もしない
    if (!currentPlayer || !currentPlayer.isCPU) {
      return;
    }

    console.log(`🤖 CPU Turn: ${currentPlayer.playerName} (${currentTurn})`);

    // 少し遅延を入れてリアルっぽくする（500ms～1500ms）
    // テストモード時は遅延をスキップ
    const delay = this.testMode ? 0 : (500 + Math.random() * 1000);
    
    setTimeout(() => {
      this.executeCPUMainTurn(currentTurn, callback);
    }, delay);
  }

  // CPU通常ターンの処理（draw+discard または win）
  executeCPUMainTurn(userId, callback) {
    const hand = this.gameLogic.getPlayerHand(userId);
    const drawnTileIndex = this.gameLogic.getDrawnTileIndex(userId);
    const melds = this.gameLogic.players[userId].melds || [];
    
    // 副露（ポン・チー・カン）の構造上の牌数を計算（カンは4枚だが構造を3枚分として数える）
    const meldTiles = melds.reduce((sum, m) => sum + Math.min(m ? m.length : 0, 3), 0);
    const totalTiles = hand.length + meldTiles;

    console.log(`🤖 CPU main turn: hand size: ${hand.length}, melds: ${meldTiles}, total: ${totalTiles}, drawnTileIndex: ${drawnTileIndex}`);

    // ドローが必要かチェック
    // 通常: 手牌13枚 -> ドロー必要 -> 14枚 -> ディスカード待ち
    // ポン後: 手牌11枚 + 副露3枚 = 14枚 -> ドロー不要 -> ディスカード待ち
    // ディスカード後: 手牌10枚 + 副露3枚 = 13枚 -> ドロー必要
    // ドロー済み: totalTiles=14、drawnTileIndex>=0 -> ドロー不要
    if (totalTiles < 14) {
      console.log('🤖 CPU drawing tile...');
      const drawResult = this.handlePlayerAction(userId, { type: 'draw' });
      
      if (!drawResult.success) {
        console.log('🤖 CPU draw failed:', drawResult.message);
        if (callback) callback();
        return;
      }

      // ドロー後、再度ターン処理を実行
      // テストモード時は遅延をスキップ
      const drawDelay = this.testMode ? 0 : 300;
      setTimeout(() => {
        this.executeCPUAfterDraw(userId, callback);
      }, drawDelay);
    } else {
      // 既にドロー済み（totalTiles=14）またはポン後でディスカード待ち
      this.executeCPUAfterDraw(userId, callback);
    }
  }

  // CPU ドロー後の処理（ツモ和了 or ディスカード）
  executeCPUAfterDraw(userId, callback) {
    const hand = this.gameLogic.getPlayerHand(userId);
    const drawnTileIndex = this.gameLogic.getDrawnTileIndex(userId);
    const drawnTile = this.gameLogic.players[userId].drawnTile;
    const aiPlayer = this.aiPlayers.get(userId);
    const melds = this.gameLogic.players[userId].melds || [];
    const isRiichi = this.gameLogic.isPlayerRiichi(userId);
    const currentScore = this.gameLogic.getPlayerScore(userId);

    console.log(`🤖 CPU after draw: checking for tsumo win... (drawnTile: ${drawnTile ? drawnTile.toString() : 'null'})`);

    // ポン後、drawnTileが null の場合はツモ和了判定をスキップ
    // (ポン後のディスカード待ち状態)
    if (drawnTile) {
      // ツモ和了可能かチェック
      if (this.gameLogic.isWinningHand(userId)) {
        if (aiPlayer.shouldWin()) {
          console.log('🤖 CPU ツモ和了!');
          const winResult = this.handlePlayerAction(userId, { type: 'win' });
          if (winResult.success) {
            console.log('🤖 CPU ツモ和了 成功');
            if (callback) callback();
            return;
          }
        }
      }
    }

    // リーチ可能なら先に宣言（門前かつ聴牌）- 暗槓は門前扱い
    if (!isRiichi && this.gameLogic.isPlayerMenzen(userId) && drawnTile) {
      // リーチ判断に見えている牌情報を渡す
      const opponentId = this.gameLogic.getOtherPlayerId(userId);
      const opponentPlayer = opponentId ? this.gameLogic.players[opponentId] : null;
      const riichiGameState = {
        opponentDiscards: opponentPlayer?.discards || [],
        ownDiscards: this.gameLogic.players[userId].discards || [],
        ownMelds: melds,
        opponentMelds: opponentPlayer?.melds || [],
        doraIndicators: this.gameLogic.doraIndicators || [],
        wallRemaining: this.gameLogic.wall?.length || 0,
      };
      const riichiDecision = aiPlayer.shouldDeclareRiichi(hand, melds, currentScore, riichiGameState);
      if (riichiDecision.shouldRiichi && riichiDecision.discardIndex >= 0) {
        const riichiTile = hand[riichiDecision.discardIndex];
        const tileId = riichiTile.isRed ? `${riichiTile.suit}_${riichiTile.number}_red` : `${riichiTile.suit}_${riichiTile.number}`;
        console.log(`🤖 CPU declaring riichi with discard: ${tileId}`);
        const riichiResult = this.handlePlayerAction(userId, { type: 'riichi', tileId });
        if (riichiResult.success) {
          if (callback) callback();
          return;
        }
      }
    }

    // カン可能なら実行（加槓は積極的に、暗槓は慎重に）
    if (drawnTile && this.gameLogic.canPlayerKan(userId)) {
      console.log('🤖 Checking if CPU wants to kan...');
      this.executeCPUKan(userId, () => {
        // カン後、手牌が14枚でディスカード待ち状態
        // ディスカード処理へ進む
        this.executeCPUDiscard(userId, callback);
      });
      return;
    }

    // ツモ和了できなければディスカード
    this.executeCPUDiscard(userId, callback);
  }

  // CPU自動ロン処理
  executeCPURon(userId, callback) {
    const aiPlayer = this.aiPlayers.get(userId);

    if (!aiPlayer.shouldTakeRon()) {
      console.log('🤖 CPU declined ron, will draw instead');
      this.handlePlayerAction(userId, { type: 'draw' });
      if (callback) callback();
      return;
    }

    console.log('🤖 CPU executing ron...');
    const ronResult = this.handlePlayerAction(userId, { type: 'ron' });

    if (!ronResult.success) {
      console.log('🤖 CPU ron failed:', ronResult.message);
      // ロン失敗時は draw（フリテン対応）
      this.handlePlayerAction(userId, { type: 'draw' });
    } else {
      console.log('🤖 CPU ロン 成功!');
    }

    if (callback) callback();
  }

  // CPU自動ポン処理
  executeCPUPung(userId, callback) {
    const hand = this.gameLogic.getPlayerHand(userId);
    const melds = this.gameLogic.getPlayerMelds(userId);
    const lastDiscard = this.gameLogic.getLastDiscard();
    const aiPlayer = this.aiPlayers.get(userId);

    console.log(`🤖 CPU ponging decision...`);

    // 大明槓が可能かチェック（ポンより優先）
    if (lastDiscard && this.gameLogic.canPlayerDaiminkan(userId, lastDiscard)) {
      if (aiPlayer.shouldDaiminkan(hand, lastDiscard, melds)) {
        console.log('🤖 CPU will daiminkan');
        const kanResult = this.handlePlayerAction(userId, { type: 'kong' });
        if (kanResult.success) {
          console.log('🤖 CPU 大明槓 成功');
          // 大明槓後、嶺上牌を引いた状態 → ディスカード処理へ
          const kanDelay = this.testMode ? 0 : 300;
          setTimeout(() => {
            this.executeCPUAfterDraw(userId, callback);
          }, kanDelay);
          return;
        }
        console.log('🤖 CPU daiminkan failed:', kanResult.message);
      }
    }

    // AIPlayerにポンすべきか判定させる
    if (lastDiscard && aiPlayer.shouldPung(hand, lastDiscard, melds)) {
      console.log('🤖 CPU will pung');
      const pungResult = this.handlePlayerAction(userId, { type: 'pung' });
      
      if (!pungResult.success) {
        console.log('🤖 CPU pung failed:', pungResult.message);
        // ポン失敗時は draw
        this.handlePlayerAction(userId, { type: 'draw' });
        if (callback) callback();
      } else {
        console.log('🤖 CPU ポン 成功');
        // ポン後、このプレイヤーはドロー待ち状態
        // 次のターンでドロー＆ディスカード処理を実行
        // テストモード時は遅延をスキップ
        const pungDelay = this.testMode ? 0 : 300;
        setTimeout(() => {
          this.executeCPUMainTurn(userId, callback);
        }, pungDelay);
      }
    } else {
      console.log('🤖 CPU will not pung, drawing instead');
      const drawResult = this.handlePlayerAction(userId, { type: 'draw' });
      if (callback) callback();
    }
  }

  // CPU自動カン処理
  executeCPUKan(userId, callback) {
    const hand = this.gameLogic.getPlayerHand(userId);
    const melds = this.gameLogic.getPlayerMelds(userId);
    const isRiichi = this.gameLogic.isPlayerRiichi(userId);
    const aiPlayer = this.aiPlayers.get(userId);

    console.log(`🤖 CPU kan decision...`);

    // AIPlayerにカンすべきか判定させる
    if (aiPlayer.shouldKan(hand, melds, isRiichi)) {
      console.log('🤖 CPU will kan');
      const kanResult = this.handlePlayerAction(userId, { type: 'kong' });
      
      if (!kanResult.success) {
        console.log('🤖 CPU kan failed:', kanResult.message);
        // カン失敗時は続行（通常のディスカード処理へ）
        if (callback) callback();
      } else {
        console.log('🤖 CPU カン 成功');
        // カン後、このプレイヤーは手牌が14枚で嶺上牌を引いた状態
        // 次のターンでディスカード待ち状態なので、続行
        // テストモード時は遅延をスキップ
        const kanDelay = this.testMode ? 0 : 100;
        setTimeout(() => {
          // カン後はディスカード待ちなのでそのまま進行
          if (callback) callback();
        }, kanDelay);
      }
    } else {
      console.log('🤖 CPU will not kan');
      if (callback) callback();
    }
  }

  // CPU自動ディスカード（戦略的な打ち方 or ツモ切り）
  executeCPUDiscard(userId, callback) {
    const hand = this.gameLogic.getPlayerHand(userId);
    const drawnTileIndex = this.gameLogic.getDrawnTileIndex(userId);
    const isRiichi = this.gameLogic.isPlayerRiichi(userId);
    const aiPlayer = this.aiPlayers.get(userId);
    const melds = this.gameLogic.players[userId].melds || [];

    console.log(`🤖 CPU discarding... hand size: ${hand.length}, drawnTileIndex: ${drawnTileIndex}, melds: ${melds.length}`);

    // 手牌が空ならディスカード不可
    if (hand.length === 0) {
      console.log('🤖 CPU cannot discard: no tiles in hand');
      if (callback) callback();
      return;
    }

    // AIPlayerに打ち牌を選ばせる
    // ポン後は drawnTileIndex=-1 だが、AIは適切に処理する
    // 通常は drawnTileIndex を渡すが、-1の場合は最後の牌を使う
    const effectiveDrawnIndex = drawnTileIndex >= 0 ? drawnTileIndex : hand.length - 1;

    // AI に相手情報を渡す（防御・受入計算用）
    const opponentId = this.gameLogic.getOtherPlayerId(userId);
    const opponentPlayer = opponentId ? this.gameLogic.players[opponentId] : null;
    const gameState = {
      opponentRiichi: opponentPlayer?.riichi || false,
      opponentDiscards: opponentPlayer?.discards || [],
      ownDiscards: this.gameLogic.players[userId].discards || [],
      ownMelds: melds,
      opponentMelds: opponentPlayer?.melds || [],
      doraIndicators: this.gameLogic.doraIndicators || [],
      numMelds: melds.length,
      melds: melds,
      wallRemaining: this.gameLogic.wall?.length || 0,
      ownHand: hand,
    };
    const discardIndex = aiPlayer.chooseDiscard(hand, effectiveDrawnIndex, isRiichi, gameState);
    const tileToDiscard = hand[discardIndex];
    const tileId = tileToDiscard.isRed ? `${tileToDiscard.suit}_${tileToDiscard.number}_red` : `${tileToDiscard.suit}_${tileToDiscard.number}`;
    
    console.log(`🤖 CPU discarding tile: ${tileId} (index: ${discardIndex}, drawnIndex: ${drawnTileIndex})`);

    const discardResult = this.handlePlayerAction(userId, {
      type: 'discard',
      tileId: tileId,
    });

    if (!discardResult.success) {
      console.log('🤖 CPU discard failed:', discardResult.message);
    } else {
      console.log('🤖 CPU discard successful');
    }

    if (callback) callback();
  }

  // ツモ切りモードを設定（テスト用）
  setCPUTsumoKiriMode(userId, enabled) {
    const aiPlayer = this.aiPlayers.get(userId);
    if (aiPlayer) {
      aiPlayer.setTsumoKiriMode(enabled);
      console.log(`🤖 CPU ${userId}: tsumo-kiri mode = ${enabled}`);
      return { success: true, message: `Tsumo-kiri mode ${enabled ? 'enabled' : 'disabled'}` };
    }
    return { success: false, message: 'CPU player not found' };
  }

  // ツモ切りモードを取得（テスト用）
  getCPUTsumoKiriMode(userId) {
    const aiPlayer = this.aiPlayers.get(userId);
    if (aiPlayer) {
      return aiPlayer.getTsumoKiriMode();
    }
    return null;
  }

  // 現在のターンがCPUかどうかをチェック
  isCurrentTurnCPU() {
    if (this.status !== 'playing' || !this.gameLogic) {
      return false;
    }
    const currentTurn = this.gameLogic.getCurrentTurn();
    const currentPlayer = this.players.get(currentTurn);
    return currentPlayer && currentPlayer.isCPU;
  }
}

module.exports = GameRoom;