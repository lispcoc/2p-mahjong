const Tile = require('./Tile');
const ScoreCalculator = require('./ScoreCalculator');
const TenpaiChecker = require('./TenpaiChecker');

class MahjongLogic {
  constructor(playerIds, playerScores = {}, isPlayerInNoMeldMode, options = {}) {
    this.playerIds = playerIds; // [player1Id, player2Id]
    this.players = {};
    const dealerIndex = Number.isFinite(options.dealerIndex)
      ? Math.min(Math.max(0, Math.floor(options.dealerIndex)), Math.max(playerIds.length - 1, 0))
      : 0;
    this.currentTurnIndex = dealerIndex;
    this.dealerIndex = dealerIndex;
    this.roundWindNumber = Number.isFinite(options.roundWindNumber) ? options.roundWindNumber : 1;
    this.seatWinds = options.seatWinds || {};
    this.wall = [];
    this.doraIndicators = []; // ドラ表示牌
    this.doraTiles = []; // ドラ（表示牌の次の牌）
    this.kanningWall = []; // 嶺上牌（かん牌スペース）
    this.winner = null;
    this.finished = false;
    this.lastDiscard = null;
    this.lastDiscardBy = null;
    this.pendingPungFor = null;
    this.ronPossibleFor = null; // Track if Ron is possible for a player
    this.ronTile = null; // The tile that can be claimed for Ron
    this.scoreCalculator = new ScoreCalculator();
    this.riichiDeposits = 0; // 供託点（リーチ棒の合計）
    this.isPlayerInNoMeldMode = isPlayerInNoMeldMode || ((userId) => false); // Callback to check if player is in no-meld mode
    const rawWallTiles = Number(options.wallTiles);
    const minWallTiles = 30;
    const maxWallTiles = 136;
    this.wallTiles = Number.isFinite(rawWallTiles)
      ? Math.min(maxWallTiles, Math.max(minWallTiles, Math.floor(rawWallTiles)))
      : maxWallTiles;
    
    // Initialize players
    playerIds.forEach((id) => {
      this.players[id] = {
        hand: [],
        melds: [], // completed sets
        discards: [],
        score: playerScores[id] || 25000, // 持ち点（デフォルト25000点）
        drawnTile: null, // Last tile drawn from wall
        drawnTileIndex: -1, // Index of drawn tile in hand
        riichi: false, // リーチ状態
        riichiTurn: -1, // リーチした巡目
        riichiDiscardIndex: -1, // リーチ宣言時の捨て牌インデックス
        tempFuriten: false, // 同巡内フリテン（ロンを見逃した巡のみ）
        riichiPassFuriten: false, // リーチ後ロン見逃しフリテン（永続）
      };
    });
  }
  
