const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('===== Verification Test: Tsumo Luck in Real Game Scenario =====\n');

// Note: We'll create fresh games for each draw in the test function
// This prevents wall exhaustion and gives us statistically valid results

console.log('Test setup:');
console.log(`  Player1 (Dealer) - Tsumo Luck: 2 (Heavy)`);
console.log(`  Player2 - Tsumo Luck: 0 (None)`);
console.log(`  Test games: 50 games with one draw per player\n`);

// Simulate drawing tiles
const drawTest = () => {
  const results = {
    player1: { goodTiles: 0, okTiles: 0, badTiles: 0, totalDraws: 0 },
    player2: { goodTiles: 0, okTiles: 0, badTiles: 0, totalDraws: 0 },
  };

  const draws = 50; // Test 50 draws for each player

  for (let round = 0; round < draws; round++) {
    // Create a fresh game for each draw pair to avoid wall exhaustion
    const freshGame = new MahjongLogic(
      ['player1', 'player2'],
      { player1: 25000, player2: 25000 },
      () => false,
      {
        wallTiles: 87,
        dealerIndex: 0,
        tsumoLuckSettings: {
          player1: 2, // Heavy luck
          player2: 0, // No luck
        },
      }
    );
    
    freshGame.initialize();
    freshGame.dealTiles();

    // Player 1 draws
    if (freshGame.wall.length > 0) {
      const tile1 = freshGame.drawTileWithLuck('player1');
      if (tile1) {
        const score1 = freshGame.getTileScore(tile1);
        if (score1 >= 20) results.player1.goodTiles++;
        else if (score1 >= 12) results.player1.okTiles++;
        else results.player1.badTiles++;
        results.player1.totalDraws++;
      }
    }

    // Player 2 draws (from same fresh game wall)
    if (freshGame.wall.length > 0) {
      const tile2 = freshGame.drawTileWithLuck('player2');
      if (tile2) {
        const score2 = freshGame.getTileScore(tile2);
        if (score2 >= 20) results.player2.goodTiles++;
        else if (score2 >= 12) results.player2.okTiles++;
        else results.player2.badTiles++;
        results.player2.totalDraws++;
      }
    }
  }

  return results;
};

const results = drawTest();

console.log('Drawing Results:');
console.log('===============');

const p1GoodRatio = (results.player1.goodTiles / results.player1.totalDraws * 100).toFixed(1);
const p1OkRatio = (results.player1.okTiles / results.player1.totalDraws * 100).toFixed(1);
const p1BadRatio = (results.player1.badTiles / results.player1.totalDraws * 100).toFixed(1);

const p2GoodRatio = (results.player2.goodTiles / results.player2.totalDraws * 100).toFixed(1);
const p2OkRatio = (results.player2.okTiles / results.player2.totalDraws * 100).toFixed(1);
const p2BadRatio = (results.player2.badTiles / results.player2.totalDraws * 100).toFixed(1);

console.log(`\nPlayer1 (Luck=2, Draws=${results.player1.totalDraws}):`);
console.log(`  Good tiles (score≥20): ${results.player1.goodTiles} (${p1GoodRatio}%)`);
console.log(`  OK tiles   (12-19):     ${results.player1.okTiles} (${p1OkRatio}%)`);
console.log(`  Bad tiles  (score<12):  ${results.player1.badTiles} (${p1BadRatio}%)`);

console.log(`\nPlayer2 (Luck=0, Draws=${results.player2.totalDraws}):`);
console.log(`  Good tiles (score≥20): ${results.player2.goodTiles} (${p2GoodRatio}%)`);
console.log(`  OK tiles   (12-19):     ${results.player2.okTiles} (${p2OkRatio}%)`);
console.log(`  Bad tiles  (score<12):  ${results.player2.badTiles} (${p2BadRatio}%)`);

// Verify luck effect
const p1Good = parseInt(p1GoodRatio);
const p2Good = parseInt(p2GoodRatio);
const luckyAdvantage = p1Good - p2Good;

console.log('\n===== Luck Effect Analysis =====');
console.log(`Player1 advantage: ${luckyAdvantage}% more good tiles than Player2`);

if (luckyAdvantage > 5) {
  console.log('✓ PASS: Tsumo luck effect is significant (>5% difference)');
} else if (luckyAdvantage > 0) {
  console.log('⚠ WARN: Tsumo luck effect exists but is small');
} else {
  console.log('✗ FAIL: No luck effect detected');
}

console.log('\n===== Game State =====');
console.log(`Test completed successfully ✓`);
console.log(`Sample size: ${results.player1.totalDraws} draws per player`);
console.log(`Total games created: ${results.player1.totalDraws}`);
