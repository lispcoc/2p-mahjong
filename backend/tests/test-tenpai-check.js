const MahjongLogic = require('./src/logic/MahjongLogic');
const Tile = require('./src/logic/Tile');

console.log('=== 聴牌判定テスト ===\n');

// プレイヤー作成
const playerIds = ['player1', 'player2'];
const playerScores = {
  'player1': 25000,
  'player2': 25000
};

const game = new MahjongLogic(playerIds, playerScores);
game.initialize();

// ユーザーの手牌: 22p123333456s北北 (13枚)
// 2pまたは北待ちのはず
game.players['player1'].hand = [
  new Tile('pin', 2),
  new Tile('pin', 2),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
  new Tile('sou', 3),
  new Tile('sou', 3),
  new Tile('sou', 3),
  new Tile('sou', 4),
  new Tile('sou', 5),
  new Tile('sou', 6),
  new Tile('honor', 4), // 北
  new Tile('honor', 4), // 北
];

console.log('【テスト手牌】');
const handStr = game.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌:', handStr);
console.log('枚数:', game.players['player1'].hand.length, '枚');
console.log('');

// 待ち牌をチェック
const waitingTiles = game.getWinningTiles(game.players['player1'].hand, game.players['player1'].melds);

console.log('【待ち牌判定結果】');
console.log('待ち牌の数:', waitingTiles.length);
if (waitingTiles.length > 0) {
  console.log('待ち牌:', waitingTiles.map(t => `${t.display}(${t.count}枚)`).join(', '));
} else {
  console.log('待ち牌なし（聴牌していない）');
}
console.log('');

// 各待ち牌で和了形になるかテスト
console.log('【和了形チェック】');
const testTiles = [
  new Tile('pin', 2), // 2p
  new Tile('honor', 4), // 北
  new Tile('sou', 3), // 3s（余分な3索）
];

testTiles.forEach((tile) => {
  const testHand = [...game.players['player1'].hand, tile];
  const isWinning = game.checkValidMeldStructure(testHand);
  console.log(`${tile.toString()}を加えた場合 (${testHand.length}枚):`, isWinning ? '✓ 和了形' : '✗ 和了形でない');
});
console.log('');

// 分解パターンを確認
console.log('【手牌分解パターン】');
console.log('パターン1: 雀頭=22p, メンツ=123s+333s+456s+北北北(不可)');
console.log('パターン2: 雀頭=北北, メンツ=222p+123s+333s+456s(22pは2枚なので不可)');
console.log('');
console.log('正解: 2pまたは北を1枚加えると和了形になる');
console.log('  2p追加 → 雀頭=北北, メンツ=222p+123s+333s+456s');
console.log('  北追加 → 雀頭=22p, メンツ=北北北+123s+333s+456s');
console.log('');

// リーチ判定テスト
console.log('【リーチ判定テスト】');
// ツモ牌を追加（14枚にする）
game.players['player1'].hand.push(new Tile('man', 5)); // 適当な牌
game.players['player1'].drawnTile = new Tile('man', 5);
game.players['player1'].drawnTileIndex = 13;

console.log('ツモ後の手牌:', game.players['player1'].hand.map(t => t.toString()).join(' '));
console.log('枚数:', game.players['player1'].hand.length, '枚');

// 5mを捨ててリーチしようとする
const riichiResult = game.declareRiichi('player1', 13);
console.log('リーチ判定:', riichiResult.success ? '✓ 成功' : '✗ 失敗');
if (!riichiResult.success) {
  console.log('エラー:', riichiResult.message);
}
if (riichiResult.waitingTiles) {
  console.log('待ち牌:', riichiResult.waitingTiles.map(t => t.display).join(', '));
}

console.log('\n=== テスト完了 ===');
