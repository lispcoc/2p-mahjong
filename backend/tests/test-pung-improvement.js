/**
 * ?????????
 * ??????????????????
 */

const Tile = require('../src/logic/Tile');
const AIPlayer = require('../src/logic/AIPlayer');
const TenpaiChecker = require('../src/logic/TenpaiChecker');

// ??????1: ????????????????
function test_pung_for_toitoi() {
  console.log('\n=== TEST 1: Pung for Toitoi ===');
  
  // ??????????????
  const hand = [
    new Tile('m', 5), new Tile('m', 5),
    new Tile('p', 3), new Tile('p', 3),
    new Tile('s', 7), new Tile('s', 7),
    new Tile('honor', 1), new Tile('honor', 1),
    new Tile('m', 2), new Tile('m', 3), new Tile('m', 4),
    new Tile('p', 1)
  ];
  
  const discardedTile = new Tile('m', 5);
  const melds = [];
  
  const aiPlayer = new AIPlayer();
  const shouldPung = aiPlayer.shouldPung(hand, discardedTile, melds);
  
  console.log(`Hand complexity: ${aiPlayer.evaluateHandComplexity(hand)}`);
  console.log(`Result: ${shouldPung ? '? PUNG' : '? NO PUNG'}`);
  console.log(`Expected: ? PUNG (because of toitoi possibility)\n`);
  
  return shouldPung === true;
}

// ??????2: ?????????????????
function test_pung_leads_to_tenpai() {
  console.log('=== TEST 2: Pung leads to Tenpai ===');
  
  const hand = [
    new Tile('m', 1), new Tile('m', 2), new Tile('m', 3),
    new Tile('m', 4), new Tile('m', 5), new Tile('m', 5),
    new Tile('p', 1), new Tile('p', 1),
    new Tile('s', 2), new Tile('s', 3), new Tile('s', 4),
    new Tile('honor', 1)
  ];
  
  const discardedTile = new Tile('m', 5);
  const melds = [];
  
  const aiPlayer = new AIPlayer();
  const winningTiles = TenpaiChecker.getWinningTiles(hand, melds);
  const shouldPung = aiPlayer.shouldPung(hand, discardedTile, melds);
  
  console.log(`Winning tiles available: ${winningTiles.length}`);
  console.log(`Result: ${shouldPung ? '? PUNG' : '? NO PUNG'}`);
  console.log(`Expected: ? PUNG (already tenpai)\n`);
  
  return shouldPung === true;
}

// ??????3: ?????????????????
function test_avoid_destructive_pung() {
  console.log('=== TEST 3: Avoid Destructive Pung ===');
  
  // ?????????????????????????
  const hand = [
    new Tile('m', 1), new Tile('m', 2), new Tile('m', 3),
    new Tile('m', 5), new Tile('m', 6), new Tile('m', 7),
    new Tile('m', 8), new Tile('m', 9),
    new Tile('p', 1),
    new Tile('s', 1),
    new Tile('honor', 1) // ??????
  ];
  
  // ???????????????
  const discardedTile = new Tile('honor', 1);
  const melds = [];
  
  const aiPlayer = new AIPlayer();
  const shouldPung = aiPlayer.shouldPung(hand, discardedTile, melds);
  
  console.log(`Result: ${shouldPung ? '? PUNG (bad)' : '? NO PUNG'}`);
  console.log(`Expected: ? NO PUNG (destroys hand integrity)\n`);
  
  return shouldPung === false;
}

// ??????4: ??????????????????
function test_avoid_pung_scattered_hand() {
  console.log('=== TEST 4: Avoid Pung with Scattered Hand ===');
  
  const hand = [
    new Tile('m', 2), new Tile('m', 2),
    new Tile('p', 5),
    new Tile('s', 7), new Tile('s', 8),
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 5), new Tile('honor', 6),
    new Tile('m', 9)
  ];
  
  const discardedTile = new Tile('m', 2);
  const melds = [];
  
  const aiPlayer = new AIPlayer();
  const complexity = aiPlayer.evaluateHandComplexity(hand);
  const shouldPung = aiPlayer.shouldPung(hand, discardedTile, melds);
  
  console.log(`Hand complexity: ${complexity}`);
  console.log(`Result: ${shouldPung ? '? PUNG (bad)' : '? NO PUNG'}`);
  console.log(`Expected: ? NO PUNG (hand is scattered)\n`);
  
  return shouldPung === false;
}

// ??????5: ??????????????????
function test_pung_high_complexity() {
  console.log('=== TEST 5: Pung with High Complexity (Initial Gather) ===');
  
  const hand = [
    new Tile('m', 3), new Tile('m', 4), new Tile('m', 5),
    new Tile('m', 5), new Tile('m', 6), new Tile('m', 7),
    new Tile('m', 8), new Tile('m', 8),
    new Tile('p', 1), new Tile('p', 1), new Tile('p', 2),
    new Tile('p', 3)
  ];
  
  const discardedTile = new Tile('m', 5);
  const melds = [];
  
  const aiPlayer = new AIPlayer();
  const complexity = aiPlayer.evaluateHandComplexity(hand);
  const shouldPung = aiPlayer.shouldPung(hand, discardedTile, melds);
  
  console.log(`Hand complexity: ${complexity}`);
  console.log(`Result: ${shouldPung ? '? PUNG' : '? NO PUNG'}`);
  console.log(`Expected: ? PUNG (high complexity, good gathering)\n`);
  
  return shouldPung === true;
}

// ?????
console.log('\n?? Testing improved Pung Decision Logic...\n');

const tests = [
  { name: 'Test 1', fn: test_pung_for_toitoi },
  { name: 'Test 2', fn: test_pung_leads_to_tenpai },
  { name: 'Test 3', fn: test_avoid_destructive_pung },
  { name: 'Test 4', fn: test_avoid_pung_scattered_hand },
  { name: 'Test 5', fn: test_pung_high_complexity }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  try {
    const result = test.fn();
    if (result) {
      passed++;
      console.log(`${test.name}: ? PASS\n`);
    } else {
      failed++;
      console.log(`${test.name}: ? FAIL\n`);
    }
  } catch (error) {
    failed++;
    console.log(`${test.name}: ? ERROR - ${error.message}\n`);
  }
});

console.log(`\n?? Results: ${passed}/${tests.length} passed, ${failed}/${tests.length} failed`);