  initialize() {
    // Create wall with all tiles (两人麻雀簡略版)
    // 萬子 (1-9) x 4, 筒子 (1-9) x 4, 索子 (1-9) x 4, 字牌 (1-7) x 4
    const tileTypes = [
      ...Array.from({ length: 4 }, () => 'man'), // 萬子
      ...Array.from({ length: 4 }, () => 'pin'), // 筒子
      ...Array.from({ length: 4 }, () => 'sou'), // 索子
      ...Array.from({ length: 4 }, () => 'honor'), // 字牌
    ];
    
    this.wall = [];
    
    // 萬子 1-9
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        this.wall.push(new Tile('man', i));
      }
    }
    
    // 筒子 1-9
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        this.wall.push(new Tile('pin', i));
      }
    }
    
    // 索子 1-9
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        this.wall.push(new Tile('sou', i));
      }
    }
    
    // 字牌 1-7 (東南西北白發中)
    for (let i = 1; i <= 7; i++) {
      for (let j = 0; j < 4; j++) {
        this.wall.push(new Tile('honor', i));
      }
    }
    
    // Shuffle wall
    this.shuffleWall();

    if (this.wallTiles < this.wall.length) {
      this.wall = this.wall.slice(0, this.wallTiles);
    }

    console.log(`[wall] initialize: wallTiles=${this.wallTiles}, wall.length=${this.wall.length}`);
  }
  
  dealTiles() {
    // Deal 13 tiles to each player
    const tilesPerPlayer = 13;
    for (let i = 0; i < tilesPerPlayer; i++) {
      this.playerIds.forEach((playerId) => {
        if (this.wall.length > 0) {
          const tile = this.wall.pop();
          this.players[playerId].hand.push(tile);
        }
      });
    }
    
    // Player 0 draws one more
    if (this.wall.length > 0) {
      const tile = this.wall.pop();
      const firstPlayerId = this.playerIds[this.currentTurnIndex];
      this.players[firstPlayerId].hand.push(tile);
      // Mark this as the drawn tile for player 0
      this.players[firstPlayerId].drawnTile = tile;
      this.players[firstPlayerId].drawnTileIndex = 13; // 14th tile (0-indexed)
      console.log(`[dealTiles] Dealt 14 tiles to first player ${firstPlayerId}, drawnTileIndex=13, hand.length=${this.players[firstPlayerId].hand.length}`);
    }

    console.log(`[wall] after dealTiles: wall.length=${this.wall.length}, kanningWall.length=${this.kanningWall.length}, doraIndicators.length=${this.doraIndicators.length}`);
    
    // Log all players' hand sizes
    this.playerIds.forEach((playerId) => {
      console.log(`[dealTiles] Player ${playerId} has ${this.players[playerId].hand.length} tiles`);
    });

    // Set up dora indicator and dora tile
    // ドラ表示牌は通常、嶺上牌の配置の一部として管理される
    // ここでは単に壁の先頭からドラ表示牌を設定する
    if (this.wall.length > 3) {
      // 嶺上牌スペース（通常3枚指定可能）
      for (let i = 0; i < 3 && this.wall.length > 0; i++) {
        this.kanningWall.push(this.wall[this.wall.length - 1 - i]); // 嶺上牌
      }
      this.doraIndicators.push(this.wall[this.wall.length - 4]); // ドラ表示牌（嶺上牌の次）
      this.doraTiles.push(this.wall[this.wall.length - 5]); // ドラ（表示牌の次の牌）
      console.log(`[dealTiles] Kanning wall (嶺上牌): ${this.kanningWall.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Dora indicator: ${this.doraIndicators[0].toString()}`);
      console.log(`[dealTiles] Dora tile: ${this.doraTiles[0].toString()}`);
    }
  }
  
  shuffleWall() {
    for (let i = this.wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
    }
  }
  
  getCurrentTurn() {
    return this.playerIds[this.currentTurnIndex];
  }

  getOtherPlayerId(userId) {
    return this.playerIds.find((id) => id !== userId);
  }

  canPlayerPung(userId, discardedTile) {
    const hand = this.players[userId].hand;
    let matchCount = 0;
    
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].equals(discardedTile)) {
        matchCount++;
        if (matchCount >= 2) return true;
      }
    }
    
    return false;
  }

  compareTiles(a, b) {
    const suitOrder = { man: 0, pin: 1, sou: 2, honor: 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.number - b.number;
  }
  
  processAction(userId, action) {
    if (this.getCurrentTurn() !== userId) {
      return { success: false, message: 'Not your turn' };
    }
    
    const { type, tileId, tileIndex } = action;
    
    if (type === 'discard') {
      // Support both tileId (new format) and tileIndex (legacy format)
      return this.handleDiscard(userId, tileId || tileIndex);
    } else if (type === 'draw') {
      return this.handleDraw(userId);
    } else if (type === 'pung') {
      return this.handlePung(userId);
    } else if (type === 'kong') {
      return this.handleKong(userId);
    } else if (type === 'win') {
      return this.handleWin(userId);
    } else if (type === 'ron') {
      return this.handleRon(userId);
    }
    
    return { success: false, message: 'Invalid action type' };
  }
  
  handleDiscard(userId, tileIndexInput) {
    const player = this.players[userId];
    const hand = player.hand;
    
    // 牌を捨てる = 次の巡に入るので、同巡内フリテンをリセット
    if (player.tempFuriten) {
      player.tempFuriten = false;
    }

    // リーチ後は引いた牌を自動的に捨てる
    if (player.riichi) {
      // 引いた牌を確認
      if (!player.drawnTile) {
        return { success: false, message: 'リーチ後は引いた牌を捨ててください' };
      }
      
      // drawnTileオブジェクトを使って実際の牌を手牌から探して削除
      const drawnTile = player.drawnTile;
      const actualIndex = hand.findIndex(t => t.suit === drawnTile.suit && t.number === drawnTile.number);
      
      if (actualIndex < 0) {
        return { success: false, message: '引いた牌が見つかりません' };
      }
      
      const tile = hand.splice(actualIndex, 1)[0];
      this.players[userId].discards.push(tile);
      // Reset drawn tile after discard
      this.players[userId].drawnTileIndex = -1;
      this.players[userId].drawnTile = null;

      // Set up pending pung for the other player
      const otherPlayerId = this.getOtherPlayerId(userId);
      this.lastDiscard = tile;
      this.lastDiscardBy = userId;
      
      // Check if Ron is possible for the other player
      if (otherPlayerId && this.canWinWithTile(otherPlayerId, tile, true)) {
        this.ronPossibleFor = otherPlayerId;
        this.ronTile = tile;
        // Move to next turn and return (other player can now claim Ron)
        this.nextTurn();
        return { success: true, autoDiscard: true };
      }
      
      // Check if the other player can actually pung
      // リーチ中のプレイヤーは副露できないのでチェックする
      // 鳴き無効モード中のプレイヤーは副露できないのでチェックする
      const otherPlayer = this.players[otherPlayerId];
      if (otherPlayerId && !otherPlayer?.riichi && !this.isPlayerInNoMeldMode(otherPlayerId) && this.canPlayerPung(otherPlayerId, tile)) {
        // Set pending pung - other player must decide to pung or draw
        this.pendingPungFor = otherPlayerId;
      } else {
        // Auto-draw for the other player since they can't pung
        this.pendingPungFor = null;
      }
      
      // Move to next turn
      this.nextTurn();
      
      // Auto-draw if no pung is possible
      if (!this.pendingPungFor && otherPlayerId) {
        const drawResult = this.drawForTurn(otherPlayerId);
        if (drawResult?.finished) {
          return {
            success: true,
            finished: true,
            message: drawResult.message,
            isDraw: drawResult.isDraw,
            autoDiscard: true,
          };
        }
      }

      return { success: true, autoDiscard: true };
    }

    let actualIndex = -1;
    if (typeof tileIndexInput === 'string') {
      // tileIndexInput は "suit_number" 形式（例："man_3" や "pin_5"）
      const [suit, numberStr] = tileIndexInput.split('_');
      const number = parseInt(numberStr);
      
      // 手牌の中から該当する牌を探す
      actualIndex = hand.findIndex(
        t => t.suit === suit && t.number === number
      );
      
      if (actualIndex < 0) {
        return { success: false, message: 'Tile not found in hand: ' + tileIndexInput };
      }
    } else if (typeof tileIndexInput === 'number') {
      // 後方互換性のため、古いインデックスベースもサポート
      const sorted = hand.slice().sort((a, b) => this.compareTiles(a, b));
      const selectedInSortedOrder = sorted[tileIndexInput];
      
      if (!selectedInSortedOrder) {
        return { success: false, message: 'Invalid tile index: ' + tileIndexInput };
      }
      
      actualIndex = hand.findIndex(
        t => t.suit === selectedInSortedOrder.suit && t.number === selectedInSortedOrder.number
      );
      
      if (actualIndex < 0) {
        return { success: false, message: 'Tile not found in hand' };
      }
    } else {
      actualIndex = Math.floor(Math.random() * hand.length);
    }

    const tile = hand.splice(actualIndex, 1)[0];
    this.players[userId].discards.push(tile);
    // Reset drawn tile after discard
    this.players[userId].drawnTileIndex = -1;
    this.players[userId].drawnTile = null;

    // Set up pending pung for the other player
    const otherPlayerId = this.getOtherPlayerId(userId);
    this.lastDiscard = tile;
    this.lastDiscardBy = userId;
    
    // Check if Ron is possible for the other player
    if (otherPlayerId && this.canWinWithTile(otherPlayerId, tile, true)) {
      this.ronPossibleFor = otherPlayerId;
      this.ronTile = tile;
      // Move to next turn and return (other player can now claim Ron)
      this.nextTurn();
      return { success: true };
    }
    
    // Check if the other player can actually pung
    // リーチ中のプレイヤーは副露できないのでチェックする
    const otherPlayer = this.players[otherPlayerId];
    if (otherPlayerId && !otherPlayer?.riichi && this.canPlayerPung(otherPlayerId, tile)) {
      // Set pending pung - other player must decide to pung or draw
      this.pendingPungFor = otherPlayerId;
    } else {
      // Auto-draw for the other player since they can't pung
      this.pendingPungFor = null;
    }
    
    // Move to next turn
    this.nextTurn();
    
    // Auto-draw if no pung is possible
    if (!this.pendingPungFor && otherPlayerId) {
      const drawResult = this.drawForTurn(otherPlayerId);
      if (drawResult?.finished) {
        return {
          success: true,
          finished: true,
          message: drawResult.message,
          isDraw: drawResult.isDraw === true,
        };
      }
    }

    return { success: true };
  }
  
  handleDraw(userId) {
    // If a pung is pending for this player, drawing means passing the pung
    if (this.pendingPungFor && this.pendingPungFor !== userId) {
      return { success: false, message: 'Not your pung decision' };
    }

    // If Ron is possible for this player, drawing means they're passing on Ron
    if (this.ronPossibleFor === userId) {
      const player = this.players[userId];
      
      // ロンを見逃した場合のフリテン処理
      // 同巡内フリテンを設定
      player.tempFuriten = true;
      console.log(`[handleDraw] Player ${userId} passed Ron - setting temp furiten`);
      
      // リーチ中の場合は永続フリテンも設定
      if (player.riichi) {
        player.riichiPassFuriten = true;
        console.log(`[handleDraw] Player ${userId} passed Ron during riichi - setting permanent furiten`);
      }
      
      this.ronPossibleFor = null;
      this.ronTile = null;
      // Now check if they can pung instead
      if (this.pendingPungFor !== userId && this.lastDiscard && this.canPlayerPung(userId, this.lastDiscard)) {
        this.pendingPungFor = userId;
        return { success: true, message: 'Ron passed, pung available' };
      }
      // If no pung, just clear the state
      this.pendingPungFor = null;
      this.lastDiscard = null;
      this.lastDiscardBy = null;
    }

    if (this.pendingPungFor === userId) {
      this.pendingPungFor = null;
      this.lastDiscard = null;
      this.lastDiscardBy = null;
    }

    return this.drawForTurn(userId);
  }
  
  handlePung(userId) {
    // Pung: form a triplet with the last discard
    if (this.pendingPungFor !== userId || !this.lastDiscard) {
      return { success: false, message: 'No discard available for pung' };
    }

    // リーチ中はポンできない
    if (this.players[userId].riichi) {
      return { success: false, message: 'リーチ中はポンできません' };
    }

    // 鳴き無効モード中はポンできない
    if (this.isPlayerInNoMeldMode(userId)) {
      return { success: false, message: '鳴き無効モード中はポンできません' };
    }

    const otherPlayerId = this.getOtherPlayerId(userId);
    if (!otherPlayerId) {
      return { success: false, message: 'Opponent not found' };
    }
    
    const lastDiscard = this.lastDiscard;
    
    // Check if player has 2 tiles matching the discard
    const matchedIndices = [];
    
    for (let i = 0; i < this.players[userId].hand.length; i++) {
      if (this.players[userId].hand[i].equals(lastDiscard)) {
        matchedIndices.push(i);
        if (matchedIndices.length === 2) break;
      }
    }
    
    if (matchedIndices.length !== 2) {
      return { success: false, message: 'Cannot form pung - need 2 matching tiles' };
    }
    
    // Form pung with tiles from hand and discard
    const meld = [
      this.players[userId].hand[matchedIndices[0]],
      this.players[userId].hand[matchedIndices[1]],
      lastDiscard,
    ];
    
    this.players[userId].melds.push(meld);
    
    // Remove matched tiles from hand (remove in reverse order to maintain indices)
    for (let i = matchedIndices.length - 1; i >= 0; i--) {
      this.players[userId].hand.splice(matchedIndices[i], 1);
    }
    
    // Remove the discard from opponent's discard pile
    const discardPile = this.players[otherPlayerId].discards;
    let discardIndex = -1;
    for (let i = discardPile.length - 1; i >= 0; i--) {
      if (discardPile[i].equals(lastDiscard)) {
        discardIndex = i;
        break;
      }
    }
    if (discardIndex >= 0) {
      discardPile.splice(discardIndex, 1);
    }

    // ポン後、前のツモ情報をリセット（新しいツモを準備）
    this.players[userId].drawnTile = null;
    this.players[userId].drawnTileIndex = -1;

    // Clear pending pung state, Ron state, and keep turn
    this.pendingPungFor = null;
    this.ronPossibleFor = null;
    this.ronTile = null;
    this.lastDiscard = null;
    this.lastDiscardBy = null;
    
    // ポン後、このプレイヤーは手牌が13枚のまま（ツモ待ちになる）
    // ターンをポンをした人に設定（このプレイヤーが牌を捨てることになる）
    this.currentTurnIndex = this.playerIds.indexOf(userId);
    
    return { success: true, message: 'Pung successful' };
  }
  
  handleKong(userId) {
    // Kong: similar to pung but with 4 tiles
    return { success: false, message: 'Kong not yet implemented' };
  }
  
  handleWin(userId) {
    // Check if hand is winning
    if (this.isWinningHand(userId)) {
      // ツモ和了の点数計算
      const drawnTile = this.players[userId].drawnTile;
      const scoreResult = this.calculateWinScore(userId, drawnTile, true);
      
      // 役がない場合は和了できない
      if (!scoreResult.valid) {
        return { 
          success: false, 
          message: scoreResult.error || '役がありません'
        };
      }
      
      // 点数精算（ツモ：他家から取る）
      const otherPlayerId = this.getOtherPlayerId(userId);
      const payment = scoreResult.score; // 他家からの支払い
      
      this.players[userId].score += payment;
      this.players[otherPlayerId].score -= payment;
      
      // 供託点を和了者が取得
      if (this.riichiDeposits > 0) {
        this.players[userId].score += this.riichiDeposits;
        scoreResult.riichiDeposits = this.riichiDeposits;
        this.riichiDeposits = 0;
      }
      
      this.finished = true;
      this.winner = userId;
      return { 
        success: true, 
        finished: true, 
        message: 'ツモ!',
        scoreResult: scoreResult
      };
    }
    
    return { success: false, message: 'Invalid win' };
  }

  handleRon(userId) {
    // Check if Ron is possible for this player
    if (this.ronPossibleFor !== userId || !this.ronTile) {
      return { success: false, message: 'Ron not available for you' };
    }

    const tile = this.ronTile;
    const player = this.players[userId];
    
    console.log(`[handleRon] Player ${userId} riichi status: ${player.riichi}`);
    
    // Check if player can win with this tile
    if (!this.canWinWithTile(userId, tile, true)) {
      return { success: false, message: 'Cannot win with this tile' };
    }

    // Add the tile to the player's hand temporarily to verify winning condition
    const hand = this.players[userId].hand;
    hand.push(tile);
    
    // Verify the hand is winning
    if (!this.isWinningHand(userId)) {
      hand.pop(); // Remove the tile if not winning
      return { success: false, message: 'Invalid win' };
    }
    
    // ロン和了の点数計算
    const scoreResult = this.calculateWinScore(userId, tile, false);
    
    // 役がない場合は和了できない
    if (!scoreResult.valid) {
      hand.pop(); // Remove the tile
      return { 
        success: false, 
        message: scoreResult.error || '役がありません'
      };
    }
    
    // 点数精算（ロン：振り込み者が支払う）
    const loserPlayerId = this.lastDiscardBy;
    const payment = scoreResult.score;
    
    this.players[userId].score += payment;
    this.players[loserPlayerId].score -= payment;
    
    // 供託点を和了者が取得
    if (this.riichiDeposits > 0) {
      this.players[userId].score += this.riichiDeposits;
      scoreResult.riichiDeposits = this.riichiDeposits;
      this.riichiDeposits = 0;
    }
    
    // Player wins
    this.finished = true;
    this.winner = userId;
    
    // Clear Ron state
    this.ronPossibleFor = null;
    this.ronTile = null;
    
    return { 
      success: true, 
      finished: true, 
      message: 'ロン!',
      scoreResult: scoreResult
    };
  }

  /**
   * フリテン（振聴）チェック
   * @param {string} userId - プレイヤーID
   * @param {Object} tile - チェック対象のタイル（ロンする牌）
   * @returns {boolean} - フリテンの場合true
   */
  isFuriten(userId, tile) {
    const player = this.players[userId];
    
    // 1. リーチ後ロン見逃しフリテン（永続）
    if (player.riichiPassFuriten) {
      console.log(`[isFuriten] Player ${userId} is in riichi-pass furiten (permanent)`);
      return true;
    }
    
    // 2. 同巡内フリテン（ロンを見逃した巡のみ）
    if (player.tempFuriten) {
      console.log(`[isFuriten] Player ${userId} is in temp furiten (same turn)`);
      return true;
    }
    
    // 3. 捨牌フリテン（自分の捨て牌に待ち牌がある）
    // 待ち牌を全て取得
    const waitingTiles = TenpaiChecker.getWinningTiles(player.hand, player.melds);
    
    // 自分の捨て牌と待ち牌を比較
    for (const waitTile of waitingTiles) {
      for (const discard of player.discards) {
        if (discard.suit === waitTile.suit && discard.number === waitTile.number) {
          console.log(`[isFuriten] Player ${userId} is in discard furiten: waiting for ${waitTile.suit}_${waitTile.number}, already discarded`);
          return true;
        }
      }
    }
    
    return false;
  }

  canWinWithTile(userId, tile, isRon = false) {
    // ロンの場合はフリテンチェック
    if (isRon && this.isFuriten(userId, tile)) {
      return false;
    }
    
    // Create a temporary hand with the tile added
    const hand = this.players[userId].hand.slice();
    hand.push(tile);
    
    // Check if this hand is winning
    return this.checkValidMeldStructure(hand);
  }
  
  isWinningHand(userId) {
    const hand = this.players[userId].hand;
    const melds = this.players[userId].melds;
    
    // Must have exactly 14 tiles total (hand + melds)
    const totalTiles = hand.length + (melds.length * 3);
    if (totalTiles !== 14) {
      return false;
    }
    
    // Special hand types (require closed hand - no melds)
    if (melds.length === 0) {
      // Check for 七対子 (Seven Pairs - Chiitoitsu)
      if (this.isChiitoitsu(hand)) {
        return true;
      }
      
      // Check for 国士無双 (Thirteen Orphans - Kokushi)
      if (this.isKokushi(hand)) {
        return true;
      }
    }
    
    // Check if hand (excluding melds) has valid structure
    // We need: (hand.length / 3) sets + 1 pair
    // For example: 14 tiles = 4 sets + 1 pair
    // With 1 meld = 11 tiles in hand = 3 sets + 1 pair
    return this.checkValidMeldStructure(hand);
  }
  
  /**
   * 七対子（チートイツ）判定
   * 同じ牌が2枚ずつで7組を形成する
   */
  isChiitoitsu(hand) {
    if (hand.length === 14) {
      // 完成形チェック（7対子完成）
      const sorted = hand.slice().sort((a, b) => this.compareTiles(a, b));
      
      // 7つの対子をチェック
      for (let i = 0; i < 14; i += 2) {
        if (!sorted[i].equals(sorted[i + 1])) {
          return false;
        }
      }
      
      return true;
    } else if (hand.length === 13) {
      // テンパイ形チェック（6対+1枚）
      // 手牌をソート
      const sorted = hand.slice().sort((a, b) => this.compareTiles(a, b));
      
      // 牌の発生回数をカウント
      const counts = {};
      sorted.forEach((tile) => {
        const key = `${tile.suit}_${tile.number}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      
      // 対子カウント
      let pairCount = 0;
      const remainingTiles = [];
      
      for (const key in counts) {
        const count = counts[key];
        if (count === 2) {
          pairCount++;
        } else if (count === 1) {
          remainingTiles.push(key);
        } else {
          return false; // 3枚以上は不可
        }
      }
      
      // 6対+1枚の形か確認
      return pairCount === 6 && remainingTiles.length === 1;
    }
    
    return false;
  }
  
  /**
   * 国士無双（こくしむそう）判定
   * 13種類のターミナルとオナー牌（通常：1m, 9m, 1p, 9p, 1s, 9s, 東南西北白發中）
   * のそれぞれ1枚、そのうち1つは2枚
   */
  isKokushi(hand) {
    if (hand.length !== 14) return false;
    
    // 国士無双に必要な牌の種類
    // 1m, 9m, 1p, 9p, 1s, 9s（数字牌のターミナル）
    // 東(1), 南(2), 西(3), 北(4), 白(5), 發(6), 中(7)（字牌）
    const requiredTiles = [
      { suit: 'man', number: 1 },
      { suit: 'man', number: 9 },
      { suit: 'pin', number: 1 },
      { suit: 'pin', number: 9 },
      { suit: 'sou', number: 1 },
      { suit: 'sou', number: 9 },
      { suit: 'honor', number: 1 }, // 東
      { suit: 'honor', number: 2 }, // 南
      { suit: 'honor', number: 3 }, // 西
      { suit: 'honor', number: 4 }, // 北
      { suit: 'honor', number: 5 }, // 白
      { suit: 'honor', number: 6 }, // 發
      { suit: 'honor', number: 7 }, // 中
    ];
    
    const tileCount = {};
    
    // Count tiles in hand
    for (const tile of hand) {
      const key = `${tile.suit}_${tile.number}`;
      tileCount[key] = (tileCount[key] || 0) + 1;
    }
    
    let pairCount = 0;
    
    // Check that all required tiles are present
    for (const required of requiredTiles) {
      const key = `${required.suit}_${required.number}`;
      const count = tileCount[key] || 0;
      
      if (count !== 1 && count !== 2) {
        return false; // Must have exactly 1 or 2 of each required tile
      }
      
      if (count === 2) {
        pairCount++;
      }
    }
    
    // Must have exactly one pair among the required tiles
    // and total tiles in hand must be 14
    if (pairCount !== 1) {
      return false;
    }
    
    // Check that no other tiles exist (all 14 tiles must be from required set)
    let totalCount = 0;
    for (const count of Object.values(tileCount)) {
      totalCount += count;
    }
    
    return totalCount === 14;
  }
  
  checkValidMeldStructure(tiles) {
    // Must have at least 2 tiles for a pair
    if (tiles.length < 2) return false;
    
    // Must be in format: n*3 + 2 (n sets + 1 pair)
    if (tiles.length % 3 !== 2) return false;
    
    // Clone and sort the tiles array
    const tileCopy = tiles.slice().sort((a, b) => this.compareTiles(a, b));
    
    // Try to find a pair and then check if remaining tiles form valid sets
    for (let i = 0; i < tileCopy.length - 1; i++) {
      if (tileCopy[i].equals(tileCopy[i + 1])) {
        // Found a pair, remove it and check remaining tiles
        const remaining = tileCopy.slice(0, i).concat(tileCopy.slice(i + 2));
        if (this.canFormSets(remaining)) {
          return true;
        }
        // Important: Continue checking other pairs, don't stop at first pair
        // Skip the next tile as we already checked it as part of this pair
        i++;
      }
    }
    
    // No valid pair found
    return false;
  }
  
  canFormSets(tiles) {
    // Base case: no tiles left = valid
    if (tiles.length === 0) return true;
    
    // Must be multiple of 3
    if (tiles.length % 3 !== 0) return false;
    
    // Sort tiles to make sequence detection easier
    const sorted = tiles.slice().sort((a, b) => this.compareTiles(a, b));
    const firstTile = sorted[0];
    
    // Try to form a pung (triplet) with first tile
    if (sorted.length >= 3 && 
        sorted[1].equals(firstTile) && 
        sorted[2].equals(firstTile)) {
      // Found a triplet, remove it and check remaining
      const remaining = sorted.slice(3);
      if (this.canFormSets(remaining)) {
        return true;
      }
    }
    
    // Try to form a chow (sequence) with first tile
    if (firstTile.suit !== 'honor' && firstTile.number <= 7) {
      const suit = firstTile.suit;
      const num = firstTile.number;
      
      // Look for tiles with suit and num+1, num+2
      let found1 = false, found2 = false;
      let idx1 = -1, idx2 = -1;
      
      for (let i = 1; i < sorted.length; i++) {
        if (!found1 && sorted[i].suit === suit && sorted[i].number === num + 1) {
          found1 = true;
          idx1 = i;
        } else if (!found2 && sorted[i].suit === suit && sorted[i].number === num + 2) {
          found2 = true;
          idx2 = i;
        }
        if (found1 && found2) break;
      }
      
      if (found1 && found2) {
        // Found a sequence, remove the three tiles and check remaining
        const remaining = sorted.filter((_, idx) => idx !== 0 && idx !== idx1 && idx !== idx2);
        if (this.canFormSets(remaining)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  nextTurn() {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerIds.length;
  }

  drawForTurn(userId) {
    const hand = this.players[userId].hand;

    // Avoid double draw if player already has a drawn tile
    if (this.players[userId].drawnTileIndex >= 0) {
      return { success: true };
    }
    
    // ツモが必要な場合: 手牌が14未満ならドロー必要
    // 通常のターン: 手牌は13（ツモ前）-> 14（ツモ後）
    // ポン後: 手牌は11（1回目）-> 12（ツモ後）
    //        手牌は9（2回目）-> 10（ツモ後）
    // 手牌が14以上ならツモ済みなのでスキップ
    if (hand.length >= 14) {
      return { success: true };
    }

    if (this.wall.length === 0) {
      console.log(`[drawForTurn] ⚠️ WALL EXHAUSTED: Wall has no more tiles, game ending in draw`);
      this.finished = true;
      return { 
        success: true, 
        finished: true, 
        message: 'Draw - no more tiles',
        isDraw: true,
        tileCount: hand.length + (this.players[this.playerIds[0]].melds.reduce((s, m) => s + m.length, 0) + 
                                  this.players[this.playerIds[1]].melds.reduce((s, m) => s + m.length, 0))
      };
    }

    console.log(`[wall] before draw: userId=${userId}, wall.length=${this.wall.length}`);
    const tile = this.wall.pop();
    hand.push(tile);
    this.players[userId].drawnTile = tile;
    this.players[userId].drawnTileIndex = hand.length - 1;
    console.log(`[wall] after draw: userId=${userId}, wall.length=${this.wall.length}`);

    // リーチ中の場合、和了できるかチェックし、できなければ自動ツモ切り
    if (this.players[userId].riichi) {
      const canWin = this.isWinningHand(userId);
      if (!canWin) {
        // 和了できない場合は自動的にツモ切り
        console.log(`[drawForTurn] Player ${userId} is in riichi but cannot win, auto-discarding drawn tile`);
        const drawnTile = this.players[userId].drawnTile;
        const tileId = `${drawnTile.suit}_${drawnTile.number}`;
        const result = this.handleDiscard(userId, tileId);
        // ディスカード後に流局している場合はそれを反映させる
        if (result.finished) {
          return result;
        }
        return { success: true, autoDiscard: true, discardResult: result };
      }
    }

    return { success: true };
  }
  
  getPlayerHand(userId) {
    if (!this.players[userId]) {
      console.error(`[getPlayerHand] Player ${userId} not found in game logic`);
      return [];
    }
    
    const hand = this.players[userId].hand;
    const drawnTile = this.players[userId].drawnTile;
    
    console.log(`[getPlayerHand] userId=${userId}, hand.length=${hand.length}, drawnTile=${drawnTile ? drawnTile.toString() : 'null'}`);
    
    // Sort tiles in standard order: 萬子 → 筒子 → 索子 → 字牌
    const sorted = hand.slice().sort((a, b) => this.compareTiles(a, b));
    
    // Find the drawn tile index in sorted array using object reference
    let drawnTileIndex = -1;
    if (drawnTile) {
      // ソート前の手牌でのオブジェクト参照を見つける
      const drawnTileInHand = hand.find(t => t === drawnTile);
      if (drawnTileInHand) {
        // ソート後の配列で、同じオブジェクト参照を持つ牌を探す
        drawnTileIndex = sorted.findIndex(t => t === drawnTileInHand);
      }
      console.log(`[getPlayerHand] drawnTileIndex=${drawnTileIndex}`);
    }
    
    // Store the corrected drawn tile index for this user
    this.players[userId].drawnTileIndex = drawnTileIndex;
    
    return sorted.map((tile) => ({
      suit: tile.suit,
      number: tile.number,
      display: tile.toString(),
    }));
  }
  
  getPlayerMelds(userId) {
    if (!this.players[userId]) {
      console.error(`[getPlayerMelds] Player ${userId} not found in game logic`);
      return [];
    }
    return this.players[userId].melds.map((meld) =>
      meld.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
      }))
    );
  }
  
  getDrawnTileIndex(userId) {
    if (!this.players[userId]) {
      console.error(`[getDrawnTileIndex] Player ${userId} not found in game logic`);
      return -1;
    }
    return this.players[userId].drawnTileIndex;
  }

  getPendingPungFor() {
    return this.pendingPungFor;
  }

  getRonPossibleFor() {
    return this.ronPossibleFor;
  }
  
  getWallCount() {
    return this.wall.length;
  }
  
  getDiscards() {
    const discards = {};
    const riichiDiscards = {};
    this.playerIds.forEach((playerId) => {
      discards[playerId] = this.players[playerId].discards.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
      }));
      riichiDiscards[playerId] = this.players[playerId].riichiDiscardIndex;
    });
    return { discards, riichiDiscards };
  }
  
  getPlayerScore(userId) {
    return this.players[userId].score;
  }
  
  checkAllTenpai(playerId) {
    const player = this.players[playerId];
    const hand = player.hand;
    const melds = player.melds;

    console.log(`\n[checkAllTenpai] ============================================`);
    console.log(`[checkAllTenpai] Player: ${playerId}`);
    console.log(`[checkAllTenpai] Hand size: ${hand.length}`);
    console.log(`[checkAllTenpai] Hand: ${hand.map(t => t.toString()).join(' ')}`);
    console.log(`[checkAllTenpai] Melds: ${melds.length} (${melds.map(m => m.map(t => t.toString()).join('')).join(', ')})`);

    const results = {};
    for (let tileIndex = 0; tileIndex < hand.length; tileIndex++) {
      const result = this.checkTenpaiAfterDiscard(playerId, tileIndex);
      results[tileIndex] = result;
    }

    console.log(`[checkAllTenpai] Results summary:`);
    Object.entries(results).forEach(([idx, r]) => {
      const tile = hand[idx];
      console.log(`  [${idx}] ${tile.toString()}: tenpai=${r.isTenpai}, waitingTiles=${r.winningTiles.length}`);
    });
    console.log(`[checkAllTenpai] ============================================\n`);

    return results;
  }
  
  checkTenpaiAfterDiscard(playerId, tileIndex) {
    // Simulate discarding a tile and check if it results in tenpai (one tile away from win)
    const hand = this.players[playerId].hand.slice(); // 重要: sliceで複製を作成
    const melds = this.players[playerId].melds;
    
    console.log(`[checkTenpaiAfterDiscard] Player: ${playerId}, tileIndex: ${tileIndex}`);
    console.log(`[checkTenpaiAfterDiscard] Hand before discard (${hand.length} tiles):`, hand.map(t => t.toString()).join(' '));
    console.log(`[checkTenpaiAfterDiscard] Melds (${melds.length}):`, melds.map(m => m.map(t => t.toString()).join('')).join(', '));
    
    if (tileIndex < 0 || tileIndex >= hand.length) {
      console.log(`[checkTenpaiAfterDiscard] Invalid tile index: ${tileIndex}`);
      return { isTenpai: false, winningTiles: [] };
    }
    
    // Remove the tile to simulate discard
    const discardedTile = hand[tileIndex];
    hand.splice(tileIndex, 1);
    
    console.log(`[checkTenpaiAfterDiscard] Discarded: ${discardedTile.toString()}`);
    console.log(`[checkTenpaiAfterDiscard] Hand after discard (${hand.length} tiles):`, hand.map(t => t.toString()).join(' '));
    
    // After discarding, we should have 13 tiles in hand (or less if melds exist)
    // Total tiles should be: hand.length + (melds.length * 3) = 13
    const totalTilesAfterDiscard = hand.length + (melds.length * 3);
    
    console.log(`[checkTenpaiAfterDiscard] Total tiles after discard: ${hand.length} + ${melds.length * 3} = ${totalTilesAfterDiscard}`);
    
    // For tenpai, we need exactly 13 tiles (waiting for 1 more to make 14)
    if (totalTilesAfterDiscard !== 13) {
      console.log(`[checkTenpaiAfterDiscard] Not tenpai: wrong tile count (need 13, have ${totalTilesAfterDiscard})`);
      return { isTenpai: false, winningTiles: [] };
    }
    
    // Get winning tiles for this hand
    const winningTiles = this.getWinningTiles(hand, melds);
    
    console.log(`[checkTenpaiAfterDiscard] Found ${winningTiles.length} winning tiles:`, winningTiles.map(t => t.display).join(', '));
    
    return {
      isTenpai: winningTiles.length > 0,
      winningTiles: winningTiles
    };
  }

  getWinningTiles(hand, melds) {
    // Find all tiles from the wall that would make this hand a winning hand
    const winningTiles = [];
    const tileCountInHand = {};
    
    // Count tiles currently in hand
    hand.forEach((tile) => {
      const key = `${tile.suit}_${tile.number}`;
      tileCountInHand[key] = (tileCountInHand[key] || 0) + 1;
    });
    
    // Count tiles in melds
    melds.forEach((meld) => {
      meld.forEach((tile) => {
        const key = `${tile.suit}_${tile.number}`;
        tileCountInHand[key] = (tileCountInHand[key] || 0) + 1;
      });
    });
    
    // Try each possible tile type
    const suits = ['man', 'pin', 'sou', 'honor'];
    const numbers = { 'man': 9, 'pin': 9, 'sou': 9, 'honor': 7 };
    
    suits.forEach((suit) => {
      for (let i = 1; i <= numbers[suit]; i++) {
        const key = `${suit}_${i}`;
        const tileCount = tileCountInHand[key] || 0;
        
        // Only 4 copies of each tile exist
        if (tileCount < 4) {
          const testTile = new Tile(suit, i);
          const testHand = hand.concat([testTile]);
          
          let isWinningTile = false;
          
          // Check regular hand structure first
          const isRegular = this.checkValidMeldStructure(testHand);
          if (isRegular) {
            isWinningTile = true;
          } else if (melds.length === 0) {
            // Check special hand types only if regular structure fails (and no melds)
            const isChii = this.isChiitoitsu(testHand);
            const isKoku = this.isKokushi(testHand);
            if (isChii || isKoku) {
              isWinningTile = true;
            }
          }
          
          // Add to winning tiles if not already present
          if (isWinningTile && !winningTiles.some(t => t.suit === suit && t.number === i)) {
            winningTiles.push({
              suit: suit,
              number: i,
              display: testTile.toString(),
              count: 4 - tileCount
            });
          }
        }
      }
    });
    
    return winningTiles;
  }

  /**
   * 和了の判定と点数計算
   * @param {string} playerId - 和了したプレイヤーのID
   * @param {Tile} winningTile - 和了牌
   * @param {boolean} isTsumo - ツモかどうか
   * @returns {Object} 点数計算結果
   */
  calculateWinScore(playerId, winningTile, isTsumo) {
    const player = this.players[playerId];
    
    console.log(`[calculateWinScore] Player ${playerId}:`);
    console.log(`  - riichi: ${player.riichi}`);
    console.log(`  - menzen: ${player.melds.length === 0}`);
    console.log(`  - isTsumo: ${isTsumo}`);
    
    // 和了時の手牌（和了牌を含む）
    const fullHand = [...player.hand];
    if (!fullHand.some(t => t.equals(winningTile))) {
      fullHand.push(winningTile);
    }
    
    // 点数計算
    const scoreResult = this.scoreCalculator.calculateScore({
      hand: fullHand,
      melds: player.melds,
      winningTile: winningTile,
      isTsumo: isTsumo,
      isRon: !isTsumo,
      riichi: player.riichi, // リーチ情報を渡す
      menzen: player.melds.length === 0, // 門前かどうか
      roundWind: this.roundWindNumber,
      seatWind: this.seatWinds[playerId]
    });
    
    console.log('[calculateWinScore] 点数計算結果:', scoreResult);
    
    return scoreResult;
  }

  getWinner() {
    return this.winner;
  }

  getTenpaiStatus() {
    const status = {};
    this.playerIds.forEach((playerId) => {
      const player = this.players[playerId];
      if (!player) {
        status[playerId] = false;
        return;
      }
      const waitingTiles = TenpaiChecker.getWinningTiles(player.hand, player.melds);
      status[playerId] = waitingTiles.length > 0;
    });
    return status;
  }

  /**
   * リーチ宣言
   * @param {string} playerId - プレイヤーID
   * @param {number} discardIndex - 捨てる牌のインデックス
   * @returns {Object} 結果
   */
  declareRiichi(playerId, tileIdInput) {
    const player = this.players[playerId];
    
    console.log(`\n🔴 [declareRiichi] ========================================`);
    console.log(`🔴 [declareRiichi] Player: ${playerId}, tileId: ${tileIdInput}`);
    console.log(`🔴 [declareRiichi] Hand (${player.hand.length} tiles):`, player.hand.map((t, i) => `[${i}]${t.toString()}`).join(' '));
    console.log(`🔴 [declareRiichi] Melds: ${player.melds.length}`);
    console.log(`🔴 [declareRiichi] Already riichi: ${player.riichi}`);
    console.log(`🔴 [declareRiichi] Score: ${player.score}`);
    
    // 既にリーチしている
    if (player.riichi) {
      return { success: false, message: '既にリーチしています' };
    }
    
    // 持ち点が1000点未満
    if (player.score < 1000) {
      return { success: false, message: '持ち点が1000点未満のためリーチできません（現在' + player.score + '点）' };
    }
    
    // 門前でない（副露している）
    if (player.melds.length > 0) {
      return { success: false, message: '副露しているためリーチできません（メルド' + player.melds.length + '個）' };
    }
    
    // 牌IDから手牌を探す
    // tileIdInput は "suit_number" 形式（例："man_3" や "pin_5"）
    const hand = player.hand;
    const [suit, numberStr] = tileIdInput.split('_');
    const number = parseInt(numberStr);
    
    // 手牌の中から該当する牌を探す
    const discardIndex = hand.findIndex(
      t => t.suit === suit && t.number === number
    );
    
    if (discardIndex < 0) {
      return { success: false, message: '指定された牌が手牌に見つかりません: ' + tileIdInput };
    }
    
    const discardedTile = hand[discardIndex];
    console.log(`🔴 [declareRiichi] Found target tile at index ${discardIndex}: ${discardedTile.toString()}`);
    
    // 聴牌チェック（捨牌後に13枚になった状態で）
    const testHand = hand.slice(); // 複製を作成
    testHand.splice(discardIndex, 1);
    
    console.log(`🔴 [declareRiichi] Discarded: ${discardedTile.toString()}`);
    console.log(`🔴 [declareRiichi] Hand after discard (${testHand.length} tiles):`, testHand.map(t => t.toString()).join(' '));
    
    // 待ち牌をチェック
    const waitingTiles = this.getWinningTiles(testHand, player.melds);
    console.log(`🔴 [declareRiichi] Found ${waitingTiles.length} waiting tiles`);
    
    if (waitingTiles.length > 0) {
      console.log(`[declareRiichi] Waiting tiles: ${waitingTiles.map(t => t.display).join(', ')}`);
    }
    
    if (waitingTiles.length === 0) {
      console.log(`🔴 [declareRiichi] ⚠️  VALIDATION FAILED: 待ち牌なし - リーチを却下`);
      return { 
        success: false, 
        message: '聴牌していないためリーチできません（待ち牌が見つかりません）'
      };
    }
    
    // ディスカウント前に牌を捨てる
    // handleDiscard を呼ぶ前に riichi フラグを立てることで、
    // handleDiscard 内の自動捨て牌ロジックが発動しないようにする
    console.log(`🔴 [declareRiichi] Discarding tile BEFORE setting riichi flag`);
    const tile = hand[discardIndex];
    hand.splice(discardIndex, 1);
    player.discards.push(tile);
    player.drawnTileIndex = -1;
    player.drawnTile = null;
    
    console.log(`🔴 [declareRiichi] Successfully discarded: ${tile.toString()}`);

    // リーチ成立（捨て牌後）
    player.riichi = true;
    player.riichiTurn = this.getCurrentTurn();
    player.riichiDiscardIndex = player.discards.length - 1; // リーチ宣言時の捨て牌インデックスを記録
    player.score -= 1000; // 1000点を供託
    this.riichiDeposits += 1000;
    
    console.log(`[Riichi] ${playerId} declared riichi. Deposit: ${this.riichiDeposits}`);
    console.log(`[Riichi] New score: ${player.score}`);
    console.log(`[Riichi] Riichi discard index: ${player.riichiDiscardIndex}`);
    
    // ゲーム状態の更新
    const otherPlayerId = this.getOtherPlayerId(playerId);
    this.lastDiscard = tile;
    this.lastDiscardBy = playerId;
    
    // Check if Ron is possible for the other player
    if (otherPlayerId && this.canWinWithTile(otherPlayerId, tile, true)) {
      this.ronPossibleFor = otherPlayerId;
      this.ronTile = tile;
      // Move to next turn and return (other player can now claim Ron)
      this.nextTurn();
      console.log(`🔴 [declareRiichi] Ron possible for opponent`);
      return {
        success: true,
        message: `リーチ！（待ち: ${waitingTiles.map(t => t.display).join(', ')}）`,
        deposit: 1000,
        waitingTiles: waitingTiles,
        riichi: true
      };
    }
    
    // Check if the other player can actually pung
    // リーチ中のプレイヤーは副露できないのでチェックする
    const otherPlayer = this.players[otherPlayerId];
    if (otherPlayerId && !otherPlayer?.riichi && this.canPlayerPung(otherPlayerId, tile)) {
      // Set pending pung - other player must decide to pung or draw
      this.pendingPungFor = otherPlayerId;
      console.log(`🔴 [declareRiichi] Pung possible for opponent`);
    } else {
      // Auto-draw for the other player since they can't pung
      this.pendingPungFor = null;
    }
    
    // Move to next turn
    this.nextTurn();
    
    // Auto-draw if no pung is possible
    if (!this.pendingPungFor && otherPlayerId) {
      const drawResult = this.drawForTurn(otherPlayerId);
      if (drawResult?.finished) {
        console.log(`🔴 [declareRiichi] Draw result finished, returning with isDraw=${drawResult.isDraw}`);
        return {
          success: true,
          finished: true,
          message: drawResult.message,
          isDraw: drawResult.isDraw === true,
          deposit: 1000,
          waitingTiles: waitingTiles,
          riichi: true,
        };
      }
    }

    console.log(`🔴 [declareRiichi] ========================================\n`);
    
    return {
      success: true,
      message: `リーチ！（待ち: ${waitingTiles.map(t => t.display).join(', ')}）`,
      deposit: 1000,
      waitingTiles: waitingTiles,
      riichi: true
    };
  }

  /**
   * 特定プレイヤーがリーチ状態かを取得
   */
  isPlayerRiichi(playerId) {
    return this.players[playerId]?.riichi || false;
  }

  /**
   * 最後に捨てられた牌を取得
   */
  getLastDiscard() {
    return this.lastDiscard;
  }

  /**
   * リーチ状態を取得
   */
  getRiichiStatus() {
    const status = {};
    this.playerIds.forEach(id => {
      status[id] = this.players[id].riichi;
    });
    return status;
  }

  /**
   * 供託点を取得
   */
  getRiichiDeposits() {
    return this.riichiDeposits;
  }

  /**
   * プレイヤーの持ち点を取得
   */
  getPlayerScore(playerId) {
    return this.players[playerId]?.score || 0;
  }

  /**
   * 全プレイヤーの持ち点を取得
   */
  getScores() {
    const scores = {};
    this.playerIds.forEach(id => {
      scores[id] = this.players[id].score;
    });
    return scores;
  }

  /**
   * ドラ情報を取得
   */
  getDora() {
    return {
      indicators: this.doraIndicators.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
      })),
      tiles: this.doraTiles.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
      })),
    };
  }

  /**
   * 嶺上牌情報を取得（かん牌スペース）
   */
  getKanningWall() {
    return {
      remaining: this.kanningWall.length, // 残りスペース数
      tiles: this.kanningWall.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
      })),
    };
  }
}

module.exports = MahjongLogic;