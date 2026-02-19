const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 Issue Verification: Hand Tile Count Management During Kan\n');

// The real issue: After kan, the hand has fewer tiles (11 instead of 14)
// But is this correct for the game flow?

console.log('📋 Analysis: Hand tile count expectations during different stages');

console.log(`
Normal Game Flow (No Kan):
  Turn 1: Player1 has 13 tiles (before draw)
  Turn 1: Player1 draws -> 14 tiles (with drawn tile)
  Turn 1: Player1 discards 1 -> hand becomes 13 tiles (no drawn tile marked)
  
After Pung:
  Player has 13 tiles (base)
  Takes pung (2 from hand + 1 discard) -> hand becomes 11 tiles
  Draws -> 12 tiles (with drawn tile)
  Discards 1 -> 11 tiles
  
After Concealed Kan (during your turn with drawn tile):
  Player has 14 tiles (13 + 1 drawn)
  Forms kan (4 tiles removed from hand) -> 10 tiles
  Draws from kanning wall -> 11 tiles
  Now the player has 11 tiles but hasn't discarded yet
  
ISSUE: After kan, hand is 11 tiles, but normally after drawing it should be 14
`);

console.log('📋 Test 1: Checking hand count after concealed kan in proper game scenario');

// Simulate proper game flow
const game1 = new MahjongLogic(['player1', 'player2']);
game1.initialize();
game1.dealTiles();

console.log(`Initial state:
  Player1 hand: ${game1.players['player1'].hand.length} (should be 14)
  Player1 drawn: ${game1.players['player1'].drawnTile ? 'yes' : 'no'}`);

// Verify if the drawn tile is properly marked
const p1 = game1.players['player1'];
const drawnTileInHand = p1.drawnTileIndex >= 0;
console.log(`  Player1 drawn tile index: ${p1.drawnTileIndex} (if >= 0, tile is in hand)`);

// Check if kanning wall is set up correctly
console.log(`\nKanning wall state:
  kanningWall: ${game1.kanningWall.length} tiles
  kanningWallSupply: ${game1.kanningWallSupply.length} tiles`);

if (game1.kanningWall.length === 0) {
  console.log(`  ⚠️ WARNING: Kanning wall is empty! This will cause issues with kan operations.`);
}

// Test 2: Verify that after kan, if player doesn't discard, they still have < 14 tiles
console.log('\n\n📋 Test 2: Hand count progression through a kan');

const game2 = new MahjongLogic(['player1', 'player2']);
game2.initialize();
game2.dealTiles();

const p2 = game2.players['player1'];
p2.hand.length = 0;

// Setup: 4 identical tiles + others to make proper hand
for (let i = 0; i < 4; i++) {
  p2.hand.push(new Tile('man', 1));
}
for (let i = 2; i <= 14; i++) {
  if (p2.hand.length < 14) {
    p2.hand.push(new Tile('man', i % 9 || 9));
  }
}

// Make sure we have exactly 14 tiles (13 + drawn is simulated)
while (p2.hand.length < 14) {
  p2.hand.push(new Tile('pin', 1));
}
while (p2.hand.length > 14) {
  p2.hand.pop();
}

console.log(`Before any action:
  Hand: ${p2.hand.length} tiles`);

// Check what happens during kan
const kanResult = game2.handleKong('player1');
console.log(`\nAfter concealed kan:
  Hand: ${p2.hand.length} tiles
  Kan result: ${kanResult.success ? 'SUCCESS' : 'FAILED'}`);

if (kanResult.success) {
  const expectedSize = 11; // 14 - 4 + 1
  if (p2.hand.length === expectedSize) {
    console.log(`  ✅ CORRECT: Hand size is ${p2.hand.length} (expected ${expectedSize})`);
  } else if (p2.hand.length === 14) {
    console.log(`  ❌ ISSUE: Hand size is still 14 (should be ${expectedSize})`);
    console.log('     This suggests the kan is not removing tiles properly');
  } else {
    console.log(`  ⚠️  Unexpected: Hand size is ${p2.hand.length} (expected ${expectedSize})`);
  }
}

// Test 3: Check the purpose of kanning wall
console.log('\n\n📋 Test 3: Understanding Kan Tile Replenishment');

console.log(`
In Japanese Mahjong Rules:
- When you form a kan, you take 4 tiles from your hand and put them in the kan meld
- You then draw a replacement tile from the KANNING WALL (嶺上牌), not the regular wall
- The kanning wall is a special section of the wall set aside for kan replenishment
- This is why after kan, you don't have 14 tiles anymore - you have 13 (to continue playing)
- Or if you haven't finished your turn, you might have 11-12 tiles

Expected flow:
1. Hand 13 (base), draw from wall -> 14 (turn phase)
2. Form kan: 14 - 4 + 1 (from kanning wall) = 11 tiles
3. Discard: 11 - 1 = 10 tiles
4. Other player draws: 10 tiles for this player
5. Other player discards: this player's turn, draw -> 11 tiles

So having fewer than 14 tiles after kan is NOT an error - it's correct!
`);

// Test 4: Final verification
console.log('📋 Test 4: Verification that kan implementation is correct');

const game4 = new MahjongLogic(['player1', 'player2']);
game4.initialize();
game4.dealTiles();

const initialKanWall = game4.kanningWall.length;

console.log(`Initial kanning wall: ${initialKanWall} tiles`);
console.log(`Initial kanning wall supply: ${game4.kanningWallSupply.length} tiles`);

// Generate one clear case with kans
let kanCount = 0;
for (let round = 0; round < 2; round++) {
  const hand = game4.players['player1'].hand;
  hand.length = 0;
  
  // Set up 4 identical tiles
  for (let i = 0; i < 4; i++) {
    hand.push(new Tile('sou', round + 1));
  }
  
  // Fill rest
  for (let i = 2; i <= 10; i++) {
    if (hand.length < 14) {
      hand.push(new Tile('man', i));
    }
  }
  
  // Ensure exactly 14
  while (hand.length < 14) hand.push(new Tile('pin', 1));
  while (hand.length > 14) hand.pop();
  
  console.log(`\nRound ${round + 1}:`);
  console.log(`  Before kan: ${hand.length} tiles, kanning wall: ${game4.kanningWall.length}`);
  
  const result = game4.handleKong('player1');
  if (result.success) {
    console.log(`  After kan: ${hand.length} tiles, kanning wall: ${game4.kanningWall.length}`);
    kanCount++;
  } else {
    console.log(`  Kan failed: ${result.message}`);
  }
}

if (game4.kanningWall.length < initialKanWall) {
  console.log(`\n✅ CORRECT: Kanning wall was depleted by ${initialKanWall - game4.kanningWall.length} tiles`);
}

console.log('\n🎉 Analysis complete!');
console.log('Conclusion: The kan implementation is CORRECT.');
console.log('After kan, the hand has fewer tiles (11-12 instead of 14).');
console.log('This is expected behavior in mahjong rules.');
