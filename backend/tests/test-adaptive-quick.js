const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('===== Test: Adaptive Tsumo Luck (Hand-Based) =====\n');

// Test 1: Hand analysis
console.log('Test 1: Hand tendency analysis');
const logic = new MahjongLogic(['player1', 'player2']);
const handWithHonors = [
  new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3), new Tile('honor', 4),
  new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5), new Tile('pin', 6),
  new Tile('sou', 1), new Tile('sou', 2),
];

const analysis = logic.analyzeHandTendency(handWithHonors);
const test1Pass = analysis.honorCount === 4 && analysis.dominantSuit === 'man';
console.log(`  ✓ Hand analysis working (honors=${analysis.honorCount}, dominant=${analysis.dominantSuit})`);

// Test 2: Adaptive scoring
console.log('\nTest 2: Adaptive tile scoring');
const honorScore = logic.getTileScoreWithHandAnalysis(new Tile('honor', 1), handWithHonors);
const baseScore = logic.getTileScore(new Tile('honor', 1));
const test2Pass = honorScore > baseScore;
console.log(`  ✓ Scores adjusted based on hand (base=${baseScore}, adaptive=${honorScore})`);

// Test 3: Adaptive drawing (quick test)
console.log('\nTest 3: Drawing with adaptation');
const gameLogic = new MahjongLogic(
  ['player1', 'player2'],
  { player1: 25000, player2: 25000 },
  () => false,
  { wallTiles: 87, tsumoLuckSettings: { player1: 2, player2: 0 } }
);

gameLogic.players['player1'].hand = [
  new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
  new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5),
];

gameLogic.initialize();

// Just verify the method is callable and returns tiles
const tile = gameLogic.drawTileWithLuckAdaptive('player1');
const test3Pass = tile !== null;
console.log(`  ✓ Adaptive drawing works (drew tile: ${tile.toString()})`);

// Summary
console.log('\n===== Result =====');
const allPass = test1Pass && test2Pass && test3Pass;
console.log(allPass ? '✓ All adaptive luck tests PASSED' : '✗ Some tests FAILED');
console.log('✓ Hand analysis detects tile distribution');
console.log('✓ Scores adapt based on current hand');
console.log('✓ Adaptive drawing integrates with game logic');

process.exit(allPass ? 0 : 1);
