const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

// Test suite for Kan implementation
console.log('🧪 [KAN TEST] Starting kan implementation tests...\n');

// Test 1: Concealed Kan Detection
console.log('📋 Test 1: Concealed Kan Detection (面前扱い確認)');
const gameLogic1 = new MahjongLogic(['player1', 'player2']);
gameLogic1.initialize();
gameLogic1.dealTiles();

// Manually set up player1's hand with 4 identical tiles
const player1Hand = gameLogic1.players['player1'].hand;
player1Hand.length = 0; // Clear hand
// Add 4x 5-man tiles
for (let i = 0; i < 4; i++) {
  player1Hand.push(new Tile('man', 5));
}
// Add some other tiles to make hand reasonable
player1Hand.push(new Tile('man', 1));
player1Hand.push(new Tile('man', 2));
player1Hand.push(new Tile('pin', 3));

console.log(`Player1 hand: ${player1Hand.map(t => t.toString()).join(', ')}`);
console.log(`Player1 is menzen before kan: ${gameLogic1.isPlayerMenzen('player1')}`);
console.log(`Can player1 kan: ${gameLogic1.canPlayerKan('player1')}`);

const kanResult = gameLogic1.handleKong('player1');
console.log(`Kan result:`, kanResult);
console.log(`Player1 hand after kan: ${gameLogic1.players['player1'].hand.length} tiles`);
console.log(`Player1 melds after kan: ${gameLogic1.players['player1'].melds.length} melds`);
console.log(`Player1 concealedMeldIndices: ${Array.from(gameLogic1.players['player1'].concealedMeldIndices).join(', ')}`);
console.log(`Player1 is menzen after kan: ${gameLogic1.isPlayerMenzen('player1')} ✅ (should be true - 面前扱い)`);
if (gameLogic1.players['player1'].melds.length > 0) {
  console.log(`  Meld 0: ${gameLogic1.players['player1'].melds[0].map(t => t.toString()).join(', ')}`);
}
console.log('✅ Test 1 complete\n');

// Test 2: Added Kan (to Pung)
console.log('📋 Test 2: Added Kan (to Pung) - 面前喪失確認');
const gameLogic2 = new MahjongLogic(['player1', 'player2']);
gameLogic2.initialize();
gameLogic2.dealTiles();

// Set up player1 with a pung and a matching tile
const player2Hand = gameLogic2.players['player1'].hand;
player2Hand.length = 0;

// Add a pung (3 tiles) to melds
const pungMeld = [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)];
gameLogic2.players['player1'].melds.push(pungMeld);

// Add a matching tile in hand
player2Hand.push(new Tile('sou', 7));
player2Hand.push(new Tile('pin', 1));
player2Hand.push(new Tile('pin', 2));

console.log(`Player1 hand: ${player2Hand.map(t => t.toString()).join(', ')}`);
console.log(`Player1 melds: ${gameLogic2.players['player1'].melds.map(m => m.map(t => t.toString()).join('')).join(', ')}`);
console.log(`Player1 is menzen before kan: ${gameLogic2.isPlayerMenzen('player1')}`);
console.log(`Can player1 kan: ${gameLogic2.canPlayerKan('player1')}`);

const kanResult2 = gameLogic2.handleKong('player1');
console.log(`Kan result:`, kanResult2);
console.log(`Player1 hand after kan: ${gameLogic2.players['player1'].hand.length} tiles`);
console.log(`Player1 melds after kan: ${gameLogic2.players['player1'].melds.map(m => m.map(t => t.toString()).join('')).join(', ')}`);
console.log(`Player1 is menzen after kan: ${gameLogic2.isPlayerMenzen('player1')} ❌ (should be false - 面前喪失)`);
console.log('✅ Test 2 complete\n');

// Test 3: Cannot Kan with Riichi
console.log('📋 Test 3: Cannot Kan with Riichi');
const gameLogic3 = new MahjongLogic(['player1', 'player2']);
gameLogic3.initialize();
gameLogic3.dealTiles();

// Set up player1 with riichi
const player3Hand = gameLogic3.players['player1'].hand;
player3Hand.length = 0;
for (let i = 0; i < 4; i++) {
  player3Hand.push(new Tile('honor', 1));
}
player3Hand.push(new Tile('man', 1));

// Enable riichi
gameLogic3.players['player1'].riichi = true;

console.log(`Player1 riichi: ${gameLogic3.players['player1'].riichi}`);
console.log(`Can player1 kan: ${gameLogic3.canPlayerKan('player1')}`);

const kanResult3 = gameLogic3.handleKong('player1');
console.log(`Kan result:`, kanResult3);
console.log(kanResult3.success ? '❌ FAIL: Should not allow kan during riichi' : '✅ Correctly blocked kan during riichi');
console.log('✅ Test 3 complete\n');

// Test 4: Dora increment
console.log('📋 Test 4: Dora Increment on Kan');
const gameLogic4 = new MahjongLogic(['player1', 'player2']);
gameLogic4.initialize();
gameLogic4.dealTiles();

const initialDoraCount = gameLogic4.doraIndicators.length;
console.log(`Initial dora indicators: ${initialDoraCount}`);
console.log(`Initial dora indicators: ${gameLogic4.doraIndicators.map(t => t.toString()).join(', ')}`);

// Set up player1 with 4 identical tiles
const player4Hand = gameLogic4.players['player1'].hand;
player4Hand.length = 0;
for (let i = 0; i < 4; i++) {
  player4Hand.push(new Tile('pin', 4));
}
player4Hand.push(new Tile('honor', 2));

const kanResult4 = gameLogic4.handleKong('player1');
console.log(`Kan result:`, kanResult4.success ? 'Success' : 'Failed');
console.log(`Dora indicators after kan: ${gameLogic4.doraIndicators.length}`);
console.log(`Dora indicators: ${gameLogic4.doraIndicators.map(t => t.toString()).join(', ')}`);
console.log(`Dora tiles: ${gameLogic4.doraTiles.map(t => t.toString()).join(', ')}`);
console.log(gameLogic4.doraIndicators.length > initialDoraCount ? '✅ Dora increment successful' : '⚠️ Dora not incremented');
console.log('✅ Test 4 complete\n');

// Test 5: Cannot add kan to concealed kan
console.log('📋 Test 5: Cannot add kan to concealed kan');
const gameLogic5 = new MahjongLogic(['player1', 'player2']);
gameLogic5.initialize();
gameLogic5.dealTiles();

// Setup: one concealed kan and a matching tile in hand
const player5Hand = gameLogic5.players['player1'].hand;
player5Hand.length = 0;

const concealedKanMeld = [new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3)];
gameLogic5.players['player1'].melds.push(concealedKanMeld);
// Mark index 0 as concealed
gameLogic5.players['player1'].concealedMeldIndices.add(0);

// Add a matching tile in hand
player5Hand.push(new Tile('honor', 3));
player5Hand.push(new Tile('man', 5));

console.log(`Player1 melds: ${gameLogic5.players['player1'].melds.map(m => `[${m.length}]${m[0].toString()}`).join(', ')}`);
console.log(`Player1 concealedMeldIndices: ${Array.from(gameLogic5.players['player1'].concealedMeldIndices).join(', ')}`);
console.log(`Can player1 kan (add to concealed): ${gameLogic5.canPlayerKan('player1')} ✅ (should be false)`);
console.log('✅ Test 5 complete\n');

console.log('🎉 All Kan tests completed!');

