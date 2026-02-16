const MahjongLogic = require('./src/logic/MahjongLogic');
const Tile = require('./src/logic/Tile');
const GameRoom = require('./src/logic/GameRoom');

console.log('=== 七対子のツモ判定シミュレーション ===\n');

// ゲームルームの作成
const room = new GameRoom('test-room', { testMode: true });
room.addPlayer('player1', 'Player 1', null);
room.addPlayer('player2', 'Player 2', null);
room.start();

const game = room.gameLogic;

// Player 1 の手を七対子の聴牌状態に設定
console.log('【手牌の設定】');
console.log('Player 1 の手牌を七対子の聴牌状態に設定します');

// まず全ての手牌をクリア
game.players['player1'].hand = [];
game.players['player1'].melds = [];
game.players['player2'].hand = [];
game.players['player2'].melds = [];

// Player 1に七対子の聴牌状態（6対+1枚）を設定
game.players['player1'].hand = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6),
];

// Player 2 にダミーの手牌を設定
game.players['player2'].hand = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('honor', 1),
];

console.log('Player 1の手牌:', game.players['player1'].hand.map(t => `${t.suit}${t.number}`).join(','));
console.log('Player 1の手牌の枚数:', game.players['player1'].hand.length);
console.log();

// Player 1 が現在のターン
game.currentTurnIndex = 0;
console.log('【ツモ前の状態】');
console.log('現在のターン:', game.getCurrentTurn());
console.log('isWinningHand(player1):', game.isWinningHand('player1'));
console.log();

// ツモする（白の牌を追加）
console.log('【ツモ実行】');
console.log('白（honor 6）をツモします');

// 壁に白の牌があることを確認
console.log('壁の残り枚数:', game.wall.length);

// 直接ツモではなく、手牌に白を追加して検証
const whiteTile = new Tile('honor', 6);
game.players['player1'].hand.push(whiteTile);
game.players['player1'].drawnTile = whiteTile;
game.players['player1'].drawnTileIndex = game.players['player1'].hand.length - 1;

console.log('Player 1の手牌の枚数:', game.players['player1'].hand.length);
console.log('Player 1の手牌:', game.players['player1'].hand.map(t => `${t.suit}${t.number}`).join(','));
console.log();

// ツモ後の状態チェック
console.log('【ツモ後の状態】');
console.log('isWinningHand(player1):', game.isWinningHand('player1'));
console.log();

// GameRoom のゲームステートをチェック
console.log('【GameRoom.getGameState() のチェック】');
const gameState = room.getGameState();
console.log('canWinFor:', gameState.canWinFor);
console.log('ronPossibleFor:', gameState.ronPossibleFor);
console.log('currentTurn:', gameState.currentTurn);
console.log('Player 1のタイル情報:');
console.log('  - hand.length:', gameState.tiles['player1'].hand.length);
console.log('  - melds.length:', gameState.tiles['player1'].melds.length);
console.log('  - drawnTileIndex:', gameState.tiles['player1'].drawnTileIndex);
console.log();

console.log('=== テスト完了 ===');
