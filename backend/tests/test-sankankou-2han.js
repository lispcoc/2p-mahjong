const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 Testing 三槓子 as 2-han yaku...\n');

// Test: 三槓子で和了 (should be 2 han, not 13)
console.log('📋 Test: 三槓子（2翻）+ ツモ（1翻） = 3翻');
const game = new MahjongLogic(['player1', 'player2']);
game.initialize();
game.dealTiles();

const p1Hand = game.players['player1'].hand;
p1Hand.length = 0;

// Setup: 3 kans (12 tiles) + pair (2 tiles) = 14 tiles
game.players['player1'].melds = [
  [new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), new Tile('man', 5)],
  [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)],
  [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)],
];

// 対子（2枚）
p1Hand.push(new Tile('honor', 2));
p1Hand.push(new Tile('honor', 2));

const winTile = new Tile('honor', 2);
console.log(`  Player1 melds: 3x 槓 (man 5x4, pin 3x4, sou 7x4)`);
console.log(`  Player1 hand: honor 2 x2`);
console.log(`  Winning tile: ${winTile.toString()} (ツモで和了)`);

const score = game.calculateWinScore('player1', winTile, true);
console.log(`  Win valid: ${score.valid}`);
if (score.valid) {
  console.log(`  Yaku:`);
  score.yaku.forEach(y => console.log(`    - ${y.name}: ${y.han}翻`));
  console.log(`  Total han: ${score.han}`);
  console.log(`  Score: ${score.score}`);
  
  const sankanYaku = score.yaku.find(y => y.name === '三槓子');
  if (sankanYaku) {
    console.log(`  ✅ 三槓子 detected with ${sankanYaku.han}翻 ${sankanYaku.han === 2 ? '✅ CORRECT' : '❌ WRONG'}`);
  } else {
    console.log(`  ❌ 三槓子 not detected`);
  }
} else {
  console.log(`  Error: ${score.error}`);
  console.log(`  (Note: This is expected if no other yaku exists with 三槓子)`);
}

