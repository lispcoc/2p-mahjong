const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 Critical: Testing Hand Tile Count Issues\n');

// Test: Verify that hand count is properly managed
console.log('📋 Test 1: Normal game flow - hand tile count consistency');
const game1 = new MahjongLogic(['player1', 'player2']);
game1.initialize();
game1.dealTiles();

const p1 = game1.players['player1'];
const p2 = game1.players['player2'];

console.log(`After dealTiles:
  Player1 hand: ${p1.hand.length} tiles (should be 14)
  Player2 hand: ${p2.hand.length} tiles (should be 13)
  Player1 hand + melds: ${p1.hand.length + p1.melds.reduce((sum, m) => sum + m.length, 0)} tiles
  Player2 hand + melds: ${p2.hand.length + p2.melds.reduce((sum, m) => sum + m.length, 0)} tiles`);

if (p1.hand.length > 14) {
  console.log(`\n❌ ERROR: Player1 hand exceeds 14 tiles (${p1.hand.length})!`);
}

// Test 2: Check if hand can ever exceed 14 tiles naturally
console.log('\n\n📋 Test 2: Check concealed kan behavior');
const game2 = new MahjongLogic(['player1', 'player2']);
game2.initialize();
game2.dealTiles();

const p = game2.players['player1'];
const hand = p.hand;

console.log(`Initial hand: ${hand.length} tiles`);
console.log(`Hand content: ${hand.map(t => t.toString()).join(', ')}`);
console.log(`Melds: ${p.melds.length}`);

// Count tiles
const tileCount = {};
hand.forEach(t => {
  const key = t.toString();
  tileCount[key] = (tileCount[key] || 0) + 1;
});

console.log('\nTile distribution:');
Object.entries(tileCount).forEach(([tile, count]) => {
  if (count >= 3) {
    console.log(`  ${tile}: ${count} tiles`);
  }
});

// Test 3: Actual scenario - concealed kan during actual turn
console.log('\n\n📋 Test 3: Concealed kan during actual game turn');
const game3 = new MahjongLogic(['player1', 'player2']);
game3.initialize();
game3.dealTiles();

const p3 = game3.players['player1'];
const p3Hand = p3.hand;

console.log(`Before any action:
  Hand size: ${p3Hand.length}
  Hand: ${p3Hand.map(t => t.toString()).slice(0, 7).join(', ')}...`);

// Look for 4 identical tiles
const identicalTiles = {};
p3Hand.forEach((tile, idx) => {
  const key = tile.toString();
  if (!identicalTiles[key]) {
    identicalTiles[key] = [];
  }
  identicalTiles[key].push(idx);
});

const quadTile = Object.entries(identicalTiles).find(([_, indices]) => indices.length === 4);
if (quadTile) {
  console.log(`\nFound 4 identical tiles: ${quadTile[0]}`);
  console.log(`Attempting concealed kan...`);
  
  const before = p3Hand.length;
  const kanResult = game3.handleKong('player1');
  const after = p3Hand.length;
  
  console.log(`Kan result: ${kanResult.message}`);
  console.log(`Hand size: ${before} -> ${after}`);
  
  if (after > before) {
    console.log(`❌ ERROR: Hand size increased after kan (${before} -> ${after})`);
  } else if (after < before) {
    console.log(`Hand size decreased by ${before - after} tiles`);
  }
} else {
  console.log('\nNo 4 identical tiles found in randomly dealt hand');
}

// Test 4: Check what happens if we manually exceed 14 tiles
console.log('\n\n📋 Test 4: Behavior when hand exceeds 14 tiles');
const game4 = new MahjongLogic(['player1', 'player2']);
game4.initialize();
game4.dealTiles();

const p4 = game4.players['player1'];
const p4Hand = p4.hand;

// Add an extra tile manually (simulating a bug)
const extraTile = new Tile('sou', 1);
p4Hand.push(extraTile);

console.log(`After manually adding extra tile:
  Hand size: ${p4Hand.length} (EXCEEDS 14!)`);

// Try to perform an action with >14 tiles
const originalSize = p4Hand.length;
const discardResult = game4.handleDiscard('player1', 0);
console.log(`After discard:
  Hand size: ${p4Hand.length}
  Discard result: ${discardResult.success ? 'Success' : 'Failed'}`);

if (p4Hand.length > 14) {
  console.log(`\n⚠️ ISSUE: Still have more than 14 tiles after action`);
}

// Test 5: Verify kan with exactly 14 tiles (after draw)
console.log('\n\n📋 Test 5: Kan with proper 14-tile hand');
const game5 = new MahjongLogic(['player1', 'player2']);
game5.initialize();

// Manually setup with exactly 4 of a kind plus other tiles
const p5 = game5.players['player1'];
p5.hand.length = 0;
p5.melds.length = 0;
p5.concealedMeldIndices.clear();

// 4 of one kind
for (let i = 0; i < 4; i++) {
  p5.hand.push(new Tile('man', 1));
}

// 10 other tiles (to make 14 - representing 13 base + 1 drawn)
for (let i = 2; i <= 10; i++) {
  p5.hand.push(new Tile('man', i));
}
p5.hand.push(new Tile('pin', 1));

console.log(`Setup:
  Hand size: ${p5.hand.length}
  4-tiles: Four 1-man
  Other tiles: 2-9-man + pin-1`);

const beforeKan = p5.hand.length;
console.log(`\nBefore kan: ${beforeKan} tiles`);

// Perform concealed kan
const kan5Result = game5.handleKong('player1');
const afterKan = p5.hand.length;

console.log(`After kan: ${afterKan} tiles`);
console.log(`Result: ${kan5Result.message}`);
console.log(`Expected tile count after kan: ${beforeKan - 3} (removed 4, added 1)`);

if (afterKan === beforeKan - 3) {
  console.log(`✅ CORRECT: Hand tile count decreased by 3`);
} else {
  console.log(`❌ ERROR: Hand tile count is wrong`);
}

// Check if hand ever exceeds 14
if (beforeKan <= 14 && afterKan <= 14) {
  console.log(`✅ CORRECT: Hand never exceeded 14 tiles`);
} else if (beforeKan > 14) {
  console.log(`❌ ERROR: Started with more than 14 tiles`);
} else {
  console.log(`❌ ERROR: Ended with more than 14 tiles`);
}

console.log('\n🎉 Hand tile count verification complete!');
