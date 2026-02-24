const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');

console.log('=== リーチの役判定テスト ===\n');

const calculator = new ScoreCalculator();

// テストケース1: リーチ+ツモ
console.log('【テスト1】リーチ+ツモ');
const hand1 = [
  new Tile('manzu', 1),
  new Tile('manzu', 2),
  new Tile('manzu', 3),
  new Tile('pinzu', 2),
  new Tile('pinzu', 3),
  new Tile('pinzu', 4),
  new Tile('pinzu', 5),
  new Tile('pinzu', 6),
  new Tile('pinzu', 7),
  new Tile('souzu', 3),
  new Tile('souzu', 4),
  new Tile('souzu', 5),
  new Tile('souzu', 7),
  new Tile('souzu', 7),
];

const result1 = calculator.calculateScore({
  hand: hand1,
  melds: [],
  winningTile: new Tile('souzu', 7),
  isTsumo: true,
  isRon: false,
  riichi: true,
  menzen: true
});

console.log('役:', result1.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', ') || 'なし');
console.log('飜数:', result1.han);
console.log('得点:', result1.score);
console.log('');

// テストケース2: リーチ+平和
console.log('【テスト2】リーチ+平和（門前ロン）');
const hand2 = [
  new Tile('manzu', 9),
  new Tile('manzu', 9),
  new Tile('pinzu', 1),
  new Tile('pinzu', 2),
  new Tile('pinzu', 3),
  new Tile('pinzu', 5),
  new Tile('pinzu', 6),
  new Tile('pinzu', 6),
  new Tile('pinzu', 7),
  new Tile('pinzu', 7),
  new Tile('pinzu', 8),
  new Tile('souzu', 2),
  new Tile('souzu', 3),
  new Tile('souzu', 4),
];

const result2 = calculator.calculateScore({
  hand: hand2,
  melds: [],
  winningTile: new Tile('pinzu', 8),
  isTsumo: false,
  isRon: true,
  riichi: true,
  menzen: true
});

console.log('役:', result2.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', ') || 'なし');
console.log('飜数:', result2.han);
console.log('得点:', result2.score);
console.log('');

// テストケース3: リーチ+タンヤオ
console.log('【テスト3】リーチ+タンヤオ');
const hand3 = [
  new Tile('manzu', 2),
  new Tile('manzu', 2),
  new Tile('manzu', 3),
  new Tile('manzu', 4),
  new Tile('manzu', 5),
  new Tile('pinzu', 3),
  new Tile('pinzu', 4),
  new Tile('pinzu', 5),
  new Tile('pinzu', 6),
  new Tile('pinzu', 7),
  new Tile('pinzu', 8),
  new Tile('souzu', 4),
  new Tile('souzu', 5),
  new Tile('souzu', 6),
];

const result3 = calculator.calculateScore({
  hand: hand3,
  melds: [],
  winningTile: new Tile('souzu', 6),
  isTsumo: false,
  isRon: true,
  riichi: true,
  menzen: true
});

console.log('役:', result3.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', ') || 'なし');
console.log('飜数:', result3.han);
console.log('得点:', result3.score);
console.log('');

// テストケース4: リーチなし
console.log('【テスト4】リーチなし（役なし）');
const hand4 = [
  new Tile('manzu', 9),
  new Tile('manzu', 9),
  new Tile('pinzu', 1),
  new Tile('pinzu', 2),
  new Tile('pinzu', 3),
  new Tile('pinzu', 5),
  new Tile('pinzu', 6),
  new Tile('pinzu', 6),
  new Tile('pinzu', 7),
  new Tile('pinzu', 7),
  new Tile('pinzu', 8),
  new Tile('souzu', 2),
  new Tile('souzu', 3),
  new Tile('souzu', 4),
];

const result4 = calculator.calculateScore({
  hand: hand4,
  melds: [],
  winningTile: new Tile('pinzu', 5),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true
});

console.log('役:', result4.yaku?.map(y => `${y.name}(${y.han}飜)`).join(', ') || 'なし');
console.log('判定:', result4.valid ? '和了' : result4.error);
console.log('');

console.log('=== テスト完了 ===');
