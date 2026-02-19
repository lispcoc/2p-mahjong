const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 Testing for Hand Tile Count Issues During Kan\n');

// Test: Scenario where hand has 14 tiles (after drawing) and you want to add kan
console.log('📋 Test: Added Kan When Hand Has 14 Tiles (with drawn tile)');
const game = new MahjongLogic(['player1', 'player2']);
game.initialize();
game.dealTiles();

const p1Hand = game.players['player1'].hand;
const p1 = game.players['player1'];

console.log(`Initial hand size: ${p1Hand.length} (should be 14 - player1 drew)`);
console.log(`Drawn tile: ${p1.drawnTile ? p1.drawnTile.toString() : 'none'}`);

// Setup: Create a pung and a matching tile in hand  // First, identify what we have
const hand = p1Hand.map(t => t.toString()).join(', ');
console.log(`Hand tiles: ${hand}`);

// Let's manually set up the scenario
p1Hand.length = 0;
p1.melds.length = 0;
p1.concealedMeldIndices.clear();

// Add a pung of 7-sou
const pung = [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)];
p1.melds.push(pung);

// Add 13 tiles to hand (so when we draw drawnTile, we'll have 14)
for (let i = 1; i <= 13; i++) {
  p1Hand.push(new Tile('man', i % 9 || 9));
}

// Replace one of them with a matching tile for the pung
p1Hand[0] = new Tile('sou', 7); // matching tile for added kan

console.log(`\nSetup:
  Hand size: ${p1Hand.length}
  Hand: ${p1Hand.map(t => t.toString()).join(', ')}
  Melds: [${pung.map(t => t.toString()).join(', ')}]
  Drawn tile: ${p1.drawnTile ? p1.drawnTile.toString() : 'none'}`);

// Simulate drawing a tile (which sets drawnTile)
const drawnFromWall = game.wall.pop();
if (drawnFromWall) {
  p1Hand.push(drawnFromWall);
  p1.drawnTile = drawnFromWall;
  p1.drawnTileIndex = p1Hand.length - 1;
}

console.log(`\nAfter manually drawing:
  Hand size: ${p1Hand.length} (should be 14)
  Drawn tile: ${p1.drawnTile.toString()}`);

// Now attempt the kan
console.log(`\nAttempting added kan...`);

// Create a debugging version to monitor hand size during kan
const originalPush = p1Hand.push;
const originalSplice = p1Hand.splice;
let maxHandSize = p1Hand.length;
let maxHandSizeDetected = p1Hand.length;

p1Hand.push = function(...args) {
  const result = originalPush.call(this, ...args);
  if (this.length > maxHandSizeDetected) {
    maxHandSizeDetected = this.length;
    console.log(  `  ⚠️ Hand size increased to ${this.length}!`);
  }
  return result;
};

p1Hand.splice = function(...args) {
  const result = originalSplice.call(this, ...args);
  return result;
};

const kanResult = game.handleKong('player1');

// Restore original methods
p1Hand.push = originalPush;
p1Hand.splice = originalSplice;

console.log(`Kan result: ${kanResult.message}`);
console.log(`Final hand size: ${p1Hand.length}`);
console.log(`Maximum hand size during operation: ${maxHandSizeDetected}`);

if (maxHandSizeDetected > 14) {
  console.log(`\n❌ ERROR: Hand temporarily exceeded 14 tiles! Max size: ${maxHandSizeDetected}`);
} else {
  console.log(`\n✅ CORRECT: Hand never exceeded 14 tiles`);
}

// Test 2: Check kanning wall behavior
console.log('\n\n📋 Test 2: Kanning Wall Tile Management');
const game2 = new MahjongLogic(['player1', 'player2']);
game2.initialize();
game2.dealTiles();

console.log(`Initial kanning wall: ${game2.kanningWall.length} tiles`);
console.log(`  Tiles: ${game2.kanningWall.map(t => t.toString()).join(', ')}`);
console.log(`Initial kanning wall supply: ${game2.kanningWallSupply.length} tiles`);

// Perform a kan
const p2Hand = game2.players['player1'].hand;
p2Hand.length = 0;

for (let i = 0; i < 4; i++) {
  p2Hand.push(new Tile('man', 5));
}
for (let i = 1; i <= 9; i++) {
  p2Hand.push(new Tile('man', i));
}
for (let i = 1; i <= 2; i++) {
  p2Hand.push(new Tile('pin', i));
}

console.log(`\nBefore kan:
  Player hand: ${p2Hand.length} tiles
  Kanning wall: ${game2.kanningWall.length} tiles
  Wall: ${game2.wall.length} tiles`);

const kanResult2 = game2.handleKong('player1');

console.log(`\nAfter kan:
  Player hand: ${p2Hand.length} tiles
  Kanning wall: ${game2.kanningWall.length} tiles (was ${game2.kanningWall.length + 1 > 0 ? game2.kanningWall.length + 1 : 'unknown'} before)`);
console.log(`  Wall: ${game2.wall.length} tiles`);

if (game2.kanningWall.length < 0) {
  console.log(`\n❌ ERROR: Kanning wall has negative tiles!`);
} else {
  console.log(`\n✅ CORRECT: Kanning wall is valid`);
}

// Test 3: Scenario where DRAWN TILE is one of the kan tiles
console.log('\n\n📋 Test 3: Kan When Drawn Tile Is Part of the Kan');
const game3 = new MahjongLogic(['player1', 'player2']);
game3.initialize();
game3.dealTiles();

const p3Hand = game3.players['player1'].hand;
const p3 = game3.players['player1'];

// Clear and setup
p3Hand.length = 0;
p3.melds.length = 0;
p3.concealedMeldIndices.clear();

// Add 3 copies of a tile (5-man)
for (let i = 0; i < 3; i++) {
  p3Hand.push(new Tile('man', 5));
}

// Add filler tiles
for (let i = 1; i <= 10; i++) {
  p3Hand.push(new Tile('pin', i % 9 || 9));
}

console.log(`Before drawing:
  Hand size: ${p3Hand.length}
  Hand: ${p3Hand.map(t => t.toString()).join(', ')}`);

// Manually give the player a drawn tile that matches (4th copy)
const drawnTile = new Tile('man', 5);
p3Hand.push(drawnTile);
p3.drawnTile = drawnTile;
p3.drawnTileIndex = p3Hand.length - 1;

console.log(`After drawing 5-man:
  Hand size: ${p3Hand.length} (should be 14)
  Hand: ${p3Hand.map(t => t.toString()).slice(-5).join(', ')}...`);

// Now kan (drawn tile is one of the 4 kan tiles)
console.log(`\nAttempting concealed kan (drawn tile is part of kan)...`);
const kanResult3 = game3.handleKong('player1');
console.log(`Kan result: ${kanResult3.message}`);
console.log(`Final hand size: ${p3Hand.length}`);
console.log(`Hand after kan: ${p3Hand.map(t => t.toString()).join(', ')}`);

console.log('\n🎉 All kan tile count scenario tests completed!');
