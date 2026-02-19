const TenpaiChecker = require('./TenpaiChecker');

class AIPlayer {
  constructor(tsumoKiriMode = false) {
    this.tsumoKiriMode = tsumoKiriMode; // テスト用ツモ切りモード
  }

  /**
   * CPUが捨てる牌を決める
   * @param {Array} hand - プレイヤーの手牌
   * @param {number} drawnTileIndex - 引いた牌のインデックス
   * @param {boolean} isRiichi - リーチ状態かどうか
   * @param {Object} gameState - ゲームの状態（相手の捨て牌など）
   * @returns {number} - ディスカード対象の牌のインデックス
   */
  chooseDiscard(hand, drawnTileIndex, isRiichi = false, gameState = {}) {
    // ツモ切りモード
    if (this.tsumoKiriMode) {
      return drawnTileIndex;
    }

    // リーチ状態は牌を選択できない
    if (isRiichi) {
      return drawnTileIndex;
    }

    if (hand.length !== 14 || drawnTileIndex === -1) {
      return drawnTileIndex;
    }

    // 通常モード：戦略的にディスカードを選ぶ
    return this.selectBestDiscard(hand, drawnTileIndex, gameState);
  }

  /**
   * テンパイに向けた最善のディスカードを選ぶ
   */
  selectBestDiscard(hand, drawnTileIndex, gameState = {}) {
    // 各牌をディスカードした場合のスコアを計算
    const scores = new Array(hand.length).fill(-Infinity);

    for (let i = 0; i < hand.length; i++) {
      scores[i] = this.evaluateDiscardMove(hand, i, gameState);
    }

    // 最高スコアのインデックスを返す
    let bestIndex = 0;
    let bestScore = scores[0];

    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > bestScore) {
        bestScore = scores[i];
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * ディスカード候補のスコアを評価する
   */
  evaluateDiscardMove(hand, discardIndex, gameState = {}) {
    const discardedHand = hand.slice();
    const discardedTile = discardedHand.splice(discardIndex, 1)[0];

    let score = 0;

    // 1. テンパイ有利度（最優先）
    const winningTiles = TenpaiChecker.getWinningTiles(discardedHand, []);
    const isTenpai = winningTiles.length > 0;
    if (isTenpai) {
      score += 10000; // テンパイ状態は最大のボーナス
      score += winningTiles.length * 100; // 和了牌が多いほどボーナス
    }

    // 2. 牌の有用性（タイル効率）- 複合性を最優先
    const usefulnessScore = this.evaluateTileEfficiency(discardedHand, discardedTile);
    score += usefulnessScore * 3.0; // 重み付けを大幅に増加（複合性重視）

    // 3. 危険度の評価
    const dangerScore = this.evaluateDanger(discardedTile, gameState);
    score += dangerScore;

    // 4. 手の整形度
    const shapeScore = this.evaluateHandShape(discardedHand);
    score += shapeScore * 1.5;

    return score;
  }

  /**
   * 牌の危険度を評価（リーチがかかっているプレイヤーへの危険性）
   * 改善版：より詳細な危険分析
   */
  evaluateDanger(tile, gameState = {}) {
    const { opponentRiichi = false, discardedTiles = [] } = gameState;

    let dangerScore = 0;

    // リーチがかかっていない場合は危険度は最小限
    if (!opponentRiichi) {
      // それでも新しい牌や字牌は避けるのが良い
      if (tile.suit === 'honor') {
        dangerScore -= 20; // 字牌は比較的安全
      }
      return dangerScore;
    }

    // リーチがかかっている場合の危険評価
    const tileValue = this.getTileValue(tile);
    
    // 1. 字牌は危険度が低い
    if (tile.suit === 'honor') {
      dangerScore += 200; // 字牌は安全
      return dangerScore;
    }

    // 2. 相手が切った牌からの推測
    // 相手が連続で切った牌の間の牌は危険（両面待ちの可能性）
    const discardedNumbers = discardedTiles
      .filter(d => d.suit === tile.suit)
      .map(d => d.number)
      .sort((a, b) => a - b);

    // 3. 最近の捨て牌の傾向を分析
    // 古い牌（リーチ前の捨て牌）から見える通った牌は安全
    const passedTiles = new Set();
    discardedNumbers.forEach(num => {
      // リーチメンゼン形を推定：相手が通した牌の周辺は危険度が低い
      for (let i = Math.max(1, num - 1); i <= Math.min(9, num + 1); i++) {
        passedTiles.add(i);
      }
    });

    if (passedTiles.has(tile.number)) {
      dangerScore += 150; // 相手が通した牌の周辺は安全
    }

    // 4. 位置的な危険度
    // 中央よりの牌（4, 5, 6）は両面待ちの中心となりやすい
    if (tile.number >= 4 && tile.number <= 6) {
      dangerScore -= 300; // 中央牌は危険
    } else if ((tile.number === 3 && discardedNumbers.length > 0 && discardedNumbers[0] >= 5) ||
               (tile.number === 7 && discardedNumbers.length > 0 && discardedNumbers[discardedNumbers.length - 1] <= 5)) {
      dangerScore -= 150; // 端の方でも順子形成の可能性がある
    } else {
      dangerScore -= 50; // 端の牌はより安全
    }

    return dangerScore;
  }

  /**
   * シャンテン改善度を評価
   * 捨ててもシャンテン数が減らない、または減らしで得られる価値を計算
   */
  evaluateShantenImprovement(hand, discardIndex) {
    // 捨てない場合の和了牌数
    const currentWinningTiles = TenpaiChecker.getWinningTiles(hand, []);
    const currentWaitTileCount = new Set(
      currentWinningTiles.map(t => `${t.suit}-${t.number}`)
    ).size;

    // 捨てた場合の和了牌数
    const discardedHand = hand.slice();
    discardedHand.splice(discardIndex, 1);
    const nextWinningTiles = TenpaiChecker.getWinningTiles(discardedHand, []);
    const nextWaitTileCount = new Set(
      nextWinningTiles.map(t => `${t.suit}-${t.number}`)
    ).size;

    // 差分を返す（增える場合は正の値、減える場合は負の値）
    // ただし、待ちが全くない場合は0を返す（シャンテン改善として評価）
    if (nextWaitTileCount === 0) {
      return 0.5; // 待ちが消えても悪くない（シャンテン改善）
    }
    return nextWaitTileCount - currentWaitTileCount;
  }

  /**
   * タイル効率を評価（改善版：リャンメン、カンチャンなどを考慮）
   * 手牌として保持することの価値を計算
   */
  evaluateTileEfficiency(hand, discardedTile) {
    let efficiencyScore = 0;

    // 1. タイル分類
    const tileClass = this.classifyTile(discardedTile);
    const baseClassScore = this.getTileClassScore(tileClass);
    efficiencyScore += baseClassScore; // 基本的な分類スコア

    // 2. 複合可能性の評価（最優先）
    const combinationScore = this.evaluateCombinationPotential(hand, discardedTile);
    efficiencyScore += combinationScore * 3.0; // 複合性を最優先（係数を大幅強化 1.5→3.0）

    // 3. 孤立度の評価
    const isolationScore = this.evaluateTileIsolation(hand, discardedTile);
    efficiencyScore += isolationScore * 80; // 孤立した牌は優先的に削除（100→80に軽減）

    // 4. リャンメン効率（2-8の場合のみ）
    if (discardedTile.suit !== 'honor' && discardedTile.number >= 2 && discardedTile.number <= 8) {
      const ryanmenScore = this.evaluateRyanmenEfficiency(hand, discardedTile);
      efficiencyScore += ryanmenScore * 1.2; // リャンメン効率を補助的に評価（2.0→1.2に軽減）
    }

    return efficiencyScore;
  }

  /**
   * タイルを分類する（1, 9, honor のいずれか）
   */
  classifyTile(tile) {
    if (tile.suit === 'honor') return 'honor';
    if (tile.number === 1 || tile.number === 9) return 'terminal';
    return 'standard';
  }

  /**
   * タイル分類に基づいた基本スコア（修正版）
   * 字牌と老頭牌は孤立している場合のみ優先削除
   */
  getTileClassScore(tileClass) {
    // 修正：基本スコアを大幅に縮小
    // 組合可能性がある場合はデマージが小さくなるべき
    switch (tileClass) {
      case 'honor':
        return 30;  // 縮小：150→30（組合性がない時のみ有効）
      case 'terminal':
        return 20;  // 縮小：100→20
      case 'standard':
        return 0;   // 標準牌は中立
      default:
        return 0;
    }
  }

  /**
   * タイルの孤立度を評価
   * 返り値: 孤立度が高いほど正の値
   */
  evaluateTileIsolation(hand, discardedTile) {
    const suit = discardedTile.suit;
    const number = discardedTile.number;

    if (suit === 'honor') {
      // 字牌：同じ字牌が何枚あるか
      const sameHonorCount = hand.filter(
        t => t.suit === 'honor' && t.number === number
      ).length;
      return sameHonorCount === 0 ? 1.0 : 0; // 他に同じ字牌がないなら孤立
    }

    // 数字牌：隣接する牌（±1, ±2）がいくつあるか
    const adjacentCount = hand.filter(
      t => t.suit === suit && Math.abs(t.number - number) <= 2 && t.number !== number
    ).length;

    const sameCount = hand.filter(
      t => t.suit === suit && t.number === number
    ).length;

    // 隣接牌がない、かつ同じ牌が1枚以下なら孤立している
    if (adjacentCount === 0 && sameCount === 0) {
      return 1.5; // 完全に孤立
    } else if (adjacentCount === 0) {
      return 1.0; // 対子だが周囲に牌がない
    } else if (adjacentCount <= 1) {
      return 0.5; // わずかに繋がっている
    }
    return 0; // 繋がっている
  }

  /**
   * 複合可能性を評価
   * この牌を保持することで形成できるメルドの数を推定
   */
  evaluateCombinationPotential(hand, discardedTile) {
    let potential = 0;

    if (discardedTile.suit === 'honor') {
      // 字牌は対子の可能性のみ
      const sameCount = hand.filter(
        t => t.suit === 'honor' && t.number === discardedTile.number
      ).length;
      if (sameCount >= 2) {
        potential -= 120; // 対子可能 → 保持すべき
      } else if (sameCount === 1) {
        potential -= 60; // 対子にできない可能性がある
      } else {
        potential += 80; // 複合可能性がまったくない → 削除対象
      }
      return potential;
    }

    const suit = discardedTile.suit;
    const num = discardedTile.number;

    let patternCount = 0; // パターンカウント：複数パターンが見つかった場合はボーナス
    let hasAnyPattern = false; // いずれかのパターンに参加できるか

    // 順子の可能性
    // n-1-n-n+1 (center/リャンメン)
    if (num >= 2 && num <= 8) {
      const has_n_minus_1 = hand.some(t => t.suit === suit && t.number === num - 1);
      const has_n_plus_1 = hand.some(t => t.suit === suit && t.number === num + 1);
      if (has_n_minus_1 && has_n_plus_1) {
        potential -= 100; // リャンメン形は最強
        patternCount++;
        hasAnyPattern = true;
      } else if (has_n_minus_1 || has_n_plus_1) {
        potential -= 50; // カンチャン/ペンチャン形
        patternCount++;
        hasAnyPattern = true;
      }
    }

    // n-1-n-2（n+1の場合）
    if (num >= 1 && num <= 7) {
      const has_n_plus_1 = hand.some(t => t.suit === suit && t.number === num + 1);
      const has_n_plus_2 = hand.some(t => t.suit === suit && t.number === num + 2);
      if (has_n_plus_1 && has_n_plus_2) {
        potential -= 80; // 順子を形成する
        patternCount++;
        hasAnyPattern = true;
      }
    }

    // n-n+1-n+2（n-1の場合）
    if (num >= 2 && num <= 8) {
      const has_n_minus_1 = hand.some(t => t.suit === suit && t.number === num - 1);
      const has_n_minus_2 = hand.some(t => t.suit === suit && t.number === num - 2);
      if (has_n_minus_1 && has_n_minus_2) {
        potential -= 80; // 順子を形成する
        patternCount++;
        hasAnyPattern = true;
      }
    }

    // 刻子の可能性
    const sameCount = hand.filter(
      t => t.suit === suit && t.number === num
    ).length;
    if (sameCount >= 2) {
      potential -= 120; // 刻子を作れる（保持すべき）
      patternCount++;
      hasAnyPattern = true;
    } else if (sameCount === 1) {
      potential -= 50; // 対子にできる
      patternCount++;
      hasAnyPattern = true;
    }

    // 複数のパターンが見つかった場合はボーナス（複合性が高い = 保持すべき）
    if (patternCount >= 2) {
      potential -= 100; // 複数パターン形成可能 → 強く保持すべき
    }

    // 複合可能性がまったくない場合は削除優先度を上げる
    if (!hasAnyPattern) {
      potential += 100; // 複合可能性がない → 削除対象として高優先度
    }

    return potential;
  }

  /**
   * リャンメン効率を評価
   * 2-8の牌が両側に牌を持つときのボーナス
   */
  evaluateRyanmenEfficiency(hand, discardedTile) {
    const suit = discardedTile.suit;
    const num = discardedTile.number;

    let score = 0;

    // パターン1: n-1-n-n+1 (リャンメン)
    if (num >= 2 && num <= 8) {
      const has_minus = hand.some(t => t.suit === suit && t.number === num - 1);
      const has_plus = hand.some(t => t.suit === suit && t.number === num + 1);
      if (has_minus && has_plus) {
        score += 80; // 強力なリャンメン形
      } else if (has_minus || has_plus) {
        // ペンチャン、カンチャン
        // 中央の牌（4, 5, 6）はより価値がある
        if (num >= 4 && num <= 6) {
          score += 30;
        } else {
          score += 10;
        }
      }
    }

    // パターン2: 両側に隣接牌がある場合はボーナス
    let adjacentCount = 0;
    if (num >= 2) {
      if (hand.some(t => t.suit === suit && t.number === num - 1)) adjacentCount++;
      if (hand.some(t => t.suit === suit && t.number === num - 2)) adjacentCount++;
    }
    if (num <= 8) {
      if (hand.some(t => t.suit === suit && t.number === num + 1)) adjacentCount++;
      if (hand.some(t => t.suit === suit && t.number === num + 2)) adjacentCount++;
    }

    score += adjacentCount * 15; // 隣接牌が多いほど価値がある

    return score;
  }

  /**
   * 手牌の整形度を評価（改善版）
   * スーツ集中度、連続性、隔離の度合いをより詳細に評価
   */
  evaluateHandShape(hand) {
    let shapeScore = 0;

    // 1. スーツの分布を分析
    const suitsCount = {};
    hand.forEach((tile) => {
      suitsCount[tile.suit] = (suitsCount[tile.suit] || 0) + 1;
    });

    const suitCounts = Object.values(suitsCount).sort((a, b) => b - a);
    
    // メインスーツが集中しているかチェック
    if (suitCounts[0] >= 7) {
      shapeScore += 100; // 非常に集中している
    } else if (suitCounts[0] >= 6) {
      shapeScore += 60;  // 濃く集中している
    } else if (suitCounts[0] >= 5) {
      shapeScore += 30;  // それなりに集中している
    }

    // 副スーツの数をチェック（少ないほど良い）
    const nonZeroSuits = Object.values(suitsCount).filter(c => c > 0).length;
    if (nonZeroSuits === 1) {
      shapeScore += 150; // 字牌またはメインスーツのみ
    } else if (nonZeroSuits === 2) {
      shapeScore += 80;  // 2スーツのみ
    } else if (nonZeroSuits === 3) {
      shapeScore += -30; // 3スーツ（バランス悪い）
    } else {
      shapeScore += -80; // 4スーツ以上（非常にバランス悪い）
    }

    // 2. 数字の連続性を統計的に評価
    const numbers = {};
    hand.forEach((tile) => {
      if (tile.suit !== 'honor') {
        numbers[tile.number] = (numbers[tile.number] || 0) + 1;
      }
    });

    // 連続する数字のグループを検出
    let maxSequenceLength = 0;
    let currentSequenceLength = 0;
    for (let i = 1; i <= 9; i++) {
      if ((numbers[i] || 0) > 0) {
        currentSequenceLength++;
        maxSequenceLength = Math.max(maxSequenceLength, currentSequenceLength);
      } else {
        currentSequenceLength = 0;
      }
    }

    // 連続性スコア
    if (maxSequenceLength >= 7) {
      shapeScore += 80; // 非常に連続している
    } else if (maxSequenceLength >= 5) {
      shapeScore += 50;
    } else if (maxSequenceLength >= 3) {
      shapeScore += 20;
    } else if (maxSequenceLength === 2) {
      shapeScore += 5;
    }

    // 3. 中央牌（4, 5, 6）の集中度
    const centerTileCount = hand.filter(
      t => t.suit !== 'honor' && t.number >= 4 && t.number <= 6
    ).length;
    if (centerTileCount >= 5) {
      shapeScore += 40; // 中央牌が集中している（リャンメン形成しやすい）
    } else if (centerTileCount >= 3) {
      shapeScore += 15;
    }

    // 4. 老頭牌（1, 9）を除いた牌の割合
    const nonTerminalTiles = hand.filter(
      t => t.suit !== 'honor' && t.number >= 2 && t.number <= 8
    ).length;
    if (nonTerminalTiles >= 10) {
      shapeScore += 50; // 老頭牌が少ない（効率的）
    } else if (nonTerminalTiles <= 6) {
      shapeScore += -40; // 老頭牌が多い（非効率的）
    }

    return shapeScore;
  }

  /**
   * 牌の相対的な価値を取得（数字が高いほど価値が高い）
   */
  getTileValue(tile) {
    if (tile.suit === 'honor') {
      return 5; // 字牌は中程度の価値
    }
    return Math.abs(tile.number - 5); // 5に近いほど価値が高い（両端より）
  }

  /**
   * ツモ切りモードの切り替え
   */
  setTsumoKiriMode(enabled) {
    this.tsumoKiriMode = enabled;
  }

  /**
   * 現在のモードを取得
   */
  getTsumoKiriMode() {
    return this.tsumoKiriMode;
  }

  /**
   * ポン（副露）をすべきかを判定
   * 改善版：役が無くなるような無謀なポンを避け、高得点が狙える場合だけ実施
   * @param {Array} hand - ポン後の手牌（ポンする牌は既に除外された状態）
   * @param {Tile} discardedTile - 相手が捨てた牌
   * @param {Array} melds - 現在のメルド
   * @returns {boolean} - ポンすべき場合 true
   */
  shouldPung(hand, discardedTile, melds = []) {
    // 基本チェック：手牌が正常な状態か
    if (!hand || hand.length === 0 || !discardedTile) {
      return false;
    }

    // ポンすると手牌が12枚になる状態をシミュレート
    const afterPungHand = hand.slice();

    console.log(`[AIPlayer.shouldPung] Evaluating pung of ${discardedTile.suit}-${discardedTile.number} (melds: ${melds.length})`);

    // 1. 【最優先】テンパイしているかチェック
    const afterPungWinningTiles = TenpaiChecker.getWinningTiles(afterPungHand, melds);
    if (afterPungWinningTiles.length > 0) {
      console.log(`[AIPlayer.shouldPung] ✅ Pung leads to TENPAI: ${afterPungWinningTiles.length} winning tiles`);
      return true;
    }

    // 2. 【重要】ポン前の手牌の勝ち目をチェック
    const beforePungWinningTiles = TenpaiChecker.getWinningTiles(hand, melds);
    if (beforePungWinningTiles.length > 0 && afterPungWinningTiles.length === 0) {
      // テンパイが消える = 非常に悪い
      console.log(`[AIPlayer.shouldPung] ❌ DESTRUCTIVE: Pung destroys winning chances: ${beforePungWinningTiles.length} → 0`);
      return false;
    }

    // 3. 【重要】高得点役が構築可能かメルド後に確認
    const pungMeldWithNewTile = [discardedTile, discardedTile, discardedTile];
    const newMelds = melds.concat([pungMeldWithNewTile]);
    const canBuildHighValue = this.canBuildHighValueYakuAfterPung(hand, newMelds, discardedTile);

    if (canBuildHighValue) {
      console.log(`[AIPlayer.shouldPung] ✅ Can build high-value yaku after pung`);
      return true;
    }

    // 4. メルドが既にある場合は、よほど確実な勝ち筋がない限りポンしない
    if (melds.length > 0) {
      console.log(`[AIPlayer.shouldPung] ❌ Already have melds and no clear high-value path`);
      return false;
    }

    // 5. 初期段階（メルドなし）での判定：本当に厳しい条件でのみ許可
    // ホンイツ/チンイツへのはっきりした道筋がある場合のみ
    if (this.isHonitsuOrChinitsuPossible(hand, newMelds, discardedTile)) {
      const adjacentPairs = this.countAdjacentPairs(hand);
      const quality = this.evaluateHandQualityForFuro(hand, discardedTile);
      
      // 非常に厳しい条件： ホンイツ/チンイツ + 高い品質スコア
      if (quality > 0.8 && adjacentPairs >= 2) {
        console.log(`[AIPlayer.shouldPung] ✅ Early honitsu/chinitsu gathering (quality: ${quality}, adjacent: ${adjacentPairs})`);
        return true;
      }
    }

    console.log(`[AIPlayer.shouldPung] ❌ No viable winning path through pung`);
    return false;
  }

  /**
   * ポン後に高得点役が構築可能かを判定
   * 対々和（トイトイ）、短単（タンヤオ）、混一色（ホンイツ）などを検査
   * @param {Array} hand - ポン後の手牌
   * @param {Array} melds - メルド（ポン後の状態）
   * @param {Tile} pungTile - ポンした牌
   * @returns {boolean} - 高得点役を構築できるなら true
   */
  canBuildHighValueYakuAfterPung(hand, melds, pungTile) {
    // 1. 対々和（トイトイ）判定：全てのメルドが刻子（三つ一組）になる傾向
    //    ポンは刻子を作るため、対々和志向なら有効
    const pungMeldWithNewTile = [pungTile, pungTile, pungTile]; // ポンで作られるメルド
    const newMelds = melds.concat([pungMeldWithNewTile]);
    
    if (this.isToitouiPossible(hand, newMelds)) {
      console.log(`[AIPlayer.canBuildHighValueYakuAfterPung] Can build トイトイ (toitoi)`);
      return true;
    }

    // 2. 短単（タンヤオ）判定：老頭牌（1, 9）と字牌を使わない役
    //    ポンする牌が字牌や老頭牌の場合は短単を破壊する可能性がある
    if (this.isTanyaoPossible(hand, newMelds, pungTile)) {
      console.log(`[AIPlayer.canBuildHighValueYakuAfterPung] Can build タンヤオ (tanyao)`);
      return true;
    }

    // 3. 混一色（ホンイツ）/清一色（チンイツ）判定：同じスーツで統一
    if (this.isHonitsuOrChinitsuPossible(hand, newMelds, pungTile)) {
      console.log(`[AIPlayer.canBuildHighValueYakuAfterPung] Can build 混一色/清一色`);
      return true;
    }

    // 4. メルドなしの初期段階では、複合性が十分に高い場合は許可（布石）
    //    ただし条件を厳しくして、本当に必要な時だけポンさせる
    if (melds.length === 0) {
      const complexity = this.evaluateHandComplexity(hand);
      const handQuality = this.evaluateHandQualityForFuro(hand, pungTile);
      const adjacentPairs = this.countAdjacentPairs(hand);
      
      // 高い複合性と良い品質が必要
      // 複合性: 60以上 AND 隣接ペアが3つ以上 AND 品質スコアが0.7以上
      if (complexity >= 60 && adjacentPairs >= 3 && handQuality > 0.7) {
        console.log(`[AIPlayer.canBuildHighValueYakuAfterPung] Initial gathering phase (complexity: ${complexity}, adjacent: ${adjacentPairs}, quality: ${handQuality})`);
        return true;
      }
    }

    return false;
  }

  /**
   * 対々和（トイトイ）が構築可能かを判定
   * @param {Array} hand - 手牌
   * @param {Array} melds - メルド
   * @returns {boolean}
   */
  isToitouiPossible(hand, melds) {
    // 対々和は全てのメルドが刻子（同じ牌3枚）である必要がある
    // 既存メルドが全て刻子か確認
    for (const meld of melds) {
      // メルドが3枚同じ牌なのか確認
      if (!(meld[0].suit === meld[1].suit && 
            meld[1].suit === meld[2].suit &&
            meld[0].number === meld[1].number &&
            meld[1].number === meld[2].number)) {
        // 刻子でないメルドがある = 対々和不可
        return false;
      }
    }

    // 手牌に刻子になりうる牌が必要
    // メルドの数分を差し引いた後、残りの面子が全て刻子になるシミュレーション
    const tileGroups = {};
    hand.forEach(tile => {
      const key = `${tile.suit}-${tile.number}`;
      tileGroups[key] = (tileGroups[key] || 0) + 1;
    });

    // 3枚以上ある牌のグループ数
    const tripletCount = Object.values(tileGroups).filter(count => count >= 3).length;
    const pairCount = Object.values(tileGroups).filter(count => count === 2).length;
    const singleCount = Object.values(tileGroups).filter(count => count === 1).length;

    // 必要な刻子数 = 4 - メルド数
    // 手牌から形成できる刻子数 >= 必要な刻子数なら可能
    const requiredTriplets = 4 - melds.length;
    const possibleTriplets = tripletCount + Math.floor(pairCount / 2); // 対子から刻子は作れない、但しグループが多い場合は可能性あり
    
    // 厳しい判定：十分な刻子候補が必要
    if (tripletCount >= 2 || (tripletCount >= 1 && pairCount >= 1)) {
      return true;
    }

    return false;
  }

  /**
   * 短単（タンヤオ）が構築可能かを判定
   * 老頭牌（1, 9）と字牌を含まない役
   * @param {Array} hand - 手牌
   * @param {Array} melds - メルド（ポン後）
   * @param {Tile} pungTile - ポンした牌
   * @returns {boolean}
   */
  isTanyaoPossible(hand, melds, pungTile) {
    // ポンする牌が老頭牌や字牌の場合は短単不可
    if (pungTile.suit === 'honor' || pungTile.number === 1 || pungTile.number === 9) {
      return false; // 短単を破壊する
    }

    // 手牌に老頭牌や字牌が多すぎる場合も不可
    const terminalOrHonorCount = hand.filter(
      t => t.suit === 'honor' || t.number === 1 || t.number === 9
    ).length;

    if (terminalOrHonorCount > 1) {
      return false; // 老頭牌・字牌が2つ以上なら短単達成困難
    }

    // 既存メルドが短単に適合しているかチェック
    for (const meld of melds) {
      for (const tile of meld) {
        if (tile.suit === 'honor' || tile.number === 1 || tile.number === 9) {
          return false; // メルドに老頭牌や字牌がある
        }
      }
    }

    return true;
  }

  /**
   * 混一色（ホンイツ）/清一色（チンイツ）が構築可能かを判定
   * @param {Array} hand - 手牌
   * @param {Array} melds - メルド（ポン後）
   * @param {Tile} pungTile - ポンした牌
   * @returns {boolean}
   */
  isHonitsuOrChinitsuPossible(hand, melds, pungTile) {
    // メルド内のスーツを集計
    const meldSuits = new Set();
    for (const meld of melds) {
      for (const tile of meld) {
        meldSuits.add(tile.suit);
      }
    }

    // ポン牌も含める
    meldSuits.add(pungTile.suit);

    // 手牌のスーツを集計
    const handSuits = new Set();
    hand.forEach(tile => {
      handSuits.add(tile.suit);
    });

    // 全スーツを結合
    const allSuits = new Set([...meldSuits, ...handSuits]);

    // 清一色の場合：数字スーツ1種類のみ
    if (allSuits.size === 1) {
      const suit = Array.from(allSuits)[0];
      if (suit !== 'honor') {
        return true; // 清一色（チンイツ）が可能
      }
    }

    // 混一色の場合：数字スーツ1種類 + 字牌のみ
    if (allSuits.size === 2) {
      const suitsArray = Array.from(allSuits);
      const hasHonor = suitsArray.includes('honor');
      const nonHonorCount = suitsArray.filter(s => s !== 'honor').length;
      
      if (hasHonor && nonHonorCount === 1) {
        return true; // 混一色（ホンイツ）が可能
      }
    }

    return false;
  }

  /**
   * 手牌がポン向きの品質を持っているかを判定（0-1スコア）
   * @param {Array} hand - 手牌
   * @param {Tile} pungTile - ポンする牌
   * @returns {number} - 品質スコア（0-1）
   */
  evaluateHandQualityForFuro(hand, pungTile) {
    let quality = 0.5; // 基本値

    // 1. ポンする牌が手牌に2枚以上存在するか（ポンの前提）
    const pungTileCount = hand.filter(
      t => t.suit === pungTile.suit && t.number === pungTile.number
    ).length;
    
    if (pungTileCount < 2) {
      return 0; // ポン不可
    }

    // 2. 同じスーツまたは字牌のグループが形成されているか
    const suits = {};
    hand.forEach(tile => {
      suits[tile.suit] = (suits[tile.suit] || 0) + 1;
    });

    const maxSuitCount = Math.max(...Object.values(suits));
    if (maxSuitCount >= 6) {
      quality += 0.25; // スーツ集中している
    }

    // 3. 連続した牌が存在するか（複合可能性）
    const adjacentPairCount = this.countAdjacentPairs(hand);
    if (adjacentPairCount >= 3) {
      quality += 0.25; // 連続性が高い
    }

    return Math.min(1, quality);
  }

  /**
   * 隣接する牌のペア数を数える（複合可能性の指標）
   * @param {Array} hand - 手牌
   * @returns {number}
   */
  countAdjacentPairs(hand) {
    let pairCount = 0;

    const suits = { 'm': {}, 'p': {}, 's': {} };
    hand.forEach(tile => {
      if (tile.suit !== 'honor') {
        if (!suits[tile.suit]) suits[tile.suit] = {};
        suits[tile.suit][tile.number] = (suits[tile.suit][tile.number] || 0) + 1;
      }
    });

    for (const suit in suits) {
      const numbers = suits[suit];
      for (let i = 1; i <= 8; i++) {
        if ((numbers[i] || 0) > 0 && (numbers[i + 1] || 0) > 0) {
          pairCount++;
        }
      }
    }

    return pairCount;
  }

  /**
   * リーチ可能な捨て牌候補を評価
   * @param {Array} hand - 手牌
   * @param {Array} melds - 副露
   * @returns {Array} - 候補リスト
   */
  getRiichiOptions(hand, melds) {
    const results = TenpaiChecker.checkAllTenpai(hand, melds);
    const options = [];

    Object.entries(results).forEach(([indexStr, result]) => {
      if (!result.isTenpai) return;
      const waitTiles = result.winningTiles || [];
      const waitCount = waitTiles.length;
      const totalAvailable = waitTiles.reduce((sum, tile) => sum + (tile.count || 0), 0);
      options.push({
        index: parseInt(indexStr, 10),
        waitCount,
        totalAvailable,
        waitTiles
      });
    });

    options.sort((a, b) => {
      if (b.waitCount !== a.waitCount) return b.waitCount - a.waitCount;
      if (b.totalAvailable !== a.totalAvailable) return b.totalAvailable - a.totalAvailable;
      return 0;
    });

    return options;
  }

  /**
   * リーチ宣言の判断と捨て牌候補を返す
   * @param {Array} hand - 手牌
   * @param {Array} melds - 副露
   * @param {number} currentScore - 持ち点
   * @returns {Object} - { shouldRiichi, discardIndex }
   */
  shouldDeclareRiichi(hand, melds, currentScore) {
    if (melds.length > 0) {
      return { shouldRiichi: false, discardIndex: -1 };
    }

    if (currentScore < 1000) {
      return { shouldRiichi: false, discardIndex: -1 };
    }

    const options = this.getRiichiOptions(hand, melds);
    if (options.length === 0) {
      return { shouldRiichi: false, discardIndex: -1 };
    }

    const best = options[0];

    if (best.waitCount >= 2) {
      return { shouldRiichi: true, discardIndex: best.index };
    }

    if (best.waitCount === 1 && best.totalAvailable >= 3) {
      return { shouldRiichi: true, discardIndex: best.index };
    }

    return { shouldRiichi: false, discardIndex: -1 };
  }

  /**
   * ロン（他家の捨て牌で和了）をすべきかを判定
   * 基本的には常に true
   * @returns {boolean} - ロンをとるべき場合 true
   */
  shouldTakeRon() {
    // ロンは常に狙うべき
    return true;
  }

  /**
   * ツモ和了をすべきかを判定
   * 基本的には常に true
   * @returns {boolean} - 和了をしても良い場合 true
   */
  shouldWin() {
    // ツモ和了は常に和了すべき
    return true;
  }

  /**
   * 手牌の複合性を評価
   * スーツの集中度や連続性が高いほど複合性が高い
   * @param {Array} hand - 手牌
   * @returns {number} - 複合性スコア
   */
  evaluateHandComplexity(hand) {
    let complexityScore = 0;

    const suitsCount = {};
    hand.forEach((tile) => {
      suitsCount[tile.suit] = (suitsCount[tile.suit] || 0) + 1;
    });

    const suitCounts = Object.values(suitsCount).sort((a, b) => b - a);
    
    // メインスーツが集中している場合
    if (suitCounts[0] >= 6) {
      complexityScore += 40;
    } else if (suitCounts[0] >= 5) {
      complexityScore += 20;
    }

    // 連続する数字の数
    const numbers = {};
    hand.forEach((tile) => {
      if (tile.suit !== 'honor') {
        numbers[tile.number] = (numbers[tile.number] || 0) + 1;
      }
    });

    let sequenceBonus = 0;
    for (let i = 1; i < 8; i++) {
      if ((numbers[i] || 0) > 0 && (numbers[i + 1] || 0) > 0) {
        sequenceBonus += 5;
      }
    }
    complexityScore += sequenceBonus;

    return complexityScore;
  }

  /**
   * カン（槓）をすべきかを判定
   * @param {Array} hand - プレイヤーの手牌
   * @param {Array} melds - 副露（ポン・チーなど）
   * @param {boolean} isRiichi - リーチ状態かどうか
   * @returns {boolean} - カンをすべき場合 true
   */
  shouldKan(hand, melds = [], isRiichi = false) {
    // リーチ中はカンできない
    if (isRiichi) {
      return false;
    }

    //加槓（加えるカン）が可能か確認 - これが最も安全で価値のあるカン
    const addedKanPossible = this.getValidAddedKan(hand, melds);

    // 加槓が可能な場合は積極的に実行
    // （ドラが増えるし既存メルドは崩れない）
    if (addedKanPossible.length > 0) {
      console.log(`[AIPlayer.shouldKan] ✅ Can do added kan (加槓), will execute`);
      return true;
    }

    // 暗槓（隠れたカン）は複雑なので当面スキップ
    // （状態管理が複雑で、バグの原因になりやすい）
    console.log(`[AIPlayer.shouldKan] ❌ No safe kan opportunities (暗槓はスキップ)`);
    return false;
  }

  /**
   * 手牌から暗槓（4枚同じ牌）を取得
   * @param {Array} hand - 手牌
   * @returns {Array} - [牌オブジェクト, ...] 暗槓できる牌のリスト
   */
  getValidConcealedKan(hand) {
    const tileGroups = {};
    hand.forEach((tile) => {
      const key = `${tile.suit}-${tile.number}`;
      if (!tileGroups[key]) {
        tileGroups[key] = [];
      }
      tileGroups[key].push(tile);
    });

    const validKans = [];
    for (const key in tileGroups) {
      if (tileGroups[key].length === 4) {
        validKans.push(tileGroups[key][0]); // 代表タイルを追加
      }
    }

    return validKans;
  }

  /**
   * メルド内のポン（3枚同じ牌）に加槓（4枚目を追加）できる牌を取得
   * @param {Array} hand - 手牌
   * @param {Array} melds - 副露
   * @returns {Array} - [牌オブジェクト, ...] 加槓できる牌のリスト
   */
  getValidAddedKan(hand, melds = []) {
    const validKans = [];

    // メルド内の各ポンをチェック
    for (const meld of melds) {
      if (meld.length !== 3) continue; // ポン（3枚）のみ対象

      const meldTile = meld[0];

      // 手牌から対応する牌を探す
      const matchingTile = hand.find(
        t => t.suit === meldTile.suit && t.number === meldTile.number
      );

      if (matchingTile) {
        validKans.push(matchingTile);
      }
    }

    return validKans;
  }

  /**
   * 暗槓が手の品質を改善するかを判定
   * メルドがある場合の慎重な判定
   * @param {Array} hand - 手牌
   * @param {Array} melds - メルド
   * @param {Array} concealedKans - 暗槓可能な牌リスト（getValidConcealedKanの結果）
   * @returns {boolean}
   */
  canConcealedKanImproveHand(hand, melds, concealedKans = []) {
    if (concealedKans.length === 0) return false;

    const kanTile = concealedKans[0]; // 最初の暗槓候補を使用
    const kanKey = `${kanTile.suit}-${kanTile.number}`;

    // カン対象の4枚を除いた手牌をシミュレート
    const handAfterKan = hand.filter(
      t => !(t.suit === kanTile.suit && t.number === kanTile.number)
    );

    // カン後の待ちを確認
    const kanWaitTiles = TenpaiChecker.getWinningTiles(handAfterKan, melds);
    const kanWaitCount = new Set(
      kanWaitTiles.map(t => `${t.suit}-${t.number}`)
    ).size;

    // カンしない場合の待ちを確認
    const originalWaitTiles = TenpaiChecker.getWinningTiles(hand, melds);
    const originalWaitCount = new Set(
      originalWaitTiles.map(t => `${t.suit}-${t.number}`)
    ).size;

    // 待ち牌が増える or 変わらない場合は実行
    // ただし、完全に待ちがなくなる場合は避ける
    if (kanWaitCount === 0 && originalWaitCount > 0) {
      console.log(`[AIPlayer.canConcealedKanImproveHand] ❌ Kan destroys waiting tiles (${originalWaitCount} → 0)`);
      return false;
    }

    // 待ち牌が増えるか、メルド数が多い場合は実行
    if (kanWaitCount >= originalWaitCount) {
      console.log(`[AIPlayer.canConcealedKanImproveHand] ✅ Kan maintains or improves waiting (${originalWaitCount} → ${kanWaitCount})`);
      return true;
    }

    // リャンメン待ちなど高品質な形が作れるかチェック
    const kanHandQuality = this.evaluateHandQualityForKan(handAfterKan, melds, kanTile);
    if (kanHandQuality > 0.6) {
      console.log(`[AIPlayer.canConcealedKanImproveHand] ✅ Kan creates high-quality hand (quality: ${kanHandQuality})`);
      return true;
    }

    console.log(`[AIPlayer.canConcealedKanImproveHand] ❌ Kan does not sufficiently improve hand quality`);
    return false;
  }

  /**
   * カン後の手の品質を評価（0-1スコア）
   * 特に待ち牌の数と種類を重視
   * @param {Array} hand - カン後の手牌
   * @param {Array} melds - メルド
   * @param {Object} kanTile - カンした牌（参考用）
   * @returns {number} - 品質スコア（0-1）
   */
  evaluateHandQualityForKan(hand, melds, kanTile) {
    let quality = 0.5; // 基本値

    // 1. 待ち牌の数で評価
    const waitingTiles = TenpaiChecker.getWinningTiles(hand, melds);
    const uniqueWaitTiles = new Set(
      waitingTiles.map(t => `${t.suit}-${t.number}`)
    ).size;

    if (uniqueWaitTiles >= 4) {
      quality += 0.3; // 4種類以上の待ちがある
    } else if (uniqueWaitTiles >= 2) {
      quality += 0.15; // 2種類以上の待ちがある
    }

    // 2. メルド状態で評価
    if (melds.length >= 3) {
      quality -= 0.1; // メルドが多い場合は品質判定を厳しくする
    }

    return Math.max(0, Math.min(1, quality)); // 0-1でクリップ
  }
}

module.exports = AIPlayer;
