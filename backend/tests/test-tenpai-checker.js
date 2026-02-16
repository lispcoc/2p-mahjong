const TenpaiChecker = require('./src/logic/TenpaiChecker.js');

// Test with simple tiles
const hand = [
  { suit: 'man', number: 1 },
  { suit: 'man', number: 2 },
  { suit: 'man', number: 3 },
  { suit: 'pin', number: 4 },
  { suit: 'pin', number: 5 },
  { suit: 'pin', number: 6 },
  { suit: 'sou', number: 7 },
  { suit: 'sou', number: 8 },
  { suit: 'sou', number: 9 },
  { suit: 'honor', number: 1 },
  { suit: 'honor', number: 1 },
  { suit: 'honor', number: 1 },
  { suit: 'honor', number: 2 },
];

const melds = [];

console.log('Testing TenpaiChecker...');
console.log('Hand:', hand);

try {
  const winning = TenpaiChecker.getWinningTiles(hand, melds);
  console.log('Winning tiles:', winning);
  console.log('✅ TenpaiChecker is working!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
