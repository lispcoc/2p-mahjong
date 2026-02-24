#!/usr/bin/env node

const MahjongLogic = require('../src/logic/MahjongLogic');
const GameRoom = require('../src/logic/GameRoom');
const Tile = require('../src/logic/Tile');

console.log('\n========== GameRoom内テスト：isChiitoitsu検証 ==========\n');

// ゲームルームを作成
const room = new GameRoom('testRoom', { testMode: true }, ['player1', 'player2']);
room.players.set('player1', { autoDrawMode: false });
room.players.set('player2', { autoDrawMode: false });
room.start();

const logic = room.gameLogic;

// player1の手牌を13枚に設定（七対子の待ち形：6対+1枚）
const newHand = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('sou', 2)  // 13枚
];

logic.players['player1'].hand = newHand;

console.log('手牌:', newHand.map(t => t.toString()).join(' '));
console.log('手牌長:', newHand.length);
console.log('手牌の型:', newHand[0].constructor.name);

// メルド不可/ドロー不可
logic.players['player1'].melds = [];
logic.players['player1'].drawnTile = null;
logic.players['player1'].drawnTileIndex = -1;

// s2を追加してテスト（7対子誕生）
console.log('\n--- タイル追加テスト ---');
const testHand_s2 = newHand.concat([new Tile('sou', 2)]);
console.log('+ s2:', testHand_s2.map(t => t.toString()).join(' '));
console.log('  hand length:', testHand_s2.length);
console.log('  isChiitoitsu:', logic.isChiitoitsu(testHand_s2));

console.log('\n========================================\n');
