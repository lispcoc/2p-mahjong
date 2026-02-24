#!/usr/bin/env node

const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('\n========== 七対子の待ちタイル検出テスト ==========\n');

const logic = new MahjongLogic(['player1', 'player2']);

// 七対子の手牌パターン（13枚）
const testCases = [
  {
    name: '七対子パターン1（s2待ち）',
    hand: [
      new Tile('man', 1), new Tile('man', 1),
      new Tile('man', 2), new Tile('man', 2),
      new Tile('man', 3), new Tile('man', 3),
      new Tile('pin', 1), new Tile('pin', 1),
      new Tile('pin', 2), new Tile('pin', 2),
      new Tile('sou', 1), new Tile('sou', 1),
      new Tile('sou', 2),  // 待ちタイル
    ],
    expectedWaitingTile: 'sou_2'
  },
  {
    name: '七対子パターン2（h3待ち）',
    hand: [
      new Tile('man', 1), new Tile('man', 1),
      new Tile('pin', 1), new Tile('pin', 1),
      new Tile('pin', 2), new Tile('pin', 2),
      new Tile('sou', 1), new Tile('sou', 1),
      new Tile('sou', 2), new Tile('sou', 2),
      new Tile('sou', 3), new Tile('sou', 3),
      new Tile('honor', 3),  // 待ちタイル
    ],
    expectedWaitingTile: 'honor_3'
  },
  {
    name: '通常の手型（対照）',
    hand: [
      new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
      new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
      new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
      new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
      new Tile('honor', 4),
    ],
    expectedWaitingTile: 'honor_1'  // Should have multiple but at least honor_1
  }
];

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase) => {
  console.log(`\n--- ${testCase.name} ---`);
  console.log(`Hand (${testCase.hand.length}): ${testCase.hand.map(t => t.toString()).join(' ')}`);
  
  const winningTiles = logic.getWinningTiles(testCase.hand, []);
  
  if (winningTiles.length === 0) {
    console.log('❌ FAIL: No winning tiles found!');
    failCount++;
  } else {
    console.log(`✓ Found ${winningTiles.length} waiting tile(s)`);
    winningTiles.forEach(tile => {
      console.log(`  - ${tile.display} (${tile.suit}_${tile.number})`);
    });
    
    // Check if expected tile is in the results
    const hasExpectedTile = winningTiles.some(t => 
      t.suit === testCase.expectedWaitingTile.split('_')[0] && 
      parseInt(t.number) === parseInt(testCase.expectedWaitingTile.split('_')[1])
    );
    
    if (hasExpectedTile) {
      console.log(`✓ PASS: Expected tile found`);
      passCount++;
    } else {
      console.log(`⚠️  WARNING: Expected tile ${testCase.expectedWaitingTile} not in results`);
      failCount++;
    }
  }
});

console.log(`\n========== テスト結果 ==========`);
console.log(`✓ パス: ${passCount}`);
console.log(`❌ フェイル: ${failCount}`);
console.log(`\n`);
