const Tile = require('./Tile');
const ScoreCalculator = require('./ScoreCalculator');
const TenpaiChecker = require('./TenpaiChecker');
const settings = require('../settings');

class MahjongLogic {
  constructor(playerIds, playerScores = {}, isPlayerInNoMeldMode, options = {}) {
    this.playerIds = playerIds; // [player1Id, player2Id]
    this.players = {};
    const dealerIndex = Number.isFinite(options.dealerIndex)
      ? Math.min(Math.max(0, Math.floor(options.dealerIndex)), Math.max(playerIds.length - 1, 0))
      : 0;
    this.currentTurnIndex = dealerIndex;
    this.dealerIndex = dealerIndex;
    this.turnNumber = 0; // ゲーム全体のターン番号（一発判定用）
    this.firstGoAroundIntact = true; // 最初の巡目が途切れていないか（副露が無い）- 天和/地和/人和/ダブルリーチ判定用
    this.roundWindNumber = Number.isFinite(options.roundWindNumber) ? options.roundWindNumber : 1;
    this.seatWinds = options.seatWinds || {};
    this.wall = [];
    this.doraIndicators = []; // ドラ表示牌
    this.doraTiles = []; // ドラ（表示牌の次の牌）
    this.uraDoraIndicators = []; // 裏ドラ表示牌
    this.uraDoraTiles = []; // 裏ドラ（裏ドラ表示牌の次の牌）
    this.kanningWall = []; // 嶺上牌（かん牌スペース：3枚）
    this.kanningWallSupply = []; // かん牌補充用（3枚：最大3回のカン補充）
    this.candidateDoraIndicators = []; // ドラ表示牌の候補（4枚：カン最大4回分）
    this.candidateDoraTiles = []; // ドラタイルの候補（4枚）
    this.candidateUraDoraIndicators = []; // 裏ドラ表示牌の候補（4枚）
    this.candidateUraDoraTiles = []; // 裏ドラタイルの候補（4枚）
    this.winner = null;
    this.finished = false;
    this.lastDiscard = null;
    this.lastDiscardBy = null;
    this.lastDiscardInfo = null; // { userId, isTsumogiri } - 最後の打牌がツモ切りかどうか
    this.pendingPungFor = null;
    this.ronPossibleFor = null; // Track if Ron is possible for a player
    this.ronTile = null; // The tile that can be claimed for Ron
    this.aotenjou = options.aotenjou || false; // 青天井モード
    this.kiriagemangan = options.kiriagemangan !== false; // 切り上げ満貫（デフォルト有効）
    this.ronMultiplier = [1, 1.5, 2].includes(options.ronMultiplier) ? options.ronMultiplier : 1; // ロン倍率
    this.scoreCalculator = new ScoreCalculator({ aotenjou: this.aotenjou, kiriagemangan: this.kiriagemangan });
    this.riichiDeposits = 0; // 供託点（リーチ棒の合計）
    this.riichiDepositRequired = options.riichiDepositRequired !== false; // リーチ時に供託点を必要とするか（デフォルト: true）
    this.isPlayerInNoMeldMode = isPlayerInNoMeldMode || ((userId) => false); // Callback to check if player is in no-meld mode
    this.useRedDora = options.useRedDora || false; // 赤ドラを使用するか
    this.transparentHand = options.transparentHand || false; // 透明手牌ルール
    const rawWallTiles = Number(options.wallTiles);
    // wallTiles: 配牌を除いた、ゲーム進行中にツモできる壁牌の枚数
    // 計算: 全牌136枚 - 配牌27枚 - 予約牌22枚 = 87枚
    this.wallTiles = Number.isFinite(rawWallTiles)
      ? Math.min(settings.wall.maxTiles, Math.max(settings.wall.minTiles, Math.floor(rawWallTiles)))
      : settings.wall.maxTiles;

    // Tsumo luck settings: userId -> luck level (0=none, 1=light, 2=heavy)
    this.tsumoLuckSettings = options.tsumoLuckSettings || {};

    // Initialize players
    playerIds.forEach((id) => {
      this.players[id] = {
        hand: [],
        melds: [], // completed sets
        concealedMeldIndices: new Set(), // Indices of concealed kans (暗槓) in melds array
        daiminkanMeldIndices: new Set(), // Indices of daiminkan (大明槓) in melds array
        discards: [],
        discardFlags: [], // ツモ切り/手出し情報 { isTsumogiri: boolean }[]
        score: playerScores[id] || settings.game.defaultInitialScore, // 持ち点
        drawnTile: null, // Last tile drawn from wall
        drawnTileIndex: -1, // Index of drawn tile in hand
        drawnFromKanningWall: false, // 嶺上牌から引いたか（嶺上開花用）
        riichi: false, // リーチ状態
        riichiTurn: -1, // リーチした巡目
        ippatsuValid: false, // 一発有効フラグ（鳴きで消える）
        riichiDiscardIndex: -1, // リーチ宣言時の捨て牌インデックス
        tempFuriten: false, // 同巡内フリテン（ロンを見逃した巡のみ）
        riichiPassFuriten: false, // リーチ後ロン見逃しフリテン（永続）
        isDoubleRiichi: false, // ダブル立直かどうか
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

    // 赤ドラの適用：各色の5を赤ドラに置き換え
    // ピンズ2枚、マンズ1枚、ソウズ1枚
    if (this.useRedDora) {
      this.applyRedDora();
    }

    // 透明手牌ルール: 壁牌生成直後に各種牌4枚のうち3枚を透明として確定する
    if (this.transparentHand) {
      this.applyTransparentHand();
    }

    if (this.wallTiles < this.wall.length) {
      this.wall = this.wall.slice(0, this.wallTiles);
    }

    console.log(`[wall] initialize: wallTiles=${this.wallTiles}, wall.length=${this.wall.length}`);
  }

  dealTiles() {
    // Deal tiles to each player
    const tilesPerPlayer = settings.game.tilesPerPlayer;
    for (let i = 0; i < tilesPerPlayer; i++) {
      this.playerIds.forEach((playerId) => {
        if (this.wall.length > 0) {
          const tile = this.wall.pop();
          this.players[playerId].hand.push(tile);
        }
      });
    }

    // 配牌運の適用：ツモ運レベルに応じて配牌を複数回試行し、最良の手牌を選ぶ
    this.playerIds.forEach((playerId) => {
      this.applyHaipaiLuck(playerId);
    });

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

    // Set up dora indicator and dora tile candidates
    // 壁の最後に予約する牌（合計22枚）：
    // - かん牌スペース（嶺上牌）：3枚
    // - かん牌補充用：3枚（最大3回のカン補充）
    // - ドラ表示牌候補：4枚（最大4回のカン増加）
    // - ドラタイル候補：4枚
    // - 裏ドラ表示牌候補：4枚
    // - 裏ドラタイル候補：4枚
    if (this.wall.length > settings.game.reservedTiles) {
      // かん牌スペース（嶺上牌）（壁の最後から）
      for (let i = 0; i < settings.wall.kanningWallSize && this.wall.length > 0; i++) {
        this.kanningWall.push(this.wall[this.wall.length - 1 - i]);
      }

      // かん牌補充用（壁の最後から）
      for (let i = 0; i < settings.wall.kanningWallSupplySize; i++) {
        const idx = this.wall.length - (settings.wall.kanningWallSize + 1) - i;
        if (idx >= 0) {
          this.kanningWallSupply.push(this.wall[idx]);
        }
      }

      // ドラ表示牌の候補（壁の最後から）
      for (let i = 0; i < settings.wall.candidateCount; i++) {
        const idx = this.wall.length - (settings.wall.kanningWallSize + settings.wall.kanningWallSupplySize + 1) - i;
        if (idx >= 0) {
          this.candidateDoraIndicators.push(this.wall[idx]);
        }
      }

      // ドラタイル候補（壁の最後から）
      const doraTileOffset = settings.wall.kanningWallSize + settings.wall.kanningWallSupplySize + settings.wall.candidateCount + 1;
      for (let i = 0; i < settings.wall.candidateCount; i++) {
        const idx = this.wall.length - doraTileOffset - i;
        if (idx >= 0) {
          this.candidateDoraTiles.push(this.wall[idx]);
        }
      }

      // 裏ドラ表示牌候補（壁の最後から）
      const uraDoraIndicatorOffset = doraTileOffset + settings.wall.candidateCount;
      for (let i = 0; i < settings.wall.candidateCount; i++) {
        const idx = this.wall.length - uraDoraIndicatorOffset - i;
        if (idx >= 0) {
          this.candidateUraDoraIndicators.push(this.wall[idx]);
        }
      }

      // 裏ドラタイル候補（壁の最後から）
      const uraDoraOffset = uraDoraIndicatorOffset + settings.wall.candidateCount;
      for (let i = 0; i < settings.wall.candidateCount; i++) {
        const idx = this.wall.length - uraDoraOffset - i;
        if (idx >= 0) {
          this.candidateUraDoraTiles.push(this.wall[idx]);
        }
      }

      // ドラ表示牌とドラタイルの最初の1組を現在のドラとして設定
      if (this.candidateDoraIndicators.length > 0) {
        const indicator = this.candidateDoraIndicators[0];
        this.doraIndicators.push(indicator);
        // ドラ表示牌の次の牌を計算してドラとして設定
        const nextTile = this.getNextTile(indicator);
        this.doraTiles.push(nextTile);
      }

      // 裏ドラ表示牌と裏ドラタイルの最初の1組を現在の裏ドラとして設定
      // （リーチで和了したときに表示される）
      if (this.candidateUraDoraIndicators.length > 0) {
        const indicator = this.candidateUraDoraIndicators[0];
        this.uraDoraIndicators.push(indicator);
        // 裏ドラ表示牌の次の牌を計算して裏ドラとして設定
        const nextTile = this.getNextTile(indicator);
        this.uraDoraTiles.push(nextTile);
      }

      console.log(`[dealTiles] Kanning wall (嶺上牌): ${this.kanningWall.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Kanning wall supply (かん牌補充用): ${this.kanningWallSupply.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Dora indicator candidates (${this.candidateDoraIndicators.length}): ${this.candidateDoraIndicators.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Dora tile candidates (${this.candidateDoraTiles.length}): ${this.candidateDoraTiles.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Ura dora indicator candidates (${this.candidateUraDoraIndicators.length}): ${this.candidateUraDoraIndicators.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Ura dora tile candidates (${this.candidateUraDoraTiles.length}): ${this.candidateUraDoraTiles.map(t => t.toString()).join(', ')}`);
      console.log(`[dealTiles] Current dora indicator: ${this.doraIndicators[0]?.toString()}`);
      console.log(`[dealTiles] Current dora tile: ${this.doraTiles[0]?.toString()}`);
    } else {
      console.log(`[dealTiles] ⚠️ Not enough tiles in wall (${this.wall.length}) to set up dora candidates`);
    }
  }

  /**
   * 表示牌の次の牌を取得
   * @param {Tile} tile - 表示牌
   * @returns {Tile} 次の牌
   */
  getNextTile(tile) {
    return tile.getNextTile();
  }

  shuffleWall() {
    for (let i = this.wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
    }
  }

  /**
   * 透明手牌ルール適用: 各種牌4枚のうち3枚を透明としてマーク（壁牌シャッフル後・ゲーム開始前に呼ぶ）
   * - 赤ドラは必ず透明
   * - 同種(suit+number)ごとに、赤ドラを除いて残り3枚に達するまで非赤ドラにも透明フラグを付与
   * - 壁牌はシャッフル済みなので出現順序はランダム
   */
  applyTransparentHand() {
    // suit+number でグループ化（赤ドラと通常牌を同一種として扱う）
    const groups = {};
    this.wall.forEach((tile) => {
      const key = `${tile.suit}-${tile.number}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tile);
    });

    for (const tiles of Object.values(groups)) {
      // 赤ドラは必ず透明
      tiles.forEach((tile) => {
        if (tile.isRed) tile.isTransparent = true;
      });

      // 赤ドラ以外で「3枚透明」に達するまで非赤ドラに透明フラグを付与
      const redTransparentCount = tiles.filter((t) => t.isRed).length;
      const stillNeeded = Math.max(0, 3 - redTransparentCount);
      let marked = 0;
      tiles.forEach((tile) => {
        if (!tile.isRed) {
          tile.isTransparent = marked < stillNeeded;
          marked++;
        }
      });
    }

    console.log('[applyTransparentHand] Transparent flags applied to wall tiles');
  }

  /**
   * 赤ドラの適用：壁牌の各色5を赤ドラに置き換え
   * ピンズ2枚、マンズ1枚、ソウズ1枚
   */
  applyRedDora() {
    const redDoraConfig = {
      pin: 2, // ピンズ：赤5を2枚
      man: 1, // マンズ：赤5を1枚
      sou: 1, // ソウズ：赤5を1枚
    };

    for (const [suit, count] of Object.entries(redDoraConfig)) {
      let replaced = 0;
      for (let i = 0; i < this.wall.length && replaced < count; i++) {
        if (this.wall[i].suit === suit && this.wall[i].number === 5 && !this.wall[i].isRed) {
          this.wall[i] = new Tile(suit, 5, true);
          replaced++;
        }
      }
      console.log(`[applyRedDora] ${suit}: replaced ${replaced}/${count} tiles with red 5`);
    }
  }

  /**
   * 配牌運の試行回数を取得
   * @param {number} luckLevel ツモ運レベル (0-3)
   * @returns {number} 試行回数
   */
  getHaipaiAttempts(luckLevel) {
    const attempts = settings.tsumoLuck.haipaiAttempts;
    return attempts[luckLevel] || 1;
  }

  /**
   * 配牌運を適用：ツモ運レベルに応じて配牌を複数回試行し、最良の手牌を選ぶ
   * 壁と手牌を合わせたプールから毎回シャッフルして13枚取り、最良を選択する
   * （牌の重複・消失が起きないよう、プールベースで管理）
   * @param {string} playerId プレイヤーID
   */
  applyHaipaiLuck(playerId) {
    const luckLevel = this.tsumoLuckSettings[playerId] || 0;
    const attempts = this.getHaipaiAttempts(luckLevel);

    if (attempts <= 1) {
      return; // 試行1回以下なら何もしない
    }

    const currentHand = this.players[playerId].hand;
    let bestHand = currentHand; // オブジェクト参照のまま保持
    let bestScore = this.evaluateHaipaiQuality(currentHand);

    console.log(`[haipaiLuck] Player ${playerId} luck level ${luckLevel}: trying ${attempts} hands (initial score: ${bestScore})`);

    // 手牌 + 壁のプールを作成（他プレイヤーの牌は含まない）
    const availablePool = [...currentHand, ...this.wall];

    // 残りの試行回数分、プールをシャッフルして評価
    for (let attempt = 1; attempt < attempts; attempt++) {
      // プールをシャッフル
      for (let i = availablePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePool[i], availablePool[j]] = [availablePool[j], availablePool[i]];
      }

      // プールの先頭13枚を候補手牌として評価
      const candidateHand = availablePool.slice(0, 13);
      const candidateScore = this.evaluateHaipaiQuality(candidateHand);

      if (candidateScore > bestScore) {
        bestHand = candidateHand;
        bestScore = candidateScore;
        console.log(`[haipaiLuck] Attempt ${attempt + 1}: score ${candidateScore} → new best!`);
      }
    }

    // 最良の手牌をセットし、壁を再構築（プールからbestHandを除いた残り）
    const bestHandSet = new Set(bestHand);
    this.players[playerId].hand = bestHand;
    this.wall = availablePool.filter(tile => !bestHandSet.has(tile));

    // 壁を再シャッフル（次のプレイヤーのためにランダム性を保証）
    this.shuffleWall();

    console.log(`[haipaiLuck] Player ${playerId} final hand score: ${bestScore}`);
  }

  /**
   * 配牌の品質を評価する（スコアが高いほど良い手牌）
   * 対子、面子候補、連続牌、字牌の価値などを総合的に評価
   * @param {Array<Tile>} hand 評価対象の手牌
   * @returns {number} 品質スコア
   */
  evaluateHaipaiQuality(hand) {
    if (!hand || hand.length === 0) return 0;

    let score = 0;

    // 牌の種類ごとにカウント
    const tileCounts = {}; // "suit-number" -> count
    hand.forEach(tile => {
      const key = `${tile.suit}-${tile.number}`;
      tileCounts[key] = (tileCounts[key] || 0) + 1;
    });

    // === 対子・刻子の評価 ===
    for (const [key, count] of Object.entries(tileCounts)) {
      if (count >= 3) {
        score += 10; // 刻子（暗刻）は非常に価値が高い
      } else if (count >= 2) {
        score += 5;  // 対子（雀頭候補や碰候補）
      }
    }

    // === 順子候補の評価（連続牌・間隔1の牌） ===
    for (const suit of ['man', 'pin', 'sou']) {
      const numbers = hand
        .filter(t => t.suit === suit)
        .map(t => t.number)
        .sort((a, b) => a - b);

      const uniqueNumbers = [...new Set(numbers)];

      for (let i = 0; i < uniqueNumbers.length; i++) {
        for (let j = i + 1; j < uniqueNumbers.length; j++) {
          const diff = uniqueNumbers[j] - uniqueNumbers[i];
          if (diff === 1) {
            score += 3; // 連続牌（e.g., 3-4）→ 両面待ち候補
          } else if (diff === 2) {
            score += 1; // 間隔1（e.g., 3-5）→ 嵌張待ち候補
          } else {
            break; // 差が2以上なら以降のペアはチェック不要
          }
        }
      }

      // 完成順子のチェック（3連続の数字）
      for (let i = 0; i < uniqueNumbers.length - 2; i++) {
        if (uniqueNumbers[i + 1] === uniqueNumbers[i] + 1 &&
            uniqueNumbers[i + 2] === uniqueNumbers[i] + 2) {
          score += 4; // 完成順子ボーナス
        }
      }
    }

    // === 役牌の評価 ===
    hand.forEach(tile => {
      if (tile.suit === 'honor') {
        // 三元牌（白=5, 發=6, 中=7）は常に役牌
        if (tile.number >= 5) {
          score += 3;
        }
        // 場風・自風はコンテキスト依存だが、基本的に字牌は雀頭や刻子で有用
        else {
          score += 1;
        }
      }
    });

    // === 色の集中度（染め手ポテンシャル） ===
    const suitCounts = { man: 0, pin: 0, sou: 0 };
    hand.forEach(tile => {
      if (tile.suit !== 'honor') suitCounts[tile.suit]++;
    });
    const maxSuitCount = Math.max(suitCounts.man, suitCounts.pin, suitCounts.sou);
    const nonHonorCount = hand.filter(t => t.suit !== 'honor').length;
    if (nonHonorCount > 0) {
      const concentration = maxSuitCount / nonHonorCount;
      if (concentration >= 0.85) score += 6;      // 混一色ポテンシャル大
      else if (concentration >= 0.7) score += 3;   // 混一色ポテンシャル中
    }

    // === 孤立牌のペナルティ ===
    hand.forEach(tile => {
      if (tile.suit === 'honor') return; // 字牌は別評価済み
      const key = `${tile.suit}-${tile.number}`;
      // この牌が1枚だけで、かつ隣接牌もない場合はペナルティ
      if (tileCounts[key] === 1) {
        const hasNeighbor =
          (tile.number > 1 && (tileCounts[`${tile.suit}-${tile.number - 1}`] || 0) > 0) ||
          (tile.number < 9 && (tileCounts[`${tile.suit}-${tile.number + 1}`] || 0) > 0) ||
          (tile.number > 2 && (tileCounts[`${tile.suit}-${tile.number - 2}`] || 0) > 0) ||
          (tile.number < 8 && (tileCounts[`${tile.suit}-${tile.number + 2}`] || 0) > 0);
        if (!hasNeighbor) {
          score -= 2; // 完全孤立牌ペナルティ
        }
      }
    });

    // === 端牌ペナルティ（1, 9は使い道が少ない） ===
    hand.forEach(tile => {
      if (tile.suit !== 'honor' && (tile.number === 1 || tile.number === 9)) {
        // 既に対子以上なら端牌でも有用（チャンタ系）
        const key = `${tile.suit}-${tile.number}`;
        if (tileCounts[key] < 2) {
          score -= 1; // 孤立した端牌は軽いペナルティ
        }
      }
    });

    return score;
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

  /**
   * Check if player can make a daiminkan (大明槓) on the discarded tile
   * Requires 3 identical tiles in hand matching the discard
   */
  canPlayerDaiminkan(userId, discardedTile) {
    const hand = this.players[userId].hand;
    let matchCount = 0;

    for (let i = 0; i < hand.length; i++) {
      if (hand[i].equals(discardedTile)) {
        matchCount++;
        if (matchCount >= 3) return true;
      }
    }

    return false;
  }

  /**
   * Check if player can make a kan
   * Returns true if either concealed kan or added kan is possible
   */
  canPlayerKan(userId) {
    if (!this.players[userId]) return false;

    const hand = this.players[userId].hand;
    const melds = this.players[userId].melds;

    // Check for concealed kan (4 identical tiles in hand)
    const tileGroups = {};
    hand.forEach((tile) => {
      const key = `${tile.suit}-${tile.number}`;
      if (!tileGroups[key]) {
        tileGroups[key] = [];
      }
      tileGroups[key].push(tile);
    });

    for (const key in tileGroups) {
      if (tileGroups[key].length === 4) {
        return true;
      }
    }

    // Check for added kan (matching tile + existing pung, but NOT concealed kans)
    for (let i = 0; i < melds.length; i++) {
      const meld = melds[i];
      // Skip concealed kans - can't add to them
      if (this.players[userId].concealedMeldIndices.has(i)) continue;
      // Only check pungs (3 tiles)
      if (meld.length !== 3) continue;

      const meldTile = meld[0];
      for (const handTile of hand) {
        if (handTile.equals(meldTile)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate if player is in menzen (closed hand) state
   * 暗槓は面前扱いのため、concealedMeldはカウントしない
   */
  isPlayerMenzen(userId) {
    const player = this.players[userId];
    // Count only non-concealed melds
    const nonConcealedMeldCount = player.melds.length - player.concealedMeldIndices.size;
    return nonConcealedMeldCount === 0;
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
      // ポン・カン・ロンの選択待ち中は打牌を禁止（小牌防止）
      if (this.pendingPungFor === userId) {
        return { success: false, message: 'ポン/カンの選択待ち中は打牌できません。ツモ（スキップ）かポン/カンを選択してください。' };
      }
      if (this.ronPossibleFor === userId) {
        return { success: false, message: 'ロンの選択待ち中は打牌できません。ロンかツモ（スキップ）を選択してください。' };
      }
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
      const actualIndex = hand.findIndex(t => t === drawnTile);

      if (actualIndex < 0) {
        return { success: false, message: '引いた牌が見つかりません' };
      }

      const tile = hand.splice(actualIndex, 1)[0];
      this.players[userId].discards.push(tile);
      // リーチ中は常にツモ切り
      this.players[userId].discardFlags.push({ isTsumogiri: true });
      // Reset drawn tile after discard
      this.players[userId].drawnTileIndex = -1;
      this.players[userId].drawnTile = null;
      this.players[userId].drawnFromKanningWall = false;

      // リーチ後最初のツモで和了できなかった場合、一発を無効化
      if (player.ippatsuValid) {
        console.log(`[Ippatsu] 一発無効化: ${userId} (ツモで和了せず打牌)`);
        player.ippatsuValid = false;
      }

      // 最後の打牌情報を記録（ツモ切り/手出し判別用）
      this.lastDiscardInfo = { userId, isTsumogiri: true };

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

      // Check if the other player can actually pung or daiminkan
      // リーチ中のプレイヤーは副露できないのでチェックする
      // 鳴き無効モード中のプレイヤーは副露できないのでチェックする
      const otherPlayer = this.players[otherPlayerId];
      if (otherPlayerId && !otherPlayer?.riichi && !this.isPlayerInNoMeldMode(otherPlayerId) && this.canPlayerPung(otherPlayerId, tile)) {
        // Set pending pung - other player must decide to pung, daiminkan, or draw
        this.pendingPungFor = otherPlayerId;
      } else {
        // Auto-draw for the other player since they can't pung
        this.pendingPungFor = null;
      }

      // Move to next turn
      this.nextTurn();

      // 両方リーチ中の場合は自動ドローを呼び出し側に委譲（遅延付き自動進行のため）
      if (!this.pendingPungFor && otherPlayerId && this.areBothPlayersInRiichi()) {
        console.log(`[handleDiscard] Both players in riichi - deferring auto-draw to caller`);
        return { success: true, autoDiscard: true, bothRiichiAutoPlay: true };
      }

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
      // 赤ドラの場合は "suit_number_red" 形式（例："man_5_red"）
      const parts = tileIndexInput.split('_');
      const suit = parts[0];
      const number = parseInt(parts[1]);
      const isRed = parts[2] === 'red';

      // 手牌の中から該当する牌を探す（赤ドラの区別あり）
      actualIndex = hand.findIndex(
        t => t.suit === suit && t.number === number && (t.isRed || false) === isRed
      );
      // 赤ドラ指定で見つからない場合、赤を無視して検索（フォールバック）
      if (actualIndex < 0) {
        actualIndex = hand.findIndex(
          t => t.suit === suit && t.number === number
        );
      }

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
        t => t.suit === selectedInSortedOrder.suit && t.number === selectedInSortedOrder.number && (t.isRed || false) === (selectedInSortedOrder.isRed || false)
      );
      // isRedで見つからない場合のフォールバック
      if (actualIndex < 0) {
        actualIndex = hand.findIndex(
          t => t.suit === selectedInSortedOrder.suit && t.number === selectedInSortedOrder.number
        );
      }

      if (actualIndex < 0) {
        return { success: false, message: 'Tile not found in hand' };
      }
    } else {
      actualIndex = Math.floor(Math.random() * hand.length);
    }

    // ツモ切り判定: 捨てた牌がツモ牌と同一オブジェクトかどうか
    const isTsumogiri = (hand[actualIndex] === player.drawnTile);
    const tile = hand.splice(actualIndex, 1)[0];
    this.players[userId].discards.push(tile);
    this.players[userId].discardFlags.push({ isTsumogiri });
    // Reset drawn tile after discard
    this.players[userId].drawnTileIndex = -1;
    this.players[userId].drawnTile = null;
    this.players[userId].drawnFromKanningWall = false;

    // 最後の打牌情報を記録（ツモ切り/手出し判別用）
    this.lastDiscardInfo = { userId, isTsumogiri };

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

    // Check if the other player can actually pung or daiminkan
    // リーチ中のプレイヤーは副露できないのでチェックする
    const otherPlayer = this.players[otherPlayerId];
    if (otherPlayerId && !otherPlayer?.riichi && !this.isPlayerInNoMeldMode(otherPlayerId) && this.canPlayerPung(otherPlayerId, tile)) {
      // Set pending pung - other player must decide to pung, daiminkan, or draw
      this.pendingPungFor = otherPlayerId;
    } else {
      // Auto-draw for the other player since they can't pung
      this.pendingPungFor = null;
    }

    // Move to next turn
    this.nextTurn();

    // Auto-draw if no pung is possible
    if (!this.pendingPungFor && otherPlayerId) {
      // 相手がリーチ中の場合は自動ツモ切りを呼び出し側に委譲（0.5秒の間を置くため）
      const otherIsRiichi = this.players[otherPlayerId]?.riichi || false;
      const drawResult = this.drawForTurn(otherPlayerId, otherIsRiichi);
      if (drawResult?.riichiAutoDiscardPending) {
        return { success: true, riichiAutoDiscardPending: true };
      }
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

    // 副露が発生したので最初の巡目の途切れ日フラグを無効にする
    this.firstGoAroundIntact = false;

    // 鳴き（ポン）が入ったので全プレイヤーの一発を無効化
    this.cancelAllIppatsu();

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
    // Kan can be:
    // 1. Daiminkan (大明槓) - calling kan on opponent's discard with 3 matching tiles
    // 2. Concealed kan (暗槓) - 4 identical tiles from hand
    // 3. Added kan (加槓) - adding a 4th tile to an existing pung (碰)

    // Check basic conditions
    if (this.players[userId].riichi) {
      return { success: false, message: 'リーチ中はカンできません' };
    }

    if (this.isPlayerInNoMeldMode(userId)) {
      return { success: false, message: '鳴き無効モード中はカンできません' };
    }

    // Try daiminkan first (when opponent's discard is pending)
    if (this.pendingPungFor === userId && this.lastDiscard) {
      const daiminkanResult = this.attemptDaiminkan(userId);
      if (daiminkanResult.success) {
        return daiminkanResult;
      }
    }

    // Try concealed kan
    const concealedKanResult = this.attemptConcealedKan(userId);
    if (concealedKanResult.success) {
      return concealedKanResult;
    }

    // Try added kan
    const addedKanResult = this.attemptAddedKan(userId);
    if (addedKanResult.success) {
      return addedKanResult;
    }

    return { success: false, message: 'カンできる牌がありません' };
  }

  /**
   * Attempt to form a concealed kan (暗かん)
   * Requires 4 identical tiles in hand
   */
  attemptConcealedKan(userId) {
    const hand = this.players[userId].hand;
    const tileGroups = {};

    // Group tiles by suit and number
    hand.forEach((tile) => {
      const key = `${tile.suit}-${tile.number}`;
      if (!tileGroups[key]) {
        tileGroups[key] = [];
      }
      tileGroups[key].push(tile);
    });

    // Find a group with 4 identical tiles
    for (const key in tileGroups) {
      if (tileGroups[key].length === 4) {
        // Found 4 identical tiles - form a concealed kan
        const kanTiles = tileGroups[key];

        // Remove the 4 tiles from hand
        for (const tile of kanTiles) {
          const index = hand.indexOf(tile);
          if (index >= 0) {
            hand.splice(index, 1);
          }
        }

        // Add the kan as a meld (mark as concealed kan internally)
        const kanMeld = kanTiles.concat();
        const meldIndex = this.players[userId].melds.length;
        this.players[userId].melds.push(kanMeld);
        // Mark this meld as a concealed kan (面前扱い)
        this.players[userId].concealedMeldIndices.add(meldIndex);

        // 暗槓でも巡目が中断するので全プレイヤーの一発を無効化
        this.cancelAllIppatsu();

        // Draw a tile from the kanning wall to restore hand size
        const drawnTile = this.drawFromKanningWall();
        if (drawnTile) {
          this.players[userId].hand.push(drawnTile);
          this.players[userId].drawnTile = drawnTile;
          this.players[userId].drawnTileIndex = this.players[userId].hand.length - 1;
          this.players[userId].drawnFromKanningWall = true;
        }

        // Reveal new dora
        this.addNewDora();

        // Reset pending pung state
        this.pendingPungFor = null;
        this.ronPossibleFor = null;
        this.ronTile = null;
        this.lastDiscard = null;
        this.lastDiscardBy = null;

        console.log(`[handleKong] Concealed kan by ${userId}: ${kanTiles[0].toString()}×4`);

        return {
          success: true,
          message: `暗カン: ${kanTiles[0].toString()}×4`,
          kanType: 'concealed'
        };
      }
    }

    return { success: false, message: 'Cannot form concealed kan' };
  }

  /**
   * Attempt to add a 4th tile to an existing pung (added kan - 加かん)
   * Requires a pung and a matching tile in hand
   */
  attemptAddedKan(userId) {
    const hand = this.players[userId].hand;
    const melds = this.players[userId].melds;

    // Check each pung in melds
    for (let i = 0; i < melds.length; i++) {
      const meld = melds[i];

      // Check if this is a pung (3 tiles)
      if (meld.length !== 3) continue;

      const meldTile = meld[0];

      // Look for a matching tile in hand
      for (let j = 0; j < hand.length; j++) {
        if (hand[j].equals(meldTile)) {
          // Found a matching tile - add it to the pung
          const matchingTile = hand[j];

          // Remove the tile from hand
          hand.splice(j, 1);

          // Add the tile to the pung (convert to kan)
          meld.push(matchingTile);

          // 加槓でも巡目が中断するので全プレイヤーの一発を無効化
          this.cancelAllIppatsu();

          // Draw a tile from the kanning wall to restore hand size
          const drawnTile = this.drawFromKanningWall();
          if (drawnTile) {
            this.players[userId].hand.push(drawnTile);
            this.players[userId].drawnTile = drawnTile;
            this.players[userId].drawnTileIndex = this.players[userId].hand.length - 1;
            this.players[userId].drawnFromKanningWall = true;
          }

          // Reveal new dora
          this.addNewDora();

          // Reset pending pung state
          this.pendingPungFor = null;
          this.ronPossibleFor = null;
          this.ronTile = null;
          this.lastDiscard = null;
          this.lastDiscardBy = null;

          console.log(`[handleKong] Added kan by ${userId}: ${meldTile.toString()}×4 (added to pung)`);

          return {
            success: true,
            message: `加カン: ${meldTile.toString()}×4`,
            kanType: 'added'
          };
        }
      }
    }

    return { success: false, message: 'Cannot form added kan' };
  }

  /**
   * Attempt to form a daiminkan (大明槓)
   * Call kan on opponent's discard with 3 matching tiles in hand
   * Meld format: [hand0, hand1, calledTile, hand2] — calledTile at index 2 (same as pon/kakan)
   */
  attemptDaiminkan(userId) {
    if (this.pendingPungFor !== userId || !this.lastDiscard) {
      return { success: false, message: 'No discard available for daiminkan' };
    }

    const lastDiscard = this.lastDiscard;
    const hand = this.players[userId].hand;

    // Find 3 matching tiles in hand
    const matchedIndices = [];
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].equals(lastDiscard)) {
        matchedIndices.push(i);
        if (matchedIndices.length === 3) break;
      }
    }

    if (matchedIndices.length !== 3) {
      return { success: false, message: 'Cannot form daiminkan - need 3 matching tiles' };
    }

    const otherPlayerId = this.getOtherPlayerId(userId);

    // Form daiminkan meld: [hand0, hand1, calledTile, hand2]
    // calledTile at index 2 matches pon/kakan display convention
    const meld = [
      hand[matchedIndices[0]],
      hand[matchedIndices[1]],
      lastDiscard,
      hand[matchedIndices[2]],
    ];
    const meldIndex = this.players[userId].melds.length;
    this.players[userId].melds.push(meld);
    this.players[userId].daiminkanMeldIndices.add(meldIndex);

    // 副露が発生したので最初の巡目の途切れ日フラグを無効にする
    this.firstGoAroundIntact = false;

    // 鳴き（大明槓）が入ったので全プレイヤーの一発を無効化
    this.cancelAllIppatsu();

    // Remove matched tiles from hand (reverse order for index safety)
    for (let i = matchedIndices.length - 1; i >= 0; i--) {
      hand.splice(matchedIndices[i], 1);
    }

    // Remove the discard from opponent's discard pile
    if (otherPlayerId) {
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
    }

    // Draw from kanning wall (嶺上牌)
    const drawnTile = this.drawFromKanningWall();
    if (drawnTile) {
      this.players[userId].hand.push(drawnTile);
      this.players[userId].drawnTile = drawnTile;
      this.players[userId].drawnTileIndex = this.players[userId].hand.length - 1;
      this.players[userId].drawnFromKanningWall = true;
    }

    // Reveal new dora
    this.addNewDora();

    // Clear all pending states
    this.pendingPungFor = null;
    this.ronPossibleFor = null;
    this.ronTile = null;
    this.lastDiscard = null;
    this.lastDiscardBy = null;

    // Reset tsumo info
    this.players[userId].drawnTile = drawnTile || null;

    // Set turn to the daiminkan caller
    this.currentTurnIndex = this.playerIds.indexOf(userId);

    console.log(`[handleKong] Daiminkan by ${userId}: ${lastDiscard.toString()}×4`);

    return {
      success: true,
      message: `大明カン: ${lastDiscard.toString()}×4`,
      kanType: 'daiminkan'
    };
  }

  /**
   * Draw a tile from the kanning wall (嶺上牌)
   */
  drawFromKanningWall() {
    if (this.kanningWall.length > 0) {
      return this.kanningWall.pop();
    }

    // If kanning wall is empty, try to replenish from supply
    if (this.kanningWallSupply.length > 0) {
      return this.kanningWallSupply.pop();
    }

    // If both are empty, draw from the main wall as fallback
    if (this.wall.length > 0) {
      return this.wall.pop();
    }

    console.warn('[drawFromKanningWall] No tiles available from kanning wall or main wall');
    return null;
  }

  /**
   * Add a new dora when kan is declared
   */
  addNewDora() {
    // Add the next dora indicator (if available)
    if (this.candidateDoraIndicators.length > this.doraIndicators.length) {
      const newDoraIndicator = this.candidateDoraIndicators[this.doraIndicators.length];
      this.doraIndicators.push(newDoraIndicator);

      // ドラ表示牌の次の牌を計算してドラとして設定
      const newDoraTile = this.getNextTile(newDoraIndicator);
      this.doraTiles.push(newDoraTile);

      console.log(`[addNewDora] New dora indicator: ${newDoraIndicator.toString()}, dora tile: ${newDoraTile.toString()}`);
    }

    // カン裏ドラ: 対応する裏ドラ表示牌も追加
    if (this.candidateUraDoraIndicators.length > this.uraDoraIndicators.length) {
      const newUraDoraIndicator = this.candidateUraDoraIndicators[this.uraDoraIndicators.length];
      this.uraDoraIndicators.push(newUraDoraIndicator);

      const newUraDoraTile = this.getNextTile(newUraDoraIndicator);
      this.uraDoraTiles.push(newUraDoraTile);

      console.log(`[addNewDora] New ura-dora indicator: ${newUraDoraIndicator.toString()}, ura-dora tile: ${newUraDoraTile.toString()}`);
    }
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
    let payment = scoreResult.score;

    // ロン倍率の適用（1倍以外のとき100点単位で切り上げ）
    if (this.ronMultiplier !== 1) {
      payment = Math.ceil(payment * this.ronMultiplier / 100) * 100;
      scoreResult.score = payment;
      scoreResult.ronMultiplier = this.ronMultiplier;
    }

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

    // 門前の場合は七対子・国士無双もチェック
    const melds = this.players[userId].melds;
    if (melds.length === 0) {
      if (this.isChiitoitsu(hand)) return true;
      if (this.isKokushi(hand)) return true;
    }

    // Check if this hand is winning
    return this.checkValidMeldStructure(hand);
  }

  isWinningHand(userId) {
    const hand = this.players[userId].hand;
    const melds = this.players[userId].melds;

    // Must have exactly 14 tiles total (hand + melds)
    // カン(4枚)は構造上3枚分として数える（嶺上牌で1枚補充するため）
    const meldTiles = melds.reduce((sum, m) => sum + Math.min(m.length, 3), 0);
    const totalTiles = hand.length + meldTiles;
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
    this.turnNumber++; // ターン番号を進める
  }

  /**
   * 全プレイヤーの一発有効フラグを無効にする
   * 鳴き（ポン・カン）が発生した場合に呼び出す
   */
  cancelAllIppatsu() {
    for (const id of this.playerIds) {
      if (this.players[id] && this.players[id].ippatsuValid) {
        console.log(`[Ippatsu] 一発無効化: ${id} (鳴きにより消滅)`);
        this.players[id].ippatsuValid = false;
      }
    }
  }

  drawForTurn(userId, deferRiichiAutoDiscard = false) {
    const hand = this.players[userId].hand;

    // Avoid double draw if player already has a drawn tile
    if (this.players[userId].drawnTileIndex >= 0) {
      // 両方リーチ中で和了できない場合は、自動ツモ切りを呼び出し側に委譲
      if (this.players[userId].riichi && this.areBothPlayersInRiichi() && !this.isWinningHand(userId)) {
        console.log(`[drawForTurn] Player ${userId} already has drawn tile, both riichi, cannot win - deferring auto-discard`);
        return { success: true, bothRiichiAutoPlay: true };
      }
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

    // 注意：wall.length === 0でも、嶺上牌や残り牌がある場合は続行する
    // drawTileWithLuckAdaptive が null を返す場合のみ流局と判定

    console.log(`[wall] before draw: userId=${userId}, wall.length=${this.wall.length}`);

    // ドラ候補牌を避けてツモを実行（ツモ運を考慮、手牌分析に基づく動的補正）
    const tile = this.drawTileWithLuckAdaptive(userId);

    if (!tile) {
      // 引ける牌がない場合は流局
      console.log(`[drawForTurn] ⚠️ WALL EXHAUSTED: No playable tiles remaining, game ending in draw`);
      this.finished = true;
      return {
        success: true,
        finished: true,
        message: 'Draw - no more playable tiles',
        isDraw: true,
        tileCount: hand.length + (this.players[this.playerIds[0]].melds.reduce((s, m) => s + m.length, 0) +
                                  this.players[this.playerIds[1]].melds.reduce((s, m) => s + m.length, 0))
      };
    }

    hand.push(tile);
    this.players[userId].drawnTile = tile;
    this.players[userId].drawnTileIndex = hand.length - 1;
    console.log(`[wall] after draw: userId=${userId}, wall.length=${this.wall.length}`);

    // リーチ中の場合、和了できるかチェックし、できなければ自動ツモ切り
    if (this.players[userId].riichi) {
      const canWin = this.isWinningHand(userId);
      if (!canWin) {
        // 両方リーチ中の場合は自動ツモ切りを呼び出し側に委譲（遅延付き自動進行のため）
        if (this.areBothPlayersInRiichi()) {
          console.log(`[drawForTurn] Both players in riichi - deferring auto-discard for ${userId} to caller`);
          return { success: true, bothRiichiAutoPlay: true };
        }
        // 呼び出し側が遅延処理を要求している場合は自動ツモ切りを委譲（間を置くため）
        if (deferRiichiAutoDiscard) {
          console.log(`[drawForTurn] Riichi auto-discard deferred for ${userId} (caller requested delay)`);
          return { success: true, riichiAutoDiscardPending: true };
        }
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

  /**
   * 手牌を分析して、牌の傾向を判定
   * @param {Array<Tile>} hand 手牌
   * @returns {Object} 分析結果 { honors, mans, pins, sous, gaps }
   */
  analyzeHandTendency(hand) {
    const analysis = {
      honors: [],        // 字牌リスト
      mans: [],          // 萬子リスト
      pins: [],          // 筒子リスト
      sous: [],          // 索子リスト
      honorCount: 0,
      suitCount: { man: 0, pin: 0, sou: 0 },
      gapsByNumber: {}, // 各番号での不足を検出
      dominantSuit: null, // 最も枚数が多い色
      missingColors: [], // 0枚の色
    };

    // 手牌を色別に分類
    hand.forEach(tile => {
      if (tile.suit === 'honor') {
        analysis.honors.push(tile);
        analysis.honorCount++;
      } else {
        analysis.suitCount[tile.suit === 'man' ? 'man' : tile.suit === 'pin' ? 'pin' : 'sou']++;
        if (tile.suit === 'man') analysis.mans.push(tile);
        else if (tile.suit === 'pin') analysis.pins.push(tile);
        else if (tile.suit === 'sou') analysis.sous.push(tile);
      }
    });

    // 支配的な色を判定
    const suitCounts = Object.values(analysis.suitCount);
    const maxSuitCount = Math.max(...suitCounts);
    if (analysis.suitCount.man === maxSuitCount) analysis.dominantSuit = 'man';
    else if (analysis.suitCount.pin === maxSuitCount) analysis.dominantSuit = 'pin';
    else if (analysis.suitCount.sou === maxSuitCount) analysis.dominantSuit = 'sou';

    // 0枚の色を検出
    if (analysis.suitCount.man === 0) analysis.missingColors.push('man');
    if (analysis.suitCount.pin === 0) analysis.missingColors.push('pin');
    if (analysis.suitCount.sou === 0) analysis.missingColors.push('sou');

    // 各番号での頻度を計算（number 1-9）
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      hand.forEach(tile => {
        if (tile.number === num && tile.suit !== 'honor') {
          count++;
        }
      });
      analysis.gapsByNumber[num] = 4 - count; // 4枚中何枚不足か
    }

    return analysis;
  }

  /**
   * 手牌を考慮した牌スコアの動的調整
   * @param {Tile} tile 対象の牌
   * @param {Array<Tile>} hand 現在の手牌
   * @returns {number} 調整済みスコア
   */
  getTileScoreWithHandAnalysis(tile, hand) {
    if (!tile) return 0;

    let score = this.getTileScore(tile);

    if (!hand || hand.length === 0) {
      return score;
    }

    const analysis = this.analyzeHandTendency(hand);
    const totalTiles = hand.length;
    const honorRatio = analysis.honorCount / totalTiles;

    // 字牌が多い場合（30%以上）→字牌スコアをブースト
    if (honorRatio >= 0.3 && tile.suit === 'honor') {
      score += 15; // スコア12→27に向上
    }
    // 字牌が多い場合→数字牌のスコアを低下
    else if (honorRatio >= 0.3 && tile.suit !== 'honor') {
      score = Math.max(2, score - 3);
    }

    // 不足している色の牌をブースト
    if (tile.suit !== 'honor' && analysis.missingColors.length > 0) {
      // 不足している色のいずれかに該当
      if (analysis.missingColors.includes(tile.suit)) {
        // 足りない色の中張牌（4,5,6）は特に重要
        if ([4, 5, 6].includes(tile.number)) {
          score += 12; // スコア20→32に向上
        } else if ([3, 7].includes(tile.number)) {
          score += 8; // スコア15→23に向上
        } else {
          score += 4;
        }
      }
    }

    // 支配的な色の中張牌をブースト（すでに多いので、その色の中張を優先）
    if (tile.suit === analysis.dominantSuit && [4, 5, 6].includes(tile.number)) {
      score += 5; // 既に揃っている色で顔を増やす戦略
    }

    // 指定の番号が不足している場合、その番号の牌をブースト
    if (tile.suit !== 'honor') {
      const gap = analysis.gapsByNumber[tile.number];
      if (gap >= 3) {
        // その番号がほぼ足りていない場合
        score += 8;
      } else if (gap >= 2) {
        score += 4;
      }
    }

    return score;
  }

  /**
   * シャンテン改善分析：現在の手牌に対して有用な牌タイプを事前計算
   * @param {Array<Tile>} hand 現在の手牌（13枚想定）
   * @param {Array} melds 副露済みの組
   * @returns {Object} { winningTileKeys, tenpaiAdvancingKeys }
   */
  analyzeShantenImprovement(hand, melds) {
    const result = {
      winningTileKeys: new Set(),       // アガリ牌（聴牌時）
      tenpaiAdvancingKeys: new Set(),   // 聴牌に進める牌（1シャンテン時）
    };

    if (!hand || hand.length < 1) return result;

    const effectiveMelds = melds || [];

    // 1. 現在のアガリ牌を確認（手牌が13枚 or 副露込みで13枚相当）
    const currentWinningTiles = TenpaiChecker.getWinningTiles(hand, effectiveMelds);
    currentWinningTiles.forEach(wt => {
      result.winningTileKeys.add(`${wt.suit}_${wt.number}`);
    });

    const isTenpai = currentWinningTiles.length > 0;

    if (isTenpai) {
      // 既に聴牌 → アガリ牌のみボーナス対象
      return result;
    }

    // 2. 聴牌していない場合：各牌タイプを引いたら聴牌に進むか確認
    const suits = ['man', 'pin', 'sou', 'honor'];
    const maxNums = { man: 9, pin: 9, sou: 9, honor: 7 };

    // 既存牌数カウント（4枚制限チェック用）
    const tileCount = {};
    hand.forEach(t => {
      const key = `${t.suit}_${t.number}`;
      tileCount[key] = (tileCount[key] || 0) + 1;
    });
    effectiveMelds.forEach(meld => {
      meld.forEach(t => {
        const key = `${t.suit}_${t.number}`;
        tileCount[key] = (tileCount[key] || 0) + 1;
      });
    });

    for (const suit of suits) {
      for (let num = 1; num <= maxNums[suit]; num++) {
        const key = `${suit}_${num}`;
        if ((tileCount[key] || 0) >= 4) continue;

        const testTile = { suit, number: num };
        const testHand = [...hand, testTile]; // 14枚

        // 各打牌候補を試す
        let reachesTenpai = false;
        for (let i = 0; i < testHand.length; i++) {
          const discardHand = [...testHand.slice(0, i), ...testHand.slice(i + 1)];
          const winTiles = TenpaiChecker.getWinningTiles(discardHand, effectiveMelds);
          if (winTiles.length > 0) {
            reachesTenpai = true;
            break;
          }
        }

        if (reachesTenpai) {
          result.tenpaiAdvancingKeys.add(key);
        }
      }
    }

    return result;
  }

  /**
   * 手牌との接続性ボーナスを計算（高速 O(n) チェック）
   * ターツ・トイツ・メンツの形成可能性を評価
   * @param {Tile} tile 候補牌
   * @param {Array<Tile>} hand 現在の手牌
   * @returns {number} 接続性ボーナス（0〜15）
   */
  getConnectivityBonus(tile, hand) {
    if (!tile || !hand || hand.length === 0) return 0;

    let bonus = 0;
    let pairCount = 0;
    let adjacentCount = 0;
    let gapCount = 0;

    for (const handTile of hand) {
      if (tile.suit === handTile.suit) {
        if (tile.suit === 'honor') {
          // 字牌：同じ牌ならトイツ/コーツ候補
          if (tile.number === handTile.number) {
            pairCount++;
          }
        } else {
          const diff = Math.abs(tile.number - handTile.number);
          if (diff === 0) {
            pairCount++;     // トイツ/コーツ候補
          } else if (diff === 1) {
            adjacentCount++; // リャンメン/ペンチャン候補
          } else if (diff === 2) {
            gapCount++;      // カンチャン候補
          }
        }
      }
    }

    // トイツ→コーツへの発展: 1枚持ち→+4, 2枚持ち→+8（コーツ完成近い）
    if (pairCount >= 2) bonus += 8;
    else if (pairCount >= 1) bonus += 4;

    // ターツ（隣接牌）: 1つ→+3, 2つ以上→+6（シュンツ完成に近い）
    if (adjacentCount >= 2) bonus += 6;
    else if (adjacentCount >= 1) bonus += 3;

    // カンチャン待ち
    if (gapCount >= 1) bonus += 2;

    return Math.min(bonus, 15);
  }

  /**
   * ツモを実行（ツモ運を考慮した選別、手牌分析を含む）
   * @param {string} userId プレイヤーID
   * @returns {Tile|null} 引いた牌、または null
   */
  drawTileWithLuckAdaptive(userId) {
    // ツモ対象から除外すべき牌のセット（オブジェクト参照ベース）
    const excludedTileObjects = new Set([
      ...this.kanningWall, // かん牌スペース
      ...this.kanningWallSupply, // かん牌補充用
      ...this.candidateDoraIndicators,
      ...this.candidateDoraTiles,
      ...this.candidateUraDoraIndicators,
      ...this.candidateUraDoraTiles,
    ]);

    // 引けるすべての牌を取得
    const playableTiles = [];
    for (let i = this.wall.length - 1; i >= 0; i--) {
      const tile = this.wall[i];
      // オブジェクト参照で除外判定（値ベースではなく）
      if (!excludedTileObjects.has(tile)) {
        playableTiles.push({ index: i, tile });
      }
    }

    if (playableTiles.length === 0) {
      console.log(`[drawTileWithLuckAdaptive] ⚠️ No playable tiles found in wall`);
      return null;
    }

    // ツモ運レベルを取得
    const luckLevel = this.tsumoLuckSettings[userId] || 0;

    if (luckLevel === 0) {
      // 運なし：ランダムに牌を選ぶ
      const randomIndex = Math.floor(Math.random() * playableTiles.length);
      const selectedTile = playableTiles[randomIndex];
      return this.wall.splice(selectedTile.index, 1)[0];
    }

    // 運あり：シャンテン数に応じた発動率で確率的に選択（手牌分析を考慮）
    const currentHand = this.players[userId].hand;
    const currentMelds = this.players[userId].melds || [];

    // シャンテン改善分析を事前計算（発動率決定＋ボーナス計算に共通利用）
    const shantenAnalysis = this.analyzeShantenImprovement(currentHand, currentMelds);

    // シャンテン数グループを判定: 0=テンパイ, 1=1シャンテン, 2=2シャンテン以上
    const shantenGroup = shantenAnalysis.winningTileKeys.size > 0 ? 0
      : shantenAnalysis.tenpaiAdvancingKeys.size > 0 ? 1
        : 2;

    // シャンテン数に応じた発動率を取得（shantenProbabilities が優先、未設定時は selectionProbabilities にフォールバック）
    const shantenProbs = settings.tsumoLuck.shantenProbabilities;
    const levelShantenProbs = shantenProbs && shantenProbs[luckLevel];
    const selectionProbability = (levelShantenProbs && levelShantenProbs[shantenGroup] !== undefined)
      ? levelShantenProbs[shantenGroup]
      : (settings.tsumoLuck.selectionProbabilities[luckLevel] || 0);

    console.log(`[drawTileWithLuckAdaptive] Player ${userId} luckLevel=${luckLevel} shantenGroup=${shantenGroup} selectionProbability=${selectionProbability}`);

    const useQualitySelection = Math.random() < selectionProbability;

    if (useQualitySelection) {
      // スコアに基づいてソート（手牌分析＋シャンテン改善を含める）
      const tilesWithScores = playableTiles.map(item => {
        let score = this.getTileScoreWithHandAnalysis(item.tile, currentHand);

        const tileKey = `${item.tile.suit}_${item.tile.number}`;

        // シャンテンボーナス適用
        if (shantenAnalysis.winningTileKeys.has(tileKey)) {
          // アガリ牌：最大ボーナス
          score += 50;
        } else if (shantenAnalysis.tenpaiAdvancingKeys.has(tileKey)) {
          // 聴牌に進む牌：大きなボーナス
          score += 30;
        } else {
          // それ以外：手牌との接続性ボーナス（シャンテンが深い場合に有効）
          score += this.getConnectivityBonus(item.tile, currentHand);
        }

        return { ...item, score };
      });

      // スコアによって確率的に選ぶ（高スコアの牌が選ばれやすい）
      const totalScore = tilesWithScores.reduce((sum, item) => sum + item.score, 0);
      if (totalScore > 0) {
        let random = Math.random() * totalScore;
        for (const item of tilesWithScores) {
          random -= item.score;
          if (random <= 0) {
            return this.wall.splice(item.index, 1)[0];
          }
        }
      }
    }

    // フォールバック：ランダムに選ぶ
    const randomIndex = Math.floor(Math.random() * playableTiles.length);
    const selectedTile = playableTiles[randomIndex];
    return this.wall.splice(selectedTile.index, 1)[0];
  }

  /**
   * ツモ運を考慮して牌の質を評価（スコアが高いほど実用的）
   * @param {Tile} tile 評価対象の牌
   * @returns {number} スコア
   */
  getTileScore(tile) {
    if (!tile) {
      return 0;
    }

    // 字牌の場合
    if (tile.suit === 'honor') {
      return 12; // 字牌は中程度の有用性
    }

    // 数字牌の場合：中張牌（4, 5, 6）が最も有用
    switch (tile.number) {
      case 4:
      case 5:
      case 6:
        return 20; // 最高スコア（最も多角的に利用可能）
      case 3:
      case 7:
        return 15; // 中高スコア（比較的有用）
      case 2:
      case 8:
        return 10; // 中低スコア（やや有用）
      case 1:
      case 9:
        return 5; // 最低スコア（オタ風、雀頭、チャンタ用）
      default:
        return 0;
    }
  }

  /**
   * ドラ候補牌を避けてツモを実行（非推奨：drawTileWithLuckAdaptiveを推奨）
   * @returns {Tile} ドラ候補でない牌、または null
   */
  drawTileAvoidingDoraCandidates() {
    // This method is kept for backward compatibility but drawTileWithLuckAdaptive is recommended
    const currentPlayer = this.playerIds[this.currentTurnIndex];
    return this.drawTileWithLuckAdaptive(currentPlayer);
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
      isRed: tile.isRed || false,
      isTransparent: tile.isTransparent || false,
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
        isRed: tile.isRed || false,
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

  /**
   * Check if daiminkan is available for the pending pung player
   */
  getPendingDaiminkanFor() {
    if (!this.pendingPungFor || !this.lastDiscard) return null;
    const userId = this.pendingPungFor;
    if (this.players[userId]?.riichi) return null;
    if (this.isPlayerInNoMeldMode(userId)) return null;
    if (this.canPlayerDaiminkan(userId, this.lastDiscard)) {
      return userId;
    }
    return null;
  }

  getRonPossibleFor() {
    return this.ronPossibleFor;
  }

  getReservedCount() {
    // 予約牌の総数
    const reservedCount = this.kanningWall.length +
                         this.kanningWallSupply.length +
                         this.candidateDoraIndicators.length +
                         this.candidateDoraTiles.length +
                         this.candidateUraDoraIndicators.length +
                         this.candidateUraDoraTiles.length;
    return reservedCount;
  }

  /**
   * 壁の中のツモ可能な牌数を正確にカウント（drawTileWithLuckAdaptiveと同じ除外ロジック）
   * @returns {number} ツモ可能な牌数
   */
  getPlayableTileCount() {
    const excludedTileObjects = new Set([
      ...this.kanningWall,
      ...this.kanningWallSupply,
      ...this.candidateDoraIndicators,
      ...this.candidateDoraTiles,
      ...this.candidateUraDoraIndicators,
      ...this.candidateUraDoraTiles,
    ]);
    let count = 0;
    for (let i = 0; i < this.wall.length; i++) {
      if (!excludedTileObjects.has(this.wall[i])) {
        count++;
      }
    }
    return count;
  }

  /**
   * 壁の状況を取得（ツモ可能な牌数）
   * 予約牌（ドラ関連とかん牌）を除いた実際にツモ可能な牌数を返す
   */
  getWallCount() {
    return this.getPlayableTileCount();
  }

  getDiscards() {
    const discards = {};
    const riichiDiscards = {};
    this.playerIds.forEach((playerId) => {
      discards[playerId] = this.players[playerId].discards.map((tile, i) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
        isRed: tile.isRed || false,
        isTsumogiri: this.players[playerId].discardFlags?.[i]?.isTsumogiri || false,
      }));
      riichiDiscards[playerId] = this.players[playerId].riichiDiscardIndex;
    });
    return { discards, riichiDiscards };
  }

  getLastDiscardInfo() {
    return this.lastDiscardInfo || null;
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
    // カン(4枚)は構造上3枚分として数える（嶺上牌で1枚補充するため）
    const meldStructureTiles = melds.reduce((sum, m) => sum + Math.min(m.length, 3), 0);
    const totalTilesAfterDiscard = hand.length + meldStructureTiles;

    console.log(`[checkTenpaiAfterDiscard] Total tiles after discard: ${hand.length} + ${meldStructureTiles} = ${totalTilesAfterDiscard}`);

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

    const isMenzen = this.isPlayerMenzen(playerId);
    console.log(`[calculateWinScore] Player ${playerId}:`);
    console.log(`  - riichi: ${player.riichi}`);
    console.log(`  - menzen: ${isMenzen}`);
    console.log(`  - isTsumo: ${isTsumo}`);

    // 和了時の手牌（和了牌を含む）
    const fullHand = [...player.hand];
    if (!fullHand.some(t => t.equals(winningTile))) {
      fullHand.push(winningTile);
    }

    // 偶然役の判定条件を計算
    const isIppatsumari = player.ippatsuValid || false;
    // 海底撈月: ツモ可能な牌が0枚の状態でのツモ和了
    const isHaitei = this.getPlayableTileCount() === 0 && isTsumo;
    // 河底撈魚: ツモ可能な牌が0枚の状態でのロン和了（最後の捨て牌でロン）
    const isHoutei = this.getPlayableTileCount() === 0 && !isTsumo;
    const isRinshan = player.drawnFromKanningWall && isTsumo;

    // 特殊役の判定条件
    const isDealer = this.playerIds[this.dealerIndex] === playerId;
    const isDoubleRiichi = player.isDoubleRiichi || false;

    // 天和: 親の配牌が和了形（親の最初のツモ、誰も打牌していない）
    const isTenhou = isTsumo && isDealer && this.turnNumber === 0 && player.discards.length === 0;

    // 地和: 子の最初のツモで和了（副露なし）
    const isChiihou = isTsumo && !isDealer && player.discards.length === 0 && this.firstGoAroundIntact;

    // 人和: 子が最初のツモ前にロンで和了（副露なし）
    const isRenhou = !isTsumo && !isDealer && player.discards.length === 0 && this.firstGoAroundIntact;

    console.log(`[calculateWinScore] isHaitei=${isHaitei}, isHoutei=${isHoutei}, playableTiles=${this.getPlayableTileCount()}, isTsumo=${isTsumo}`);
    console.log(`[calculateWinScore] isTenhou=${isTenhou}, isChiihou=${isChiihou}, isRenhou=${isRenhou}, isDoubleRiichi=${isDoubleRiichi}`);

    // 点数計算
    const scoreResult = this.scoreCalculator.calculateScore({
      hand: fullHand,
      melds: player.melds,
      concealedMeldIndices: player.concealedMeldIndices,
      winningTile: winningTile,
      isTsumo: isTsumo,
      isRon: !isTsumo,
      riichi: player.riichi, // リーチ情報を渡す
      menzen: isMenzen, // 門前かどうか（暗槓は面前扱い）
      roundWind: this.roundWindNumber,
      seatWind: this.seatWinds[playerId],
      doraIndicators: this.doraIndicators, // ドラ表示牌を渡す
      doraTiles: this.doraTiles, // 実際のドラを渡す
      urahaIndicators: player.riichi ? this.uraDoraIndicators : [], // リーチの時は裏ドラ表示牌を渡す
      urahaTiles: player.riichi ? this.getUrahaTiles() : [], // リーチの時は裏ドラを渡す
      isIppatsumari: isIppatsumari, // 一発判定
      isHaitei: isHaitei, // 海底撈月判定
      isHoutei: isHoutei, // 河底撈魚判定
      isRinshan: isRinshan, // 嶺上開花判定
      isDoubleRiichi: isDoubleRiichi, // ダブル立直判定
      isTenhou: isTenhou, // 天和判定
      isChiihou: isChiihou, // 地和判定
      isRenhou: isRenhou // 人和判定
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

    // 持ち点がリーチ供託点未満（供託点必須の場合のみチェック）
    if (this.riichiDepositRequired && player.score < settings.game.riichiDeposit) {
      return { success: false, message: '持ち点が' + settings.game.riichiDeposit + '点未満のためリーチできません（現在' + player.score + '点）' };
    }

    // 門前でない（副露している）- 暗槓は門前扱いのため除外
    const nonConcealedMeldCount = player.melds.length - player.concealedMeldIndices.size;
    if (nonConcealedMeldCount > 0) {
      return { success: false, message: '副露しているためリーチできません（メルド' + nonConcealedMeldCount + '個）' };
    }

    // 牌IDから手牌を探す
    // tileIdInput は "suit_number" 形式（例："man_3" や "pin_5"）
    // 赤ドラの場合は "suit_number_red" 形式（例："man_5_red"）
    const hand = player.hand;
    const parts = tileIdInput.split('_');
    const suit = parts[0];
    const number = parseInt(parts[1]);
    const isRed = parts[2] === 'red';

    // 手牌の中から該当する牌を探す（赤ドラの区別あり）
    let discardIndex = hand.findIndex(
      t => t.suit === suit && t.number === number && (t.isRed || false) === isRed
    );
    // フォールバック：赤を無視して検索
    if (discardIndex < 0) {
      discardIndex = hand.findIndex(
        t => t.suit === suit && t.number === number
      );
    }

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
    player.riichiTurn = this.turnNumber; // ターン番号を記録（一発判定用）
    player.ippatsuValid = true; // 一発有効フラグをセット
    player.riichiDiscardIndex = player.discards.length - 1; // リーチ宣言時の捨て牌インデックスを記録

    // ダブル立直判定：最初の巡目で副露が無い状態でのリーチ宣言
    // 捨て牌が1枚（今捨てた分のみ）かつ、誰も副露していない
    if (player.discards.length === 1 && this.firstGoAroundIntact) {
      player.isDoubleRiichi = true;
      console.log(`[Riichi] ⭐ ダブル立直成立！ Player: ${playerId}`);
    }

    if (this.riichiDepositRequired) {
      player.score -= settings.game.riichiDeposit;
      this.riichiDeposits += settings.game.riichiDeposit;
    }

    console.log(`[Riichi] ${playerId} declared riichi. Deposit: ${this.riichiDeposits}, isDoubleRiichi: ${player.isDoubleRiichi}, riichiDepositRequired: ${this.riichiDepositRequired}`);
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
        deposit: settings.game.riichiDeposit,
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

    // 両方リーチ中の場合は自動ドローを呼び出し側に委譲（遅延付き自動進行のため）
    if (!this.pendingPungFor && otherPlayerId && this.areBothPlayersInRiichi()) {
      console.log(`🔴 [declareRiichi] Both players in riichi - deferring auto-draw to caller`);
      return {
        success: true,
        message: `リーチ！（待ち: ${waitingTiles.map(t => t.display).join(', ')}）`,
        deposit: settings.game.riichiDeposit,
        waitingTiles: waitingTiles,
        riichi: true,
        bothRiichiAutoPlay: true,
      };
    }

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
          deposit: settings.game.riichiDeposit,
          waitingTiles: waitingTiles,
          riichi: true,
        };
      }
    }

    console.log(`🔴 [declareRiichi] ========================================\n`);

    return {
      success: true,
      message: `リーチ！（待ち: ${waitingTiles.map(t => t.display).join(', ')}）`,
      deposit: settings.game.riichiDeposit,
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
   * 両プレイヤーがリーチ状態かどうかを判定
   */
  areBothPlayersInRiichi() {
    return this.playerIds.every(id => this.players[id]?.riichi === true);
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
        isRed: tile.isRed || false,
      })),
      tiles: this.doraTiles.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
        isRed: tile.isRed || false,
      })),
      uraIndicators: this.uraDoraIndicators.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
        isRed: tile.isRed || false,
      })),
      uraTiles: this.uraDoraTiles.map((tile) => ({
        suit: tile.suit,
        number: tile.number,
        display: tile.toString(),
        isRed: tile.isRed || false,
      })),
    };
  }

  /**
   * 裏ドラを取得
   * リーチで和了した場合のみ適用
   */
  getUrahaTiles() {
    const uraha = [];
    // 裏ドラ表示牌と裏ドラタイルがある場合、裏ドラタイルを返す
    if (this.uraDoraIndicators.length > 0 && this.uraDoraTiles.length > 0) {
      uraha.push(...this.uraDoraTiles);
    }
    return uraha;
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
        isRed: tile.isRed || false,
      })),
    };
  }
}

module.exports = MahjongLogic;
