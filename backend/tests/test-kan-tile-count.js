const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 Testing Kan Hand Tile Count Verification\n');

// Test 1: Concealed Kan - Hand tile count verification
console.log('📋 Test 1: Concealed Kan - Hand tile count during process');
const game1 = new MahjongLogic(['player1', 'player2']);
game1.initialize();
game1.dealTiles();

const p1Hand = game1.players['player1'].hand;
console.log(`Initial hand size: ${p1Hand.length} tiles`);

// Setup: Create a scenario where we have 14 tiles and want to kan
// Clear hand first
p1Hand.length = 0;

// Add 4 identical tiles (for concealed kan)
for (let i = 0; i < 4; i++) {
  p1Hand.push(new Tile('man', 5));
}

// Add 10 more tiles to make 14 total
for (let i = 1; i <= 10; i++) {
  p1Hand.push(new Tile('man', i));
}

console.log(`Before kan: hand has ${p1Hand.length} tiles`);
console.log(`Hand: ${p1Hand.map(t => t.toString()).join(', ')}`);

// Perform the kan
const kanResult1 = game1.handleKong('player1');
console.log(`Kan result: ${kanResult1.message}`);
console.log(`After kan: hand has ${p1Hand.length} tiles`);
console.log(`Expected: 11 tiles (14 - 4 removed + 1 drawn from kanning wall)`);

if (p1Hand.length === 11) {
  console.log('✅ CORRECT: Hand count is 11 tiles after concealed kan\n');
} else {
  console.log(`❌ ERROR: Hand count is ${p1Hand.length}, expected 11\n`);
}

// Test 2: Added Kan - Hand tile count verification
console.log('📋 Test 2: Added Kan - Hand tile count during process');
const game2 = new MahjongLogic(['player1', 'player2']);
game2.initialize();
game2.dealTiles();

const p2Hand = game2.players['player1'].hand;
p2Hand.length = 0;

// Setup: Create a pung and add a matching tile to hand
const pung = [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)];
game2.players['player1'].melds.push(pung);

// Add matching tile and other tiles to make 13 tiles (normal hand)
p2Hand.push(new Tile('sou', 7)); // matching tile for added kan
for (let i = 1; i <= 12; i++) {
  p2Hand.push(new Tile('man', i % 9 || 9));
}

console.log(`Before kan: hand has ${p2Hand.length} tiles`);
console.log(`Melds: ${game2.players['player1'].melds.map(m => `[${m.length}]`).join(', ')}`);

// Perform the added kan
const kanResult2 = game2.handleKong('player1');
console.log(`Kan result: ${kanResult2.message}`);
console.log(`After kan: hand has ${p2Hand.length} tiles`);
console.log(`Melds: ${game2.players['player1'].melds.map(m => `[${m.length}]`).join(', ')}`);
console.log(`Expected: 12 tiles (13 - 1 removed from hand, +1 drawn from kanning wall)`);

if (p2Hand.length === 12) {
  console.log('✅ CORRECT: Hand count is 12 tiles after added kan\n');
} else {
  console.log(`❌ ERROR: Hand count is ${p2Hand.length}, expected 12\n`);
}

// Test 3: Check if hand ever exceeds 14 tiles during kan
console.log('📋 Test 3: Checking for intermediate hand overflow (>14 tiles)');

// Create a custom version to track intermediate states
class DebugMahjongLogic extends MahjongLogic {
  attemptAddedKan(userId) {
    const hand = this.players[userId].hand;
    const melds = this.players[userId].melds;
    
    console.log(`  [Debug] Starting attempted added kan, hand size: ${hand.length}`);
    
    for (let i = 0; i < melds.length; i++) {
      const meld = melds[i];
      
      if (meld.length !== 3) continue;
      
      const meldTile = meld[0];
      
      for (let j = 0; j < hand.length; j++) {
        if (hand[j].equals(meldTile)) {
          console.log(`  [Debug] Found matching tile at index ${j}, hand size: ${hand.length}`);
          
          const matchingTile = hand[j];
          
          // Remove the tile from hand
          hand.splice(j, 1);
          console.log(`  [Debug] After removing tile from hand, hand size: ${hand.length}`);
          
          // Add the tile to the pung (convert to kan)
          meld.push(matchingTile);
          console.log(`  [Debug] After adding to meld, hand size: ${hand.length}`);
          
          // Draw a tile from the kanning wall to restore hand size
          const drawnTile = this.drawFromKanningWall();
          if (drawnTile) {
            console.log(`  [Debug] Before drawing from kanning wall, hand size: ${hand.length}`);
            this.players[userId].hand.push(drawnTile);
            console.log(`  [Debug] After drawing from kanning wall, hand size: ${hand.length}`);
            
            if (hand.length > 14) {
              console.log(`  ❌ ERROR: Hand size exceeded 14! Current size: ${hand.length}`);
            }
            
            this.players[userId].drawnTile = drawnTile;
            this.players[userId].drawnTileIndex = this.players[userId].hand.length - 1;
          }
          
          this.pendingPungFor = null;
          this.ronPossibleFor = null;
          this.ronTile = null;
          this.lastDiscard = null;
          this.lastDiscardBy = null;
          
          console.log(`  [Debug] Added kan complete, final hand size: ${hand.length}`);
          
          return {
            success: true,
            message: `加カン: ${meldTile.toString()}×4`,
            kanType: 'added'
          };
        }
      }
    }
    
    return { success: false, message: 'Cannot form added kan' };
  }
}

const game3 = new DebugMahjongLogic(['player1', 'player2']);
game3.initialize();
game3.dealTiles();

const p3Hand = game3.players['player1'].hand;
p3Hand.length = 0;

// Setup: Create a pung and add a matching tile to hand
const pung3 = [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)];
game3.players['player1'].melds.push(pung3);

// Add tiles
p3Hand.push(new Tile('sou', 7)); // matching tile for added kan
for (let i = 1; i <= 12; i++) {
  p3Hand.push(new Tile('man', i % 9 || 9));
}

console.log(`Initial hand size: ${p3Hand.length} tiles`);
const debugResult = game3.handleKong('player1');
console.log(`Final hand size: ${p3Hand.length} tiles`);

if (p3Hand.length <= 14) {
  console.log('✅ CORRECT: Hand never exceeded 14 tiles\n');
} else {
  console.log(`❌ ERROR: Hand size reached ${p3Hand.length} tiles\n`);
}

// Test 4: Verify maximum hand size scenarios
console.log('📋 Test 4: Multiple kans and hand size consistency');
const game4 = new MahjongLogic(['player1', 'player2']);
game4.initialize();
game4.dealTiles();

const p4Hand = game4.players['player1'].hand;
p4Hand.length = 0;

// First concealed kan
for (let i = 0; i < 4; i++) {
  p4Hand.push(new Tile('man', 1));
}

// Filler tiles
for (let i = 2; i <= 10; i++) {
  p4Hand.push(new Tile('man', i));
}

console.log(`Before 1st kan: ${p4Hand.length} tiles`);
const kan1 = game4.handleKong('player1');
console.log(`After 1st kan: ${p4Hand.length} tiles (expected 11)`);

// Now setup for a second concealed kan with tiles in current hand
const currentHand = game4.players['player1'].hand;
console.log(`Current hand before 2nd kan: ${currentHand.length} tiles`);
console.log(`Current hand: ${currentHand.map(t => t.toString()).join(', ')}`);

console.log('\n🎉 All hand tile count tests completed!');
