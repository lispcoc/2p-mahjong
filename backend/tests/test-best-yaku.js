const ScoreCalculator = require('./src/logic/ScoreCalculator');
const Tile = require('./src/logic/Tile');

const calculator = new ScoreCalculator();

console.log('=== 複数和了形テスト ===\n');

// テスト1: 平和 vs 対々和（面子構成が異なる）
console.log('【テスト1: 複数の和了形がある場合】');
// 1-2-3萬, 4-5-6萬 または 1-1-1萬, 2-2-2萬, 3-3-3萬（この場合は不可能だが）
// 実際には: 2-3-4萬, 5-6-7萬, 8-8-8萬, 9-9-9萬, 1-1萬（平和にならない）
const testHand1 = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 3), new Tile('sou', 3),
];
const result1 = calculator.calculateScore({
  hand: testHand1,
  melds: [],
  winningTile: new Tile('sou', 3),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true
});
console.log('手牌: 123m 456m 222p 555p 33s');
console.log('結果:', result1.yaku.map(y => y.name).join(', '));
console.log('飜数:', result1.han, '符:', result1.fu, '点数:', result1.score);
console.log();

// テスト2: 一盃口 vs 三色同順
console.log('【テスト2: 一盃口と三色同順の選択】');
// 2-3-4萬 2-3-4萬 5-6-7索 8-8-8筒 9-9索
const testHand2 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('sou', 5), new Tile('sou', 6), new Tile('sou', 7),
  new Tile('pin', 8), new Tile('pin', 8), new Tile('pin', 8),
  new Tile('sou', 9), new Tile('sou', 9),
];
const result2 = calculator.calculateScore({
  hand: testHand2,
  melds: [],
  winningTile: new Tile('sou', 9),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});
console.log('手牌: 234m 234m 567s 888p 99s');
console.log('結果:', result2.yaku.map(y => y.name).join(', '));
console.log('飜数:', result2.han, '符:', result2.fu, '点数:', result2.score);
console.log();

// テスト3: リーチ + 平和 vs リーチ + タンヤオ
console.log('【テスト3: リーチ + 平和】');
const testHand3 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 3), new Tile('pin', 4), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
  new Tile('sou', 6), new Tile('sou', 7), new Tile('sou', 8),
  new Tile('man', 5), new Tile('man', 5),
];
const result3 = calculator.calculateScore({
  hand: testHand3,
  melds: [],
  winningTile: new Tile('man', 5),
  isTsumo: false,
  isRon: true,
  riichi: true,
  menzen: true
});
console.log('手牌: 234m 345p 456s 678s 55m');
console.log('結果:', result3.yaku.map(y => y.name).join(', '));
console.log('飜数:', result3.han, '符:', result3.fu, '点数:', result3.score);
console.log();

// テスト4: 二盃口の高得点（七対子にならない形）
console.log('【テスト4: 二盃口】');
// 1-2-3萬 1-2-3萬 7-8-9萬 7-8-9萬 5-5筒
// 1,2,3,7,8,9がそれぞれ2枚ずつで、5が2枚
const testHand4 = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
  new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
  new Tile('pin', 5), new Tile('pin', 5),
];
const result4 = calculator.calculateScore({
  hand: testHand4,
  melds: [],
  winningTile: new Tile('pin', 5),
  isTsumo: true,
  isRon: false,
  riichi: true,
  menzen: true
});
console.log('手牌: 123m 123m 789m 789m 55p（二盃口形）');
console.log('結果:', result4.yaku.map(y => y.name).join(', '));
console.log('飜数:', result4.han, '符:', result4.fu, '点数:', result4.score);
console.log();

console.log('=== テスト完了 ===');
