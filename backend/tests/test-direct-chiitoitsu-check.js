#!/usr/bin/env node

const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('\n========== isChiitoitsu 実装詳細テスト ==========\n');

const logic = new MahjongLogic(['player1', 'player2']);

// テスト1：14枚の完成形
const hand14 = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('sou', 2), new Tile('sou', 2)  // 14枚：7対子完成形
];

console.log('Test 1: 14-tile complete seven pairs');
console.log('Hand:', hand14.map(t => t.toString()).join(' '));
console.log('Length:', hand14.length);
console.log('isChiitoitsu:', logic.isChiitoitsu(hand14));

// テスト2：13枚の待ち形
const hand13 = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('sou', 2)  // 13枚：6対+1枚
];

console.log('\nTest 2: 13-tile waiting seven pairs');
console.log('Hand:', hand13.map(t => t.toString()).join(' '));
console.log('Length:', hand13.length);
console.log('isChiitoitsu:', logic.isChiitoitsu(hand13));

// テスト3：13枚だが不正な形
const hand13_invalid = [
  new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1)
];

console.log('\nTest 3: 13-tile invalid (3 of same)');
console.log('Hand:', hand13_invalid.map(t => t.toString()).join(' '));
console.log('Length:', hand13_invalid.length);
console.log('isChiitoitsu:', logic.isChiitoitsu(hand13_invalid));

console.log('\n========================================\n');
