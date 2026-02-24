const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');

const calculator = new ScoreCalculator();

console.log('=== 役判定テスト ===\n');

// テスト1: 七対子
console.log('【テスト1: 七対子】');
const chiitoitsu = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6), new Tile('honor', 6),
];
const result1 = calculator.calculateScore({
  hand: chiitoitsu,
  melds: [],
  winningTile: new Tile('honor', 6),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});
console.log('結果:', result1.yaku.map(y => y.name).join(', '));
console.log('飜数:', result1.han, '点数:', result1.score);
console.log();

// テスト2: 対々和
console.log('【テスト2: 対々和】');
const toitoi = [
  new Tile('man', 2), new Tile('man', 2), new Tile('man', 2),
  new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6), new Tile('honor', 6), new Tile('honor', 6),
  new Tile('pin', 3), new Tile('pin', 3),
];
const result2 = calculator.calculateScore({
  hand: toitoi,
  melds: [],
  winningTile: new Tile('pin', 3),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true
});
console.log('結果:', result2.yaku.map(y => y.name).join(', '));
console.log('飜数:', result2.han, '点数:', result2.score);
console.log();

// テスト3: 清一色
console.log('【テスト3: 清一色（門前）】');
const chinitsu = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('man', 6), new Tile('man', 7), new Tile('man', 8),
  new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
  new Tile('man', 2), new Tile('man', 2),
];
const result3 = calculator.calculateScore({
  hand: chinitsu,
  melds: [],
  winningTile: new Tile('man', 2),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});
console.log('結果:', result3.yaku.map(y => y.name).join(', '));
console.log('飜数:', result3.han, '点数:', result3.score);
console.log();

// テスト4: 混一色
console.log('【テスト4: 混一色】');
const honitsu = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
  new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
  new Tile('man', 1), new Tile('man', 1),
];
const result4 = calculator.calculateScore({
  hand: honitsu,
  melds: [],
  winningTile: new Tile('man', 1),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true
});
console.log('結果:', result4.yaku.map(y => y.name).join(', '));
console.log('飜数:', result4.han, '点数:', result4.score);
console.log();

// テスト5: 大三元
console.log('【テスト5: 大三元（役満）】');
const daisangen = [
  new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
  new Tile('honor', 6), new Tile('honor', 6), new Tile('honor', 6),
  new Tile('honor', 7), new Tile('honor', 7), new Tile('honor', 7),
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 5), new Tile('pin', 5),
];
const result5 = calculator.calculateScore({
  hand: daisangen,
  melds: [],
  winningTile: new Tile('pin', 5),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});
console.log('結果:', result5.yaku.map(y => y.name).join(', '));
console.log('飜数:', result5.han, '点数:', result5.score);
console.log();

// テスト6: 一気通貫
console.log('【テスト6: 一気通貫】');
const ittsu = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
  new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
  new Tile('sou', 5), new Tile('sou', 5),
];
const result6 = calculator.calculateScore({
  hand: ittsu,
  melds: [],
  winningTile: new Tile('sou', 5),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true
});
console.log('結果:', result6.yaku.map(y => y.name).join(', '));
console.log('飜数:', result6.han, '点数:', result6.score);
console.log();

console.log('=== テスト完了 ===');
