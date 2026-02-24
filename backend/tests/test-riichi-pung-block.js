const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('Test: リーチ中のプレイヤーに対してポンが発生しないことを確認\n');

// Initialize game with two players
const game = new MahjongLogic(['player1', 'player2'], { player1: 25000, player2: 25000 });
game.initialize();

// Set up hands manually
// Player1: リーチ可能な手牌
game.players.player1.hand = [
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('pin', 2),
  new Tile('pin', 3),
  new Tile('pin', 4),
  new Tile('sou', 5),
  new Tile('sou', 6),
  new Tile('sou', 7),
  new Tile('man', 5),
  new Tile('man', 5),
  new Tile('man', 5),
  new Tile('pin', 9),
];

// Player2: 東をポン可能（3枚）持っている手牌
game.players.player2.hand = [
  new Tile('ji', 1), // 東
  new Tile('ji', 1), // 東
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('man', 4),
  new Tile('pin', 5),
  new Tile('pin', 6),
  new Tile('pin', 7),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
  new Tile('man', 8),
  new Tile('man', 8),
];

game.currentTurn = 'player1';
game.turnCount = 0;

console.log('初期状態:');
console.log('Player1の手牌:', game.players.player1.hand.length, '枚');
console.log('Player2の手牌:', game.players.player2.hand.length, '枚');
console.log('Player2は東を2枚持っている\n');

// Player1 draws a tile (to have 14 tiles for riichi)
const drawnTile = new Tile('pin', 9);
game.players.player1.hand.push(drawnTile);
game.players.player1.drawnTile = drawnTile;

console.log('Player1が牌を引いた（14枚）\n');

// Player1 declares riichi and discards 
console.log('Player1がリーチ宣言を行い、ピン9を捨てる...');
const riichiResult = game.declareRiichi('player1', 'pin_9');
console.log('リーチ結果:', riichiResult.success ? '成功' : '失敗', '-', riichiResult.message);
console.log('Player1のリーチ状態:', game.players.player1.riichi);
console.log('Player2のリーチ状態:', game.players.player2.riichi);
console.log('pendingPungFor:', game.pendingPungFor);
console.log();

// Now Player2 is in riichi
// Player2 should auto-draw since Player1 can't pung while in riichi
console.log('Player2のターンに自動ツモ...');
console.log('Player2の手牌:', game.players.player2.hand.length, '枚');
console.log('Player2のdrawnTile:', game.players.player2.drawnTile ? 'あり' : 'なし');
console.log();

// Now test: Player2 (in riichi) draws and auto-discards 東
// Player1 should NOT be able to pung because they are in riichi
if (game.players.player2.drawnTile) {
  console.log('Player2が牌を引いた後、東を捨てる準備...');
  
  // Player2もリーチ状態にする
  game.players.player2.riichi = true;
  console.log('Player2をリーチ状態にセット\n');
  
  // Add 東 to Player2's hand for discard
  const dongTile = new Tile('ji', 1);
  game.players.player2.hand.push(dongTile);
  game.players.player2.drawnTile = dongTile;
  
  console.log('Player2が東を捨てる...');
  const discardResult = game.handleDiscard('player2', 'ji_1');
  console.log('捨て牌結果:', discardResult.success ? '成功' : '失敗');
  console.log('pendingPungFor:', game.pendingPungFor || 'なし');
  console.log('現在のターン:', game.currentTurn);
  console.log();
  
  if (game.pendingPungFor === null || game.pendingPungFor !== 'player1') {
    console.log('✅ 成功: リーチ中のPlayer1に対してポン待ちが発生していない');
    console.log('✅ 自動ツモ切りが継続され、ゲームがストップしない');
  } else {
    console.log('❌ 失敗: リーチ中のPlayer1に対してポン待ちが発生している');
    console.log('❌ これによりゲームがストップする');
  }
  
  console.log();
  console.log('Player1の手牌:', game.players.player1.hand.length, '枚');
  console.log('Player1のdrawnTile:', game.players.player1.drawnTile ? 'あり' : 'なし');
  
  if (game.players.player1.drawnTile) {
    console.log('✅ Player1は自動的にツモを引いている');
  } else {
    console.log('❌ Player1はツモを引いていない（ゲームが停止）');
  }
}
