const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const GameRoom = require('../src/logic/GameRoom');

console.log('=== 七対子のゲームシナリオテスト ===\n');

// ゲームルームの作成と開始
const room = new GameRoom('test-room', { testMode: true });
room.addPlayer('player1', 'Player1', null);
room.addPlayer('player2', 'Player2', null);
room.start();

const game = room.gameLogic;

// プレイヤーの初期手が設定されたので表示
console.log('【初期状態】');
console.log('Player1の手牌数:', game.players['player1'].hand.length);
console.log('Player2の手牌数:', game.players['player2'].hand.length);
console.log();

// Player 1 を七対子の聴牌状態に手動で設定
console.log('【手牌の調整】');
game.players['player1'].hand = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6),
];
game.players['player1'].melds = [];
game.currentTurnIndex = 0; // Player1がターン中

console.log('Player1の手牌:', game.players['player1'].hand.map(t => `${t.suit}${t.number}`).join(','));
console.log('Player1の手牌数:', game.players['player1'].hand.length);
console.log();

// ツモ前の状態を確認
console.log('【ツモ前のGameState】');
let gameState = room.getGameState();
console.log('gameState.canWinFor:', gameState.canWinFor);
console.log('gameState.currentTurn:', gameState.currentTurn);
console.log('isWinningHand("player1"):', game.isWinningHand('player1'));
console.log();

// ツモ（白を追加）
console.log('【ツモ実行】');
const whiteTile = new Tile('honor', 6);
game.players['player1'].hand.push(whiteTile);
game.players['player1'].drawnTile = whiteTile;
game.players['player1'].drawnTileIndex = game.players['player1'].hand.length - 1;

console.log('Player1の手牌:', game.players['player1'].hand.map(t => `${t.suit}${t.number}`).join(','));
console.log('Player1の手牌数:', game.players['player1'].hand.length);
console.log('isWinningHand("player1"):', game.isWinningHand('player1'));
console.log('isChiitoitsu():', game.isChiitoitsu(game.players['player1'].hand));
console.log();

// ツモ後のゲームステート
console.log('【ツモ後のGameState】');
gameState = room.getGameState();
console.log('gameState.canWinFor:', gameState.canWinFor);
console.log('gameState.currentTurn:', gameState.currentTurn);
console.log('gameState.tiles["player1"].hand.length:', gameState.tiles['player1'].hand.length);
console.log('gameState.tiles["player1"].drawnTileIndex:', gameState.tiles['player1'].drawnTileIndex);
console.log();

// Player1のアクション処理
console.log('【Player1 のツモ和了を処理】');
const winResult = room.handlePlayerAction('player1', { type: 'win' });
console.log('ツモ和了の結果:', winResult);
console.log();

// ゲーム終了後の状態
console.log('【ゲーム終了後】');
console.log('room.status:', room.status);
console.log('room.getGameState().status:', room.getGameState().status);
const finalGameState = room.getGameState();
if (finalGameState.scoreResult) {
  console.log('scoreResult:', finalGameState.scoreResult);
}
console.log();

console.log('=== テスト完了 ===');
