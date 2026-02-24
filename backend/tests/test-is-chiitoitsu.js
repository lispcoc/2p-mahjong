#!/usr/bin/env node

const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('\n========== isChiitoitsu メソッド直接テスト ==========\n');

const logic = new MahjongLogic(['player1', 'player2']);

// 手牌：七対子の待ち形 + テストタイル（13→14枚）
const hand13 = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('sou', 2)  // 13枚
];

console.log('Hand (13 tiles):', hand13.map(t => t.toString()).join(' '));

// s2を追加して14枚にする
const hand14_s2 = hand13.concat([new Tile('sou', 2)]);
console.log('Hand (14 tiles with s2):', hand14_s2.map(t => t.toString()).join(' '));

const result1 = logic.isChiitoitsu(hand14_s2);
console.log('isChiitoitsu(hand14_s2):', result1);

// 別のタイルでも試す
const hand14_s1 = hand13.concat([new Tile('sou', 1)]);
console.log('\nHand (14 tiles with s1):', hand14_s1.map(t => t.toString()).join(' '));
const result2 = logic.isChiitoitsu(hand14_s1);
console.log('isChiitoitsu(hand14_s1):', result2);

// checkValidMeldStructure をテスト
console.log('\n--- checkValidMeldStructure テスト ---');
const checkResult1 = logic.checkValidMeldStructure(hand14_s2);
console.log('checkValidMeldStructure(hand14_s2):', checkResult1);

console.log('\n========================================\n');
