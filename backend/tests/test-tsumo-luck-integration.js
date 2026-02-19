const GameRoom = require('../src/logic/GameRoom');

// Integration test: GameRoom with Tsumo Luck settings

console.log('===== Integration Test: GameRoom Tsumo Luck =====\n');

// Create a room
const room = new GameRoom('test-room-id', { testMode: true });
console.log('✓ GameRoom created');

// Add two players with different tsumo luck levels
const result1 = room.addPlayer('player1', 'Alice', null);
const result2 = room.addPlayer('player2', 'Bob', null);

if (!result1.success || !result2.success) {
  console.error('✗ Failed to add players');
  process.exit(1);
}
console.log('✓ Players added');

// Set tsumo luck for each player
room.setTsumoLuck('player1', 2); // Heavy luck
room.setTsumoLuck('player2', 0); // No luck

console.log(`✓ Tsumo luck set: player1=${room.getTsumoLuck('player1')}, player2=${room.getTsumoLuck('player2')}`);

// Start the game
const startResult = room.start();
if (!startResult) {
  console.error('✗ Failed to start game');
  process.exit(1);
}
console.log('✓ Game started');

// Check that MahjongLogic has the tsumo luck settings
const gameLogic = room.gameLogic;
if (!gameLogic) {
  console.error('✗ Game logic not initialized');
  process.exit(1);
}

const player1LuckInLogic = gameLogic.tsumoLuckSettings['player1'];
const player2LuckInLogic = gameLogic.tsumoLuckSettings['player2'];

if (player1LuckInLogic !== 2 || player2LuckInLogic !== 0) {
  console.error(`✗ Tsumo luck not passed to MahjongLogic correctly`);
  console.error(`  Expected: player1=2, player2=0`);
  console.error(`  Got: player1=${player1LuckInLogic}, player2=${player2LuckInLogic}`);
  process.exit(1);
}

console.log('✓ Tsumo luck settings passed to MahjongLogic correctly');

// Verify tile scoring works
const tiles = [
  { suit: 'man', number: 4 },
  { suit: 'man', number: 1 },
  { suit: 'honor', number: 3 },
];

const Tile = require('../src/logic/Tile');
const scores = tiles.map(t => {
  const tile = new Tile(t.suit, t.number);
  return gameLogic.getTileScore(tile);
});

console.log(`✓ Tile scores calculated: [${scores.join(', ')}]`);

if (scores[0] !== 20 || scores[1] !== 5 || scores[2] !== 12) {
  console.error('✗ Tile scores incorrect');
  process.exit(1);
}

console.log('\n===== Summary =====');
console.log('✓ All integration tests passed!');
console.log('✓ Tsumo luck feature is fully integrated');
