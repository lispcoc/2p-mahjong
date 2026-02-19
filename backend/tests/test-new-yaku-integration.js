const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 Testing new Yaku integration with actual game win scenarios...\n');

// Test 1: 四槓子で和了
console.log('📋 Test 1: 四槓子で和了');
const game1 = new MahjongLogic(['player1', 'player2']);
game1.initialize();
game1.dealTiles();

const p1Hand = game1.players['player1'].hand;
p1Hand.length = 0;

// Setup: 4 kans + 1 winning tile pair
game1.players['player1'].melds = [
  [new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), new Tile('man', 5)],
  [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)],
  [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)],
  [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)],
];

p1Hand.push(new Tile('honor', 2));
p1Hand.push(new Tile('honor', 2));

const winTile1 = new Tile('honor', 2);
console.log(`  Player1 hand: ${p1Hand.map(t => t.toString()).join(', ')}`);
console.log(`  Player1 melds: 4x 槓`);

const score1 = game1.calculateWinScore('player1', winTile1, true);
console.log(`  Win score: ${JSON.stringify(score1, null, 2)}`);
const hasYaku1 = score1.yaku && score1.yaku.some(y => y.name === '四槓子');
console.log(`  Has 四槓子 yaku: ${hasYaku1} ${hasYaku1 ? '✅' : '❌'}`);
console.log('');

// Test 2: 緑一色で和了
console.log('📋 Test 2: 緑一色で和了');
const game2 = new MahjongLogic(['player1', 'player2']);
game2.initialize();
game2.dealTiles();

const p2Hand = game2.players['player1'].hand;
p2Hand.length = 0;

// Setup: 緑一色の手牌 (pin 2,3,4,6,8 + honor 6)
// 14牌必要：pin 2x2, 3x2, 4x2, 6x4, 8x2, honor 6 (發) x1
p2Hand.push(new Tile('pin', 2));
p2Hand.push(new Tile('pin', 2));
p2Hand.push(new Tile('pin', 3));
p2Hand.push(new Tile('pin', 3));
p2Hand.push(new Tile('pin', 4));
p2Hand.push(new Tile('pin', 4));
p2Hand.push(new Tile('pin', 6)); // 3枚
p2Hand.push(new Tile('pin', 6));
p2Hand.push(new Tile('pin', 6));
p2Hand.push(new Tile('pin', 8));
p2Hand.push(new Tile('pin', 8));
p2Hand.push(new Tile('honor', 6)); // 發
p2Hand.push(new Tile('honor', 6)); // 發
p2Hand.push(new Tile('pin', 6));   // 4枚目

const winTile2 = new Tile('pin', 2);
console.log(`  Player1 hand contains: pin 2x2, 3x2, 4x2, 6x4, 8x2 + honor 6 (發)`);
console.log(`  Total tiles: ${p2Hand.length}`);

const score2 = game2.calculateWinScore('player1', winTile2, true);
console.log(`  Win score valid: ${score2.valid}`);
if (score2.valid) {
  console.log(`  Yaku: ${score2.yaku.map(y => y.name).join(', ')}`);
}
const hasYaku2 = score2.yaku && score2.yaku.some(y => y.name === '緑一色');
console.log(`  Has 緑一色 yaku: ${hasYaku2} ${hasYaku2 ? '✅' : '❌'}`);
console.log('');

// Test 3: 大車輪で和了
console.log('📋 Test 3: 大車輪で和了');
const game3 = new MahjongLogic(['player1', 'player2']);
game3.initialize();
game3.dealTiles();

const p3Hand = game3.players['player1'].hand;
p3Hand.length = 0;

// Setup: 大車輪の手牌 (pin 2-8)
for (let num = 2; num <= 8; num++) {
  for (let i = 0; i < 2; i++) {
    p3Hand.push(new Tile('pin', num));
  }
}

const winTile3 = new Tile('pin', 2);
console.log(`  Player1 hand contains: pin 2,3,4,5,6,7,8 each x2`);

const score3 = game3.calculateWinScore('player1', winTile3, true);
console.log(`  Win score: ${JSON.stringify(score3, null, 2)}`);
const hasYaku3 = score3.yaku && score3.yaku.some(y => y.name === '大車輪');
console.log(`  Has 大車輪 yaku: ${hasYaku3} ${hasYaku3 ? '✅' : '❌'}`);
console.log('');

console.log('✅ Integration tests complete!');
