const Tile = require('./src/logic/Tile');
const MahjongLogic = require('./src/logic/MahjongLogic');

// テスト用の手牌：6788m23p11124s中中
// つまり：6m, 7m, 8m, 8m, 2p, 3p, 1s, 1s, 1s, 2s, 4s, 中, 中

const testHand = [
  new Tile('man', 6),
  new Tile('man', 7),
  new Tile('man', 8),
  new Tile('man', 8),
  new Tile('pin', 2),
  new Tile('pin', 3),
  new Tile('sou', 1),
  new Tile('sou', 1),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 4),
  new Tile('honor', 7), // 中
  new Tile('honor', 7), // 中
];

console.log('=========================================');
console.log('テスト手牌：6788m23p11124s中中');
console.log('手牌サイズ:', testHand.length);
console.log('手牌:', testHand.map(t => t.toString()).join(' '));
console.log('=========================================\n');

// MahjongLogicのインスタンスを作成
const dummyGame = new MahjongLogic(['player1', 'player2']);

// getWinningTilesをテスト
console.log('🔍 待ち牌チェック：');
const waitingTiles = dummyGame.getWinningTiles(testHand, []);

if (waitingTiles.length > 0) {
  console.log(`✅ 待ち牌が見つかりました（${waitingTiles.length}個）:`);
  waitingTiles.forEach(tile => {
    console.log(`  - ${tile.display} (残り${tile.count}枚)`);
  });
} else {
  console.log('❌ 待ち牌が見つかりません。この手牌は聴牌していません。');
}

console.log('\n各種チェック：');

// checkValidMeldStructureをテスト
console.log('1. 和了形チェック:');
const suits = ['man', 'pin', 'sou', 'honor'];
const numbers = { 'man': 9, 'pin': 9, 'sou': 9, 'honor': 7 };

let foundValidWin = false;
suits.forEach((suit) => {
  for (let i = 1; i <= numbers[suit]; i++) {
    const testTile = new Tile(suit, i);
    const testHandWithTile = testHand.concat([testTile]);
    
    const isValid = dummyGame.checkValidMeldStructure(testHandWithTile);
    if (isValid) {
      console.log(`   ✅ ${testTile.toString()}を加えると和了形になります`);
      foundValidWin = true;
      
      // 詳細をログ
      console.log(`      手牌: ${testHandWithTile.map(t => t.toString()).join(' ')} (${testHandWithTile.length}枚)`);
    }
  }
});

if (!foundValidWin) {
  console.log('   ❌ どの牌を加えても和了形になりません');
}

console.log('\n=========================================');
console.log('結論：この手牌は聴牌しているか？');
if (waitingTiles.length > 0) {
  console.log('⚠️  聴牌している（結果：リーチ可能）');
} else {
  console.log('✅ 聴牌していない（結果：リーチ不可能 ← ただしユーザーはリーチできたと報告）');
}
console.log('=========================================');
