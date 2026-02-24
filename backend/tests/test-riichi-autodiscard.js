const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('=== リーチ後の自動ツモ切りテスト ===\n');

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
console.log('');

// 手牌を設定（テスト用）
// 聴牌形: 123m 234567p 345s 6s (13枚)
// 6sツモで和了、他の牌は和了できない
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
  new Tile('sou', 6), // 13枚
];

console.log('【Player1の手牌を聴牌形にセット】');
console.log('手牌: 123m 234567p 3456s (13枚)');
console.log('6sツモで和了、他の牌は和了できない状態');
console.log('');

// Player1にツモさせる（和了できない牌）
game.players['player1'].hand.push(new Tile('man', 5));
game.players['player1'].drawnTile = new Tile('man', 5);
game.players['player1'].drawnTileIndex = 13;

console.log('【テスト1: リーチ前のツモ切り】');
console.log('5mをツモ（和了できない）');
const hand1Before = game.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌（ツモ前）:', hand1Before);

// リーチを設定
game.players['player1'].riichi = true;
game.players['player1'].riichiTurn = 0;
game.players['player1'].score = 24000;
game.riichiDeposits = 1000;

console.log('\n【リーチ状態を設定】');
console.log('Player1 リーチ状態:', game.players['player1'].riichi);
console.log('');

// ツモ切り実行
console.log('【テスト2: リーチ後の手動ツモ切り】');
const discardResult = game.handleDiscard('player1', null);
console.log('ツモ切り結果:', discardResult.success ? '成功' : '失敗');
console.log('自動捨て:', discardResult.autoDiscard || false);

const hand1After = game.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌（ツモ切り後）:', hand1After);
console.log('捨て牌:', game.players['player1'].discards.map(t => t.toString()).join(' '));
console.log('');

// 新しいゲームで自動ツモ切りをテスト
console.log('\n=== 自動ツモ切りテスト ===\n');

const game2 = new MahjongLogic(playerIds, playerScores);
game2.initialize();

// 同じ手牌を設定
game2.players['player1'].hand = [
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
  new Tile('sou', 6),
];

// リーチを設定
game2.players['player1'].riichi = true;
game2.players['player1'].riichiTurn = 0;
game2.players['player1'].score = 24000;
game2.riichiDeposits = 1000;

console.log('【Player1の手牌を聴牌形にセット】');
console.log('手牌: 123m 234567p 3456s (13枚)');
console.log('リーチ状態: true');
console.log('');

// 壁に和了できない牌を追加
game2.wall = [];
for (let i = 0; i < 10; i++) {
  game2.wall.push(new Tile('man', 5 + (i % 4)));
}

console.log('【テスト3: リーチ後の自動ツモ（和了できない牌）】');
const hand2Before = game2.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌（ツモ前）:', hand2Before, `(${game2.players['player1'].hand.length}枚)`);

const drawResult = game2.drawForTurn('player1');
console.log('ツモ結果:', drawResult.success ? '成功' : '失敗');
console.log('自動捨て:', drawResult.autoDiscard || false);

const hand2After = game2.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌（ツモ後）:', hand2After, `(${game2.players['player1'].hand.length}枚)`);
console.log('捨て牌:', game2.players['player1'].discards.map(t => t.toString()).join(' '));
console.log('');

// 和了できる牌でテスト
console.log('【テスト4: リーチ後の自動ツモ（和了できる牌）】');
game2.wall.push(new Tile('sou', 6));
game2.players['player1'].drawnTile = null;
game2.players['player1'].drawnTileIndex = -1;

const hand3Before = game2.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌（ツモ前）:', hand3Before, `(${game2.players['player1'].hand.length}枚)`);

const drawResult2 = game2.drawForTurn('player1');
console.log('ツモ結果:', drawResult2.success ? '成功' : '失敗');
console.log('自動捨て:', drawResult2.autoDiscard || false);

const hand3After = game2.players['player1'].hand.map(t => t.toString()).join(' ');
console.log('手牌（ツモ後）:', hand3After, `(${game2.players['player1'].hand.length}枚)`);
console.log('和了可能:', game2.isWinningHand('player1'));
console.log('');

console.log('=== テスト完了 ===');
