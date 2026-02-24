const TenpaiChecker = require('../src/logic/TenpaiChecker.js');

// 問題の手牌: 12233m778p12378s
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
console.log('問題の手牌テスト');
console.log('手牌: 12233m778p12378s');
console.log('枚数:', hand.length);
console.log('========================================\n');

// この手牌で聴牌判定を実行
const winningTiles = TenpaiChecker.getWinningTiles(hand, melds);

console.log('待ち牌一覧:');
if (winningTiles.length === 0) {
  console.log('❌ 待ち牌なし（聴牌していない）');
} else {
  console.log(`✅ 待ち牌あり（${winningTiles.length}種類）:`);
  winningTiles.forEach(tile => {
    console.log(`  - ${tile.display} (${tile.suit}_${tile.number})`);
  });
}

console.log('\n========================================');
console.log('デバッグ: 有効な和了形をチェック\n');

// 各牌をツモった場合に和了形になるかチェック
const suits = ['man', 'pin', 'sou', 'honor'];
const numbers = { 'man': 9, 'pin': 9, 'sou': 9, 'honor': 7 };

let foundValidForm = false;

suits.forEach((suit) => {
  for (let i = 1; i <= numbers[suit]; i++) {
    const testTile = { suit, number: i };
    const testHand = hand.concat([testTile]);
    
    if (TenpaiChecker.checkValidMeldStructure(testHand)) {
      console.log(`✅ ${i}${suit} をツモったら和了形になります: ${testTile.display}`);
      foundValidForm = true;
    }
  }
});

if (!foundValidForm) {
  console.log('❌ どの牌をツモっても和了形になりません（聴牌していない）');
}

console.log('========================================');
