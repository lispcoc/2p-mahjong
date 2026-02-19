const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');

console.log('🧪 Testing new Yaku implementations...\n');

const scoreCalc = new ScoreCalculator();

// Test 1: 緑一色（リョクイッショク）
console.log('📋 Test 1: 緑一色（リョクイッショク）');
const green1Hand = [
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 3), new Tile('pin', 3),
  new Tile('pin', 4), new Tile('pin', 4),
  new Tile('pin', 6), new Tile('pin', 6),
  new Tile('pin', 8), new Tile('pin', 8),
  new Tile('honor', 6), new Tile('honor', 6),
  new Tile('pin', 2), new Tile('pin', 3),
];

const isGreen1 = scoreCalc.isRyokuisshoku(green1Hand);
console.log(`  Hand: ${green1Hand.map(t => t.toString()).join(', ')}`);
console.log(`  Is 緑一色: ${isGreen1} ${isGreen1 ? '✅' : '❌'}`);
console.log('');

// Test 2: 大車輪（ダイシャリン）
console.log('📋 Test 2: 大車輪（ダイシャリン）');
const wheel1Hand = [
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 3), new Tile('pin', 3),
  new Tile('pin', 4), new Tile('pin', 4),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('pin', 6), new Tile('pin', 6),
  new Tile('pin', 7), new Tile('pin', 7),
  new Tile('pin', 8), new Tile('pin', 2),
];

const isWheel1 = scoreCalc.isDaisharin(wheel1Hand);
console.log(`  Hand: ${wheel1Hand.map(t => t.toString()).join(', ')}`);
console.log(`  Is 大車輪: ${isWheel1} ${isWheel1 ? '✅' : '❌'}`);
console.log('');

// Test 3: 三槓子（サンカンコ）
console.log('📋 Test 3: 三槓子（サンカンコ）');
const melds3 = [
  [new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), new Tile('man', 5)], // 槓
  [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)], // 槓
  [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)], // 槓
  [new Tile('honor', 1), new Tile('honor', 1)], // 対子
];

const isSankan = scoreCalc.isSankankouWithMelds(melds3);
console.log(`  Melds: 3x 槓 + 1x 対子`);
console.log(`  Is 三槓子: ${isSankan} ${isSankan ? '✅' : '❌'}`);
console.log('');

// Test 4: 四槓子（スーカンコ）
console.log('📋 Test 4: 四槓子（スーカンコ）');
const melds4 = [
  [new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), new Tile('man', 5)], // 槓
  [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)], // 槓
  [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)], // 槓
  [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)], // 槓
];

const isSukan = scoreCalc.isSukankou(melds4);
console.log(`  Melds: 4x 槓`);
console.log(`  Is 四槓子: ${isSukan} ${isSukan ? '✅' : '❌'}`);
console.log('');

// Test 5: 緑一色 negative case 
console.log('📋 Test 5: 緑一色 negative case（マンズを含む）');
const notGreenHand = [
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 3), new Tile('pin', 3),
  new Tile('pin', 4), new Tile('pin', 4),
  new Tile('pin', 6), new Tile('pin', 6),
  new Tile('man', 8), // ❌ マンズが含まれている
  new Tile('man', 8),
  new Tile('honor', 6), new Tile('honor', 6),
  new Tile('pin', 2), new Tile('pin', 3),
];

const isNotGreen = scoreCalc.isRyokuisshoku(notGreenHand);
console.log(`  Hand contains: pin 2,3,4,6 + man 8 + honor 6`);
console.log(`  Is 緑一色: ${isNotGreen} ${!isNotGreen ? '✅ (正しくfalse)' : '❌'}`);
console.log('');

// Test 6: 大車輪 negative case（1含む）
console.log('📋 Test 6: 大車輪 negative case（pin 1は不許可）');
const notWheelHand = [
  new Tile('pin', 1), // ❌ 1は許可されていない
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 3), new Tile('pin', 3),
  new Tile('pin', 4), new Tile('pin', 4),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('pin', 6), new Tile('pin', 6),
  new Tile('pin', 7), new Tile('pin', 7),
  new Tile('pin', 8),
];

const isNotWheel = scoreCalc.isDaisharin(notWheelHand);
console.log(`  Hand contains: pin 1-8 (but pin 1 is not allowed)`);
console.log(`  Is 大車輪: ${isNotWheel} ${!isNotWheel ? '✅ (正しくfalse)' : '❌'}`);
console.log('');

console.log('✅ All tests complete!');
