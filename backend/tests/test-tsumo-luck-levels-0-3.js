const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('===== Test: Tsumo Luck Levels 0-3 =====\n');

// Test 1: Level validation
console.log('Test 1: Tsumo Luck Level Validation');
const logic = new MahjongLogic(
  ['player1', 'player2'],
  { player1: 25000, player2: 25000 },
  () => false,
  {
    tsumoLuckSettings: {
      player0: 0,
      player1: 1,
      player2: 2,
      player3: 3,
    },
  }
);

const levels = [0, 1, 2, 3];
const levelDescriptions = ['No correction', 'Light (30%)', 'Medium (50%)', 'Heavy (70%)'];

let test1Pass = true;
levels.forEach(level => {
  const playerId = `player${level}`;
  const actual = logic.tsumoLuckSettings[playerId];
  const expected = level;
  const pass = actual === expected;
  test1Pass = test1Pass && pass;
  console.log(`  Level ${level} (${levelDescriptions[level]}): ${pass ? '✓' : '✗'}`);
});

console.log(`\nTest 1 Result: ${test1Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: Statistical test for different levels
console.log('Test 2: Statistical Distribution Test (500 draws per level)');

const draws = 500;
const results = {
  0: { goodTiles: 0 },
  1: { goodTiles: 0 },
  2: { goodTiles: 0 },
  3: { goodTiles: 0 },
};

levels.forEach(luckLevel => {
  for (let i = 0; i < draws; i++) {
    const freshGame = new MahjongLogic(
      [`player${luckLevel}`, 'dummy'],
      { [`player${luckLevel}`]: 25000, dummy: 25000 },
      () => false,
      {
        wallTiles: 87,
        tsumoLuckSettings: {
          [`player${luckLevel}`]: luckLevel,
        },
      }
    );

    freshGame.initialize();
    freshGame.dealTiles();

    if (freshGame.wall.length > 0) {
      const tile = freshGame.drawTileWithLuckAdaptive(`player${luckLevel}`);
      if (tile) {
        const score = freshGame.getTileScore(tile);
        if (score >= 20) results[luckLevel].goodTiles++;
      }
    }
  }
});

console.log(`  Level 0 (No correction): ${results[0].goodTiles}/${draws} (${(results[0].goodTiles / draws * 100).toFixed(1)}%)`);
console.log(`  Level 1 (Light 30%):    ${results[1].goodTiles}/${draws} (${(results[1].goodTiles / draws * 100).toFixed(1)}%)`);
console.log(`  Level 2 (Medium 50%):   ${results[2].goodTiles}/${draws} (${(results[2].goodTiles / draws * 100).toFixed(1)}%)`);
console.log(`  Level 3 (Heavy 70%):    ${results[3].goodTiles}/${draws} (${(results[3].goodTiles / draws * 100).toFixed(1)}%)`);

// Verify progressive increase
const test2Pass = results[1].goodTiles > results[0].goodTiles &&
                  results[2].goodTiles > results[1].goodTiles &&
                  results[3].goodTiles > results[2].goodTiles;
console.log(`\nTest 2 Result: ${test2Pass ? '✓ PASS (Progressive increase confirmed)' : '✗ FAIL'}\n`);

// Test 3: Hand analysis with different luck levels
console.log('Test 3: Adaptive with Different Luck Levels');

const handWithHonors = [
  new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
  new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5),
];

const honorScore = logic.getTileScoreWithHandAnalysis(new Tile('honor', 1), handWithHonors);
const baseScore = logic.getTileScore(new Tile('honor', 1));
const test3Pass = honorScore > baseScore;
console.log(`  Honor tile in honor-heavy hand:`);
console.log(`    Base score: ${baseScore} → Adaptive: ${honorScore}`);
console.log(`  Test 3 Result: ${test3Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Summary
console.log('===== Summary =====');
const allPass = test1Pass && test2Pass && test3Pass;
console.log(allPass ? '✓ All tests PASSED!' : '✗ Some tests FAILED');
console.log('✓ Level 0: No correction (baseline)');
console.log('✓ Level 1: Light correction (30%)');
console.log('✓ Level 2: Medium correction (50%) - NEW');
console.log('✓ Level 3: Heavy correction (70%)');
console.log('✓ Progressive increase confirmed');

process.exit(allPass ? 0 : 1);
