const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');

console.log('=== 点数計算テスト ===\n');

const calculator = new ScoreCalculator();

// テストケース1: 2飜 40符
console.log('【テスト1: 2飜 40符】');
const hand1 = [
  new Tile('man', 1), new Tile('man', 1), new Tile('man', 1), // 刻子
  new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 順子
  new Tile('sou', 5), new Tile('sou', 6), new Tile('sou', 7), // 順子
  new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 刻子（東）
  new Tile('pin', 5), new Tile('pin', 5), // 雀頭
];

const result1 = calculator.calculateScore({
  hand: hand1,
  melds: [],
  winningTile: new Tile('pin', 5),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});

console.log('飜数:', result1.han, '飜');
console.log('符:', result1.fu, '符');
console.log('得点:', result1.score, '点');
console.log('役:', result1.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', '));
console.log('');

// テストケース2: 2飜 30符
console.log('【テスト2: 2飜 30符（リーチ+ツモ）】');
const hand2 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4), // 順子
  new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7), // 順子
  new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5), // 順子
  new Tile('sou', 8), new Tile('sou', 8), // 雀頭
  new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 順子
];

const result2 = calculator.calculateScore({
  hand: hand2,
  melds: [],
  winningTile: new Tile('pin', 4),
  isTsumo: true,
  isRon: false,
  riichi: true,
  menzen: true
});

console.log('飜数:', result2.han, '飜');
console.log('符:', result2.fu, '符');
console.log('得点:', result2.score, '点');
console.log('役:', result2.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', '));
console.log('');

// テストケース3: 1飜 30符（ツモのみ）
console.log('【テスト3: 1飜 30符（ツモのみ）】');
const hand3 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
  new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
  new Tile('sou', 8), new Tile('sou', 8),
  new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
];

const result3 = calculator.calculateScore({
  hand: hand3,
  melds: [],
  winningTile: new Tile('pin', 4),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});

console.log('飜数:', result3.han, '飜');
console.log('符:', result3.fu, '符');
console.log('得点:', result3.score, '点');
console.log('役:', result3.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', '));
console.log('');

// テストケース4: 3飜 30符
console.log('【テスト4: 3飜 30符（リーチ+ツモ+タンヤオ）】');
const hand4 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
  new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
  new Tile('sou', 8), new Tile('sou', 8),
  new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
];

const result4 = calculator.calculateScore({
  hand: hand4,
  melds: [],
  winningTile: new Tile('pin', 4),
  isTsumo: true,
  isRon: false,
  riichi: true,
  menzen: true
});

console.log('飜数:', result4.han, '飜');
console.log('符:', result4.fu, '符');
console.log('得点:', result4.score, '点');
console.log('役:', result4.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', '));
console.log('');

console.log('=== 点数表（二人麻雀：ツモ=ロン）===');
console.log('1飜 30符: 1000点');
console.log('1飜 40符: 1300点');
console.log('2飜 30符: 2000点');
console.log('2飜 40符: 2600点 ← ユーザーが報告した値');
console.log('3飜 30符: 3900点');
console.log('3飜 40符: 5200点');
console.log('4飜以上: 満貫 8000点');
console.log('');
console.log('=== テスト完了 ===');
