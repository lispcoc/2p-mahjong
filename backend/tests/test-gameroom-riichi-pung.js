#!/usr/bin/env node

const GameRoom = require('./src/logic/GameRoom');
const Tile = require('./src/logic/Tile');

console.log('\n========== GameRoom 統合テスト：立直とメルド ==========\n');

// ゲームルームを作成
const room = new GameRoom('testRoom', { testMode: true }, ['player1', 'player2']);

// ゲームを初期化
room.players.set('player1', { autoDrawMode: false });
room.players.set('player2', { autoDrawMode: false });

room.start();

// 初期ゲーム状態を確認
console.log('初期状態:');
console.log('  currentTurn:', room.getGameState().currentTurn);
console.log('  pendingPungFor:', room.getGameState().pendingPungFor);

// player1の手牌を七対子にセット
const player1Logic = room.gameLogic;
player1Logic.players['player1'].hand = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2),  new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('sou', 2)  // 13枚で七対子の待ち
];

// player2の手牌からs2を削除（メルド可能にする）
const s2Idx = player1Logic.players['player2'].hand.findIndex(t => t.suit === 'sou' && t.number === 2);
if (s2Idx >= 0) {
  player1Logic.players['player2'].hand.splice(s2Idx, 1);
}

console.log('\n--- ステップ1：Player1が立直宣言 ---');
const riichAction = {
  type: 'riichi',
  tileId: 'sou_2'
};

const riichResult = room.handlePlayerAction('player1', riichAction);
console.log('Riichi result:', riichResult);

console.log('\n--- ステップ2：立直後のゲーム状態 ---');
const gameState = room.getGameState();
console.log('  currentTurn:', gameState.currentTurn);
console.log('  pendingPungFor:', gameState.pendingPungFor);
console.log('  riichi:', gameState.riichi);
console.log('  status:', gameState.status);

console.log('\n--- ステップ3：Player2がメルド可能か確認 ---');
// player2の手牌にs2を2つ加える（メルド可能にする）
player1Logic.players['player2'].hand.push(new Tile('sou', 2));
player1Logic.players['player2'].hand.push(new Tile('sou', 2));

const canPung = player1Logic.canPlayerPung('player2', player1Logic.lastDiscard);
console.log('Can player2 pung?', canPung);
console.log('player2手牌:', player1Logic.players['player2'].hand.map(t => t.toString()).join(' '));
console.log('lastDiscard:', player1Logic.lastDiscard.toString());

if (canPung && gameState.pendingPungFor === 'player2') {
  console.log('\n--- ステップ4：メルド処理 ---');
  const pungAction = { type: 'pung' };
  const pungResult = room.handlePlayerAction('player2', pungAction);
  console.log('Pung result:', pungResult);
  
  const finalState = room.getGameState();
  console.log('\n--- メルド後のゲーム状態 ---');
  console.log('  currentTurn:', finalState.currentTurn);
  console.log('  pendingPungFor:', finalState.pendingPungFor);
  console.log('  player2 hand length:', finalState.tiles['player2'].hand.length);
  console.log('  player2 melds count:', finalState.tiles['player2'].melds.length);
} else {
  console.log('❌ メルドが準備されていません');
}

console.log('\n========================================\n');
