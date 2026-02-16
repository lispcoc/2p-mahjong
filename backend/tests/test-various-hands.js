// 様々な手牌パターンをテスト

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
              });
            }
          }
        }
      }
    });

    return winningTiles;
  }

  static checkAllTenpai(hand, melds) {
    const results = {};
    for (let tileIndex = 0; tileIndex < hand.length; tileIndex++) {
      const testHand = hand.slice();
      testHand.splice(tileIndex, 1);

      const totalTilesAfterDiscard = testHand.length + (melds.length * 3);

      if (totalTilesAfterDiscard !== 13) {
        results[tileIndex] = { isTenpai: false, winningTiles: [] };
      } else {
        const winningTiles = this.getWinningTiles(testHand, melds);
        results[tileIndex] = {
          isTenpai: winningTiles.length > 0,
          winningTiles: winningTiles
        };
      }
    }
    return results;
  }
}

// テストパターン
const patterns = [
  {
    name: '13枚: 12233m778p12378s',
    tiles: [
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
    ]
  },
  // パターン2: もし牌が不正にソートされていて異なる配置だった場合
  {
    name: '13枚: ランダム順 12233m778p12378s',
    tiles: [
      { suit: 'pin', number: 7 },
      { suit: 'man', number: 1 },
      { suit: 'sou', number: 2 },
      { suit: 'man', number: 2 },
      { suit: 'sou', number: 7 },
      { suit: 'pin', number: 7 },
      { suit: 'man', number: 2 },
      { suit: 'man', number: 3 },
      { suit: 'pin', number: 8 },
      { suit: 'sou', number: 8 },
      { suit: 'sou', number: 3 },
      { suit: 'sou', number: 1 },
      { suit: 'man', number: 3 },
    ]
  },
  // パターン3: もし6mが含まれていた場合
  {
    name: '13枚: 123456m77p12378s',
    tiles: [
      { suit: 'man', number: 1 },
      { suit: 'man', number: 2 },
      { suit: 'man', number: 3 },
      { suit: 'man', number: 4 },
      { suit: 'man', number: 5 },
      { suit: 'man', number: 6 },
      { suit: 'pin', number: 7 },
      { suit: 'pin', number: 7 },
      { suit: 'sou', number: 1 },
      { suit: 'sou', number: 2 },
      { suit: 'sou', number: 3 },
      { suit: 'sou', number: 7 },
      { suit: 'sou', number: 8 },
    ]
  }
];

patterns.forEach(pattern => {
  const results = TenpaiChecker.checkAllTenpai(pattern.tiles, []);
  const tenpaiCount = Object.values(results).filter(r => r.isTenpai).length;
  
  console.log(`\n【${pattern.name}】`);
  console.log(`枚数: ${pattern.tiles.length}`);
  console.log(`聴牌できる牌: ${tenpaiCount} 個`);
  
  if (tenpaiCount > 0) {
    console.log('リーチ可能な牌:');
    Object.entries(results).forEach(([idx, result]) => {
      if (result.isTenpai) {
        console.log(`  [${idx}]: ${pattern.tiles[idx].number}${pattern.tiles[idx].suit}`);
      }
    });
  }
});
