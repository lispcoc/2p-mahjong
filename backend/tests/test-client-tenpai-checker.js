// Node.js で TypeScript の TenpaiChecker をテスト
// 実装は同じなので、機能的には同じはず

class TenpaiChecker {
  static compareTiles(a, b) {
    const suitOrder = { man: 0, pin: 1, sou: 2, honor: 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.number - b.number;
  }

  static tileEquals(tile1, tile2) {
    return tile1.suit === tile2.suit && tile1.number === tile2.number;
  }

  static checkValidMeldStructure(tiles) {
    if (tiles.length < 2) return false;
    if (tiles.length % 3 !== 2) return false;

    const tileCopy = tiles.slice().sort((a, b) => this.compareTiles(a, b));

    for (let i = 0; i < tileCopy.length - 1; i++) {
      if (this.tileEquals(tileCopy[i], tileCopy[i + 1])) {
        const remaining = tileCopy.slice(0, i).concat(tileCopy.slice(i + 2));
        if (this.canFormSets(remaining)) {
          return true;
        }
        i++;
      }
    }

    return false;
  }

  static canFormSets(tiles) {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;

    const sorted = tiles.slice().sort((a, b) => this.compareTiles(a, b));
    const firstTile = sorted[0];

    if (sorted.length >= 3 &&
      this.tileEquals(sorted[1], firstTile) &&
      this.tileEquals(sorted[2], firstTile)) {
      const remaining = sorted.slice(3);
      if (this.canFormSets(remaining)) {
        return true;
      }
    }

    if (firstTile.suit !== 'honor' && firstTile.number <= 7) {
      const suit = firstTile.suit;
      const num = firstTile.number;

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
        const remaining = sorted.filter((_, idx) => idx !== 0 && idx !== idx1 && idx !== idx2);
        if (this.canFormSets(remaining)) {
          return true;
        }
      }
    }

    return false;
  }

  static getWinningTiles(hand, melds) {
    const winningTiles = [];
    const tileCountInHand = {};

    hand.forEach((tile) => {
      const key = `${tile.suit}_${tile.number}`;
      tileCountInHand[key] = (tileCountInHand[key] || 0) + 1;
    });

    melds.forEach((meld) => {
      meld.forEach((tile) => {
        const key = `${tile.suit}_${tile.number}`;
        tileCountInHand[key] = (tileCountInHand[key] || 0) + 1;
      });
    });

    const suits = ['man', 'pin', 'sou', 'honor'];
    const numbers = { 'man': 9, 'pin': 9, 'sou': 9, 'honor': 7 };

    suits.forEach((suit) => {
      for (let i = 1; i <= numbers[suit]; i++) {
        const key = `${suit}_${i}`;
        const tileCount = tileCountInHand[key] || 0;

        if (tileCount < 4) {
          const testTile = { suit, number: i };
          const testHand = hand.concat([testTile]);

          if (this.checkValidMeldStructure(testHand)) {
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

  static getTileDisplay(suit, number) {
    const suitChar = {
      man: '萬',
      pin: '筒',
      sou: '索'
    };

    const numberChar = {
      '1': '一',
      '2': '二',
      '3': '三',
      '4': '四',
      '5': '五',
      '6': '六',
      '7': '七',
      '8': '八',
      '9': '九',
    };

    if (suit === 'honor') {
      const honorChar = ['', '東', '南', '西', '北', '白', '發', '中'][number];
      return honorChar;
    }

    return `${numberChar[String(number)]}${suitChar[suit]}`;
  }

  static checkTenpaiAfterDiscard(hand, tileIndex, melds) {
    if (tileIndex < 0 || tileIndex >= hand.length) {
      return { isTenpai: false, winningTiles: [] };
    }

    const testHand = hand.slice();
    testHand.splice(tileIndex, 1);

    const totalTilesAfterDiscard = testHand.length + melds.reduce((sum, m) => sum + Math.min(m.length, 3), 0);

    if (totalTilesAfterDiscard !== 13) {
      return { isTenpai: false, winningTiles: [] };
    }

    const winningTiles = this.getWinningTiles(testHand, melds);

    return {
      isTenpai: winningTiles.length > 0,
      winningTiles: winningTiles
    };
  }

  static checkAllTenpai(hand, melds) {
    const results = {};
    for (let tileIndex = 0; tileIndex < hand.length; tileIndex++) {
      const result = this.checkTenpaiAfterDiscard(hand, tileIndex, melds);
      results[tileIndex] = result;
    }
    return results;
  }
}

// テスト実行
const hand = [
  { suit: 'man', number: 1 },
  { suit: 'man', number: 2 },
  { suit: 'man', number: 2 },
  { suit: 'man', number: 3 },
  { suit: 'man', number: 3 },
  { suit: 'pin', number: 7 },
  { suit: 'pin', number: 7 },
  { suit: 'pin', number: 8 },
  { suit: 'sou', number: 1 },
  { suit: 'sou', number: 2 },
  { suit: 'sou', number: 3 },
  { suit: 'sou', number: 7 },
  { suit: 'sou', number: 8 },
];

const melds = [];

console.log('========================================');
console.log('クライアント側 TenpaiChecker テスト');
console.log('手牌: 12233m778p12378s');
console.log('========================================\n');

// 全牌の聴牌チェック
const allTenpaiResults = TenpaiChecker.checkAllTenpai(hand, melds);

console.log('各牌を捨てた場合の聴牌判定:');
let isTenpaiCount = 0;
Object.entries(allTenpaiResults).forEach(([idx, result]) => {
  const tile = hand[idx];
  const display = TenpaiChecker.getTileDisplay(tile.suit, tile.number);
  if (result.isTenpai) {
    console.log(`  [${idx}] ${display}: ✅ 聴牌 (待ち: ${result.winningTiles.map(t => t.display).join(', ')})`);
    isTenpaiCount++;
  } else {
    console.log(`  [${idx}] ${display}: ❌ 聴牌していない`);
  }
});

console.log('\n========================================');
if (isTenpaiCount === 0) {
  console.log('❌ どの牌を捨てても聴牌していない（リーチ不可）');
} else {
  console.log(`⚠️  ${isTenpaiCount} 個の牌で聴牌している`);
}
console.log('========================================');
