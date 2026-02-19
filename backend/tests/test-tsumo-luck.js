const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

// Test 1: Tile scoring
console.log('===== Test 1: Tile Scoring =====');
const logic = new MahjongLogic(['player1', 'player2']);

const testTiles = [
  { suit: 'man', number: 1, expectedScore: 5 },
  { suit: 'man', number: 2, expectedScore: 10 },
  { suit: 'man', number: 3, expectedScore: 15 },
  { suit: 'man', number: 4, expectedScore: 20 },
  { suit: 'man', number: 5, expectedScore: 20 },
  { suit: 'man', number: 6, expectedScore: 20 },
  { suit: 'man', number: 7, expectedScore: 15 },
  { suit: 'man', number: 8, expectedScore: 10 },
  { suit: 'man', number: 9, expectedScore: 5 },
  { suit: 'honor', number: 1, expectedScore: 12 },
  { suit: 'honor', number: 5, expectedScore: 12 },
];

let allPass = true;
testTiles.forEach(({ suit, number, expectedScore }) => {
  const tile = new Tile(suit, number);
  const score = logic.getTileScore(tile);
  const pass = score === expectedScore;
  allPass = allPass && pass;
  console.log(`  ${suit} ${number}: score=${score} (expected=${expectedScore}) ${pass ? '✓' : '✗'}`);
});

console.log(`\nTest 1 Result: ${allPass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: Tsumo luck settings
console.log('===== Test 2: Tsumo Luck Settings =====');
const gameLogic = new MahjongLogic(
  ['player1', 'player2'],
  { player1: 25000, player2: 25000 },
  () => false,
  {
    tsumoLuckSettings: {
      player1: 2, // heavy luck
      player2: 0, // no luck
    },
  }
);

const player1Luck = gameLogic.tsumoLuckSettings['player1'];
const player2Luck = gameLogic.tsumoLuckSettings['player2'];
const test2Pass = player1Luck === 2 && player2Luck === 0;

console.log(`  Player1 luck level: ${player1Luck} (expected=2) ${player1Luck === 2 ? '✓' : '✗'}`);
console.log(`  Player2 luck level: ${player2Luck} (expected=0) ${player2Luck === 0 ? '✓' : '✗'}`);
console.log(`\nTest 2 Result: ${test2Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 3: Drawing tiles with luck bias
console.log('===== Test 3: Tile Drawing with Luck Bias (Statistical Test) =====');

const testLogic = new MahjongLogic(
  ['player1', 'player2'],
  { player1: 25000, player2: 25000 },
  () => false,
  {
    wallTiles: 87,
    tsumoLuckSettings: {
      player1: 2, // heavy luck
      player2: 0, // no luck
    },
  }
);

testLogic.initialize();

// Count good vs bad tiles drawn for each player (1000 draws each)
const draws = 1000;
const testResults = {
  player1: { goodCount: 0, badCount: 0, mediumCount: 0 },
  player2: { goodCount: 0, badCount: 0, mediumCount: 0 },
};

for (let i = 0; i < draws; i++) {
  // Reset wall for each test
  testLogic.wall = [];
  testLogic.kanningWall = [];
  testLogic.kanningWallSupply = [];
  testLogic.candidateDoraIndicators = [];
  testLogic.candidateDoraTiles = [];
  testLogic.candidateUraDoraIndicators = [];
  testLogic.candidateUraDoraTiles = [];
  
  // Create a simple wall with known tiles
  for (let suit of ['man', 'pin', 'sou']) {
    for (let num = 1; num <= 9; num++) {
      testLogic.wall.push(new Tile(suit, num));
    }
  }
  testLogic.shuffleWall();
  
  // Draw for player1 (heavy luck)
  if (testLogic.wall.length > 0) {
    const tile1 = testLogic.drawTileWithLuckAdaptive('player1');
    const score1 = testLogic.getTileScore(tile1);
    if (score1 >= 20) testResults.player1.goodCount++;
    else if (score1 >= 15) testResults.player1.mediumCount++;
    else testResults.player1.badCount++;
  }
  
  // Reset and draw for player2 (no luck)
  testLogic.wall = [];
  for (let suit of ['man', 'pin', 'sou']) {
    for (let num = 1; num <= 9; num++) {
      testLogic.wall.push(new Tile(suit, num));
    }
  }
  testLogic.shuffleWall();
  
  if (testLogic.wall.length > 0) {
    const tile2 = testLogic.drawTileWithLuckAdaptive('player2');
    const score2 = testLogic.getTileScore(tile2);
    if (score2 >= 20) testResults.player2.goodCount++;
    else if (score2 >= 15) testResults.player2.mediumCount++;
    else testResults.player2.badCount++;
  }
}

const player1GoodRatio = (testResults.player1.goodCount / draws * 100).toFixed(1);
const player2GoodRatio = (testResults.player2.goodCount / draws * 100).toFixed(1);

console.log(`Player1 (level 2) - Good tiles: ${player1GoodRatio}% (${testResults.player1.goodCount}/${draws})`);
console.log(`Player2 (level 0) - Good tiles: ${player2GoodRatio}% (${testResults.player2.goodCount}/${draws})`);

const test3Pass = player1GoodRatio > player2GoodRatio;
console.log(`\nTest 3 Result: ${test3Pass ? '✓ PASS (Player1 got more good tiles)' : '✗ FAIL (Player1 should get more good tiles)'}\n`);

// Summary
console.log('===== Summary =====');
const allTests = allPass && test2Pass && test3Pass;
console.log(allTests ? '✓ All tests passed!' : '✗ Some tests failed');
process.exit(allTests ? 0 : 1);
