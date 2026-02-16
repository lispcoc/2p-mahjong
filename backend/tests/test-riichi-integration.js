const MahjongLogic = require('./src/logic/MahjongLogic');
const Tile = require('./src/logic/Tile');

console.log('=== リーチ機能の統合テスト ===\n');

// プレイヤー作成
const playerIds = ['player1', 'player2'];
const playerScores = {
  'player1': 25000,
  'player2': 25000
};

const game = new MahjongLogic(playerIds, playerScores);
game.initialize();

console.log('【初期状態】');
console.log('Player1 持ち点:', game.getPlayerScore('player1'));
console.log('Player2 持ち点:', game.getPlayerScore('player2'));
console.log('供託点:', game.getRiichiDeposits());
console.log('');

// 手牌を設定（テスト用）
// 聴牌形: 123m 234567p 345s 7s (13枚 + ツモ1枚 = 14枚)
// 7sツモで和了形になる
game.players['player1'].hand = [
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('pin', 2),
  new Tile('pin', 3),
  new Tile('pin', 4),
  new Tile('pin', 5),
  new Tile('pin', 6),
  new Tile('pin', 7),
  new Tile('sou', 3),
  new Tile('sou', 4),
  new Tile('sou', 5),
  new Tile('sou', 7),
  new Tile('sou', 6), // 14枚目（ツモ牌）- 実は6sをツモした
];
game.players['player1'].drawnTile = new Tile('sou', 6);
game.players['player1'].drawnTileIndex = 13; // 最後の牌

console.log('【Player1の手牌を聴牌形にセット】');
console.log('手牌: 123m 234567p 345s 7s + 6sツモ (14枚)');
console.log('聴牌形で6sツモ済み、7sを待っている状態');
console.log('');
console.log('');

// リーチ宣言を試行
console.log('【リーチ宣言テスト】');
const riichiResult = game.declareRiichi('player1', 12);
console.log('リーチ宣言結果:', riichiResult.success ? '成功' : '失敗');
console.log('メッセージ:', riichiResult.message);
if (riichiResult.success) {
  console.log('供託金:', riichiResult.deposit, '点');
  console.log('待ち牌:', riichiResult.waitingTiles?.length || 0, '種類');
}
console.log('');

console.log('【リーチ後の状態】');
console.log('Player1 持ち点:', game.getPlayerScore('player1'));
console.log('Player1 リーチ状態:', game.players['player1'].riichi);
console.log('供託点:', game.getRiichiDeposits());
console.log('');

// 和了をシミュレート
console.log('【和了テスト】');
game.players['player1'].hand.push(new Tile('sou', 7));
game.players['player1'].drawnTile = new Tile('sou', 7);

const scoreResult = game.calculateWinScore('player1', new Tile('sou', 7), true);
console.log('役:', scoreResult.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', ') || 'なし');
console.log('得点:', scoreResult.score);
console.log('');

// 点数精算をシミュレート
if (scoreResult.valid) {
  game.players['player1'].score += scoreResult.score;
  game.players['player2'].score -= scoreResult.score;
  
  // 供託点を獲得
  game.players['player1'].score += game.riichiDeposits;
  const deposits = game.riichiDeposits;
  game.riichiDeposits = 0;
  
  console.log('【精算後】');
  console.log('Player1 持ち点:', game.getPlayerScore('player1'), '点 (+' + (scoreResult.score + deposits) + '点)');
  console.log('Player2 持ち点:', game.getPlayerScore('player2'), '点 (-' + scoreResult.score + '点)');
  console.log('供託点:', game.getRiichiDeposits(), '点');
}

console.log('\n=== テスト完了 ===');
