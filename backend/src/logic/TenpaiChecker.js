/**
 * TenpaiChecker - 聴牌判定ユーティリティ
 * サーバー・クライアント両側で使用可能
 */

class TenpaiChecker {
  /**
   * タイルを比較してソート順序を決定
   */
  static compareTiles(a, b) {
    const suitOrder = { man: 0, pin: 1, sou: 2, honor: 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.number - b.number;
  }

  /**
   * タイルの等価性を判定
   */
  static tileEquals(tile1, tile2) {
    return tile1.suit === tile2.suit && tile1.number === tile2.number;
  }

  /**
   * 有効なメルド構造をチェック（再帰的に複数の組み合わせを試行）
   * @param {Array} tiles - チェック対象のタイル配列
   * @returns {boolean} - 有効な構造ならtrue
   */
  static checkValidMeldStructure(tiles) {
    // 2枚以上必要（最小限のペア）
    if (tiles.length < 2) return false;

    // タイル数が n*3 + 2 の形式である必要がある（n個の組+1個のペア）
    if (tiles.length % 3 !== 2) return false;

    // タイル配列をクローンしてソート
    const tileCopy = tiles.slice().sort((a, b) => this.compareTiles(a, b));

    // ペアを見つけて、残りのタイルで有効な組が形成できるかチェック
    for (let i = 0; i < tileCopy.length - 1; i++) {
      if (this.tileEquals(tileCopy[i], tileCopy[i + 1])) {
        // ペアが見つかった、それを除いた残りをチェック
        const remaining = tileCopy.slice(0, i).concat(tileCopy.slice(i + 2));
        if (this.canFormSets(remaining)) {
          return true;
        }
        // 重要：最初のペアで止まらず、他のペアの組み合わせも試行
        // 次のタイルをスキップ（既にこのペアの一部としてチェック済み）
        i++;
      }
    }

    // 有効なペアが見つからない
    return false;
  }

  /**
   * 残りのタイルから有効な組（順子・刻子）を形成できるかチェック
   * @param {Array} tiles - チェック対象のタイル配列
   * @returns {boolean} - 有効な組が形成できるならtrue
   */
  static canFormSets(tiles) {
    // ベースケース：タイルが残っていない = 有効
    if (tiles.length === 0) return true;

    // 3の倍数である必要がある
    if (tiles.length % 3 !== 0) return false;

    // ソートして組の検出を容易にする
    const sorted = tiles.slice().sort((a, b) => this.compareTiles(a, b));
    const firstTile = sorted[0];

    // 最初のタイルを使った刻子（同じ3枚）の形成を試みる
    if (sorted.length >= 3 &&
      this.tileEquals(sorted[1], firstTile) &&
      this.tileEquals(sorted[2], firstTile)) {
      // 刻子が見つかった、それを除いた残りをチェック
      const remaining = sorted.slice(3);
      if (this.canFormSets(remaining)) {
        return true;
      }
    }

    // 最初のタイルを使った順子（連続する3枚）の形成を試みる
    if (firstTile.suit !== 'honor' && firstTile.number <= 7) {
      const suit = firstTile.suit;
      const num = firstTile.number;

      // num+1、num+2のタイルを探す
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
        // 順子が見つかった、3つのタイルを除いた残りをチェック
        const remaining = sorted.filter((_, idx) => idx !== 0 && idx !== idx1 && idx !== idx2);
        if (this.canFormSets(remaining)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * この手牌で和了可能なタイルをすべて求める
   * @param {Array} hand - 手牌のタイル配列
   * @param {Array} melds - 副露済みの組（組は3枚のタイル配列）
   * @returns {Array} - 和了可能なタイルのリスト
   */
  static getWinningTiles(hand, melds) {
    const winningTiles = [];
    const tileCountInHand = {};

    // 手牌のタイル数をカウント
    hand.forEach((tile) => {
      const key = `${tile.suit}_${tile.number}`;
      tileCountInHand[key] = (tileCountInHand[key] || 0) + 1;
    });

    // 副露済みタイルもカウント
    melds.forEach((meld) => {
      meld.forEach((tile) => {
        const key = `${tile.suit}_${tile.number}`;
        tileCountInHand[key] = (tileCountInHand[key] || 0) + 1;
      });
    });

    // 副露がない場合は七対子の聴牌も検査
    if (melds.length === 0) {
      const chiitoitsuWinners = this.getChiitoitsuWinningTiles(hand, tileCountInHand);
      chiitoitsuWinners.forEach(tile => {
        if (!winningTiles.some(t => t.suit === tile.suit && t.number === tile.number)) {
          winningTiles.push(tile);
        }
      });

      // 国士無双の聴牌も検査
      const kokushiWinners = this.getKokushiWinningTiles(hand, tileCountInHand);
      kokushiWinners.forEach(tile => {
        if (!winningTiles.some(t => t.suit === tile.suit && t.number === tile.number)) {
          winningTiles.push(tile);
        }
      });
    }

    // すべての可能なタイル種を試す
    const suits = ['man', 'pin', 'sou', 'honor'];
    const numbers = { 'man': 9, 'pin': 9, 'sou': 9, 'honor': 7 };

    suits.forEach((suit) => {
      for (let i = 1; i <= numbers[suit]; i++) {
        const key = `${suit}_${i}`;
        const tileCount = tileCountInHand[key] || 0;

        // 各タイルは最大4枚
        if (tileCount < 4) {
          // テストタイルを手牌に追加して和了形をチェック
          const testTile = { suit, number: i };
          const testHand = hand.concat([testTile]);

          if (this.checkValidMeldStructure(testHand)) {
            // 既に同じタイルがリストにないかチェック
            if (!winningTiles.some(t => t.suit === suit && t.number === i)) {
              winningTiles.push({
                suit: suit,
                number: i,
                display: this.getTileDisplay(suit, i),
                count: 4 - tileCount // 壁に残っている枚数
              });
            }
          }
        }
      }
    });

    return winningTiles;
  }

  /**
   * 七対子（チートイツ）の和了牌を判定
   * 13枚の手牌で「6対+1対の方向」を探す
   * @param {Array} hand - 手牌（13枚）
   * @param {Object} tileCountInHand - タイルのカウント
   * @returns {Array} - 和了可能なタイルのリスト
   */
  static getChiitoitsuWinningTiles(hand, tileCountInHand) {
    if (hand.length !== 13) {
      return [];
    }

    const winningTiles = [];
    const suits = ['man', 'pin', 'sou', 'honor'];
    const numbers = { 'man': 9, 'pin': 9, 'sou': 9, 'honor': 7 };

    suits.forEach((suit) => {
      for (let i = 1; i <= numbers[suit]; i++) {
        const key = `${suit}_${i}`;
        const tileCount = tileCountInHand[key] || 0;

        // 各タイルは最大4枚
        if (tileCount < 4) {
          // テストタイルを追加して14枚にして七対子判定
          const testTile = { suit, number: i };
          const testHand = hand.concat([testTile]);

          if (this.isChiitoitsu(testHand)) {
            if (!winningTiles.some(t => t.suit === suit && t.number === i)) {
              winningTiles.push({
                suit: suit,
                number: i,
                display: this.getTileDisplay(suit, i),
                count: 4 - tileCount
              });
            }
          }
        }
      }
    });

    return winningTiles;
  }

  /**
   * 七対子（チートイツ）判定
   * @param {Array} hand - 手牌（14枚必要）
   * @returns {boolean} - 七対子判定結果
   */
  static isChiitoitsu(hand) {
    if (hand.length !== 14) return false;

    const sorted = [...hand].sort((a, b) => this.compareTiles(a, b));

    // 7つの対子をチェック
    for (let i = 0; i < 14; i += 2) {
      if (!this.tileEquals(sorted[i], sorted[i + 1])) {
        return false;
      }
    }

    return true;
  }

  /**
   * 国士無双（こくしむそう）判定
   * 13種類のターミナルとオナー牌のそれぞれ1枚、そのうち1つは2枚
   * @param {Array} hand - 手牌（14枚必要）
   * @returns {boolean} - 国士無双判定結果
   */
  static isKokushi(hand) {
    if (hand.length !== 14) return false;

    const requiredTiles = [
      { suit: 'man', number: 1 },
      { suit: 'man', number: 9 },
      { suit: 'pin', number: 1 },
      { suit: 'pin', number: 9 },
      { suit: 'sou', number: 1 },
      { suit: 'sou', number: 9 },
      { suit: 'honor', number: 1 },
      { suit: 'honor', number: 2 },
      { suit: 'honor', number: 3 },
      { suit: 'honor', number: 4 },
      { suit: 'honor', number: 5 },
      { suit: 'honor', number: 6 },
      { suit: 'honor', number: 7 },
    ];

    const tileCount = {};
    for (const tile of hand) {
      const key = `${tile.suit}_${tile.number}`;
      tileCount[key] = (tileCount[key] || 0) + 1;
    }

    let pairCount = 0;
    let requiredCount = 0;

    for (const required of requiredTiles) {
      const key = `${required.suit}_${required.number}`;
      const count = tileCount[key] || 0;

      if (count !== 1 && count !== 2) {
        return false;
      }

      if (count === 2) {
        pairCount++;
      }

      requiredCount += count;
    }

    return pairCount === 1 && requiredCount === 14;
  }

  /**
   * 国士無双（こくしむそう）の和了牌を判定
   * 13枚の手牌で12種類のターミナル/オナーがあり、1つが2枚ないぶんを探す
   * @param {Array} hand - 手牌（13枚）
   * @param {Object} tileCountInHand - タイルのカウント
   * @returns {Array} - 和了可能なタイルのリスト
   */
  static getKokushiWinningTiles(hand, tileCountInHand) {
    if (hand.length !== 13) {
      return [];
    }

    const winningTiles = [];
    const requiredTiles = [
      { suit: 'man', number: 1 },
      { suit: 'man', number: 9 },
      { suit: 'pin', number: 1 },
      { suit: 'pin', number: 9 },
      { suit: 'sou', number: 1 },
      { suit: 'sou', number: 9 },
      { suit: 'honor', number: 1 },
      { suit: 'honor', number: 2 },
      { suit: 'honor', number: 3 },
      { suit: 'honor', number: 4 },
      { suit: 'honor', number: 5 },
      { suit: 'honor', number: 6 },
      { suit: 'honor', number: 7 },
    ];

    requiredTiles.forEach((required) => {
      const key = `${required.suit}_${required.number}`;
      const tileCount = tileCountInHand[key] || 0;

      if (tileCount < 4) {
        const testTile = required;
        const testHand = hand.concat([testTile]);

        if (this.isKokushi(testHand)) {
          if (!winningTiles.some(t => t.suit === required.suit && t.number === required.number)) {
            winningTiles.push({
              suit: required.suit,
              number: required.number,
              display: this.getTileDisplay(required.suit, required.number),
              count: 4 - tileCount
            });
          }
        }
      }
    });

    return winningTiles;
  }

  /**
   * タイルの表示文字を取得
   */
  static getTileDisplay(suit, number) {
    const suitChar = {
      man: '萬',
      pin: '筒',
      sou: '索'
    }[suit];

    const numberChar = {
      1: '一',
      2: '二',
      3: '三',
      4: '四',
      5: '五',
      6: '六',
      7: '七',
      8: '八',
      9: '九',
    }[number];

    if (suit === 'honor') {
      const honorChar = ['', '東', '南', '西', '北', '白', '發', '中'][number];
      return honorChar;
    }

    return `${numberChar}${suitChar}`;
  }

  /**
   * 牌を捨てた後に聴牌しているかチェック
   * @param {Array} hand - 手牌のタイル配列
   * @param {number} tileIndex - 捨てる牌のインデックス
   * @param {Array} melds - 副露済みの組
   * @returns {Object} - { isTenpai: boolean, winningTiles: Array }
   */
  static checkTenpaiAfterDiscard(hand, tileIndex, melds) {
    if (tileIndex < 0 || tileIndex >= hand.length) {
      return { isTenpai: false, winningTiles: [] };
    }

    // 牌を捨てたシミュレーション
    const testHand = hand.slice();
    testHand.splice(tileIndex, 1);

    // 捨て後のタイル数チェック
    // 聴牌は13枚（ツモで14枚になって和了）
    // カン(4枚)は構造上3枚分として数える（嶺上牌で1枚補充するため）
    const meldStructureTiles = melds.reduce((sum, m) => sum + Math.min(m.length, 3), 0);
    const totalTilesAfterDiscard = testHand.length + meldStructureTiles;

    if (totalTilesAfterDiscard !== 13) {
      return { isTenpai: false, winningTiles: [] };
    }

    // この手牌での和了牌を取得
    const winningTiles = this.getWinningTiles(testHand, melds);

    return {
      isTenpai: winningTiles.length > 0,
      winningTiles: winningTiles
    };
  }

  /**
   * すべての手牌について聴牌判定を実行
   * @param {Array} hand - 手牌のタイル配列
   * @param {Array} melds - 副露済みの組
   * @returns {Object} - { [tileIndex]: { isTenpai, winningTiles } }
   */
  static checkAllTenpai(hand, melds) {
    const results = {};
    for (let tileIndex = 0; tileIndex < hand.length; tileIndex++) {
      const result = this.checkTenpaiAfterDiscard(hand, tileIndex, melds);
      results[tileIndex] = result;
    }
    return results;
  }
}

// Node.js環境での export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TenpaiChecker;
}
