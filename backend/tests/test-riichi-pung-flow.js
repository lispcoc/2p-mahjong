#!/usr/bin/env node

const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('\n========== 立直中のメルド処理テスト ==========\n');

const logic = new MahjongLogic(['player1', 'player2']);

// テスト用のセットアップ
logic.players = {
  'player1': {
    name: 'Player1',
    hand: [
      new Tile('man', 1), new Tile('man', 1),
      new Tile('man', 2), new Tile('man', 2),
      new Tile('man', 3), new Tile('man', 3),
      new Tile('pin', 1), new Tile('pin', 1),
      new Tile('pin', 2), new Tile('pin', 2),
      new Tile('sou', 1), new Tile('sou', 1),
      new Tile('sou', 2)  // 13枚で七対子の待ち
    ],
    melds: [],
    score: 24000,
    riichi: false,
    drawnTileIndex: -1,
    drawnTile: null,
    discards: [],
    riichiTurn: -1,
    riichiDiscardIndex: -1
  },
  'player2': {
    name: 'Player2',
    hand: [
      new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
      new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
      new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
      new Tile('honor', 2), new Tile('honor', 3), new Tile('honor', 3),
      new Tile('honor', 3), new Tile('sou', 2)  // s2を持たせておく（メルド用）
    ],
    melds: [],
    score: 24000,
    riichi: false,
    drawnTileIndex: -1,
    drawnTile: null,
    discards: [],
    riichiTurn: -1,
    riichiDiscardIndex: -1
  }
};

logic.playerIds = ['player1', 'player2'];
logic.currentTurnIndex = 0;
logic.lastDiscard = null;
logic.pendingPungFor = null;
logic.ronPossibleFor = null;

// player2の手牌から s2 の1つを削除（手牌が14枚→13枚になり、メルド前の状態）
const s2Index = logic.players['player2'].hand.findIndex(t => t.suit === 'sou' && t.number === 2);
if (s2Index >= 0) {
  logic.players['player2'].hand.splice(s2Index, 1);
}

console.log('--- ステップ1：Player1が立直宣言 ---');
// player1の手牌は13枚で七対子の待ちを構成
// s2を捨てる（待ちタイル）
console.log('Player1手牌:', logic.players['player1'].hand.map(t => t.toString()).join(' '));
console.log('Player1手牌数:', logic.players['player1'].hand.length);

// 立直宣言（s2を捨てる）
const riichResult = logic.declareRiichi('player1', 'sou_2');
console.log('Riichi result:', riichResult);
console.log('Player1 riichi:', logic.players['player1'].riichi);
console.log('Pending pung for:', logic.pendingPungFor);
console.log('Current turn:', logic.getCurrentTurn());

console.log('\n--- ステップ2：立直後のメルド判定 ---');
const tile = logic.lastDiscard;
console.log('Last discard:', tile ? tile.toString() : 'none');
console.log('Can player2 pung?', tile ? logic.canPlayerPung('player2', tile) : false);

if (tile && tile.suit === 'sou' && tile.number === 2) {
  console.log('Player2 has s2 in hand:', logic.players['player2'].hand.some(t => t.suit === 'sou' && t.number === 2));
  console.log('Player2手牌数:', logic.players['player2'].hand.length);
}

console.log('\n--- ステップ3：メルド処理 ---');
if (logic.pendingPungFor === 'player2') {
  const pungResult = logic.handlePung('player2');
  console.log('Pung result:', pungResult);
  console.log('Player2 melds:', logic.players['player2'].melds.length);
  console.log('Player2 hand:', logic.players['player2'].hand.length);
  console.log('Pending pung for after pung:', logic.pendingPungFor);
  console.log('Current turn after pung:', logic.getCurrentTurn());
} else {
  console.log('Player2 is not pending for pung');
}

console.log('\n========================================\n');
