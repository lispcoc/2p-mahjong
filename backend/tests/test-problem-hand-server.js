const MahjongLogic = require('../src/logic/MahjongLogic.js');
const Tile = require('../src/logic/Tile.js');

// ゲーム初期化
const game = new MahjongLogic(['player1', 'player2']);
game.initialize();
game.dealTiles();

// 問題の手牌を自動設定: 12233m778p12378s
const problemHand = [
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('man', 3),
  new Tile('pin', 7),
  new Tile('pin', 7),
  new Tile('pin', 8),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
  new Tile('sou', 7),
  new Tile('sou', 8),
];

console.log('========================================');
console.log('MahjongLogic サーバー側テスト');
console.log('手牌: 12233m778p12378s');
console.log('========================================\n');

// player1 の手牌を置き換え
game.players['player1'].hand = problemHand;
game.players['player1'].drawnTile = null;
game.players['player1'].drawnTileIndex = -1;
game.players['player1'].score = 25000;

// 有効な和了形かチェック
const isValid = game.checkValidMeldStructure(problemHand);
console.log(`checkValidMeldStructure(手牌): ${isValid}`);

// 待ち牌をチェック
const winningTiles = game.getWinningTiles(problemHand, []);
console.log(`getWinningTiles(): ${winningTiles.length} 種類`);
if (winningTiles.length > 0) {
  console.log('待ち牌:');
  winningTiles.forEach(t => {
    console.log(`  - ${t.display}`);
  });
} else {
  console.log('❌ 待ち牌なし（聴牌していない）');
}

console.log('\n========================================');
console.log('リーチ宣言テスト\n');

// リーチ宣言を試みる（7m を捨てる）
const riichiResult = game.declareRiichi('player1', 'man_1');
console.log('declareRiichi("player1", "man_1") 結果:');
console.log('  success:', riichiResult.success);
console.log('  message:', riichiResult.message);
if (riichiResult.success) {
  console.log('  ⚠️  リーチが成功してしまった！');
  if (riichiResult.waitingTiles) {
    console.log('  待ち牌:', riichiResult.waitingTiles.map(t => t.display).join(', '));
  }
}
