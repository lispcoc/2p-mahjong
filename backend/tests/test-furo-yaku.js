const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');

const calculator = new ScoreCalculator();

console.log('=== 副露の役判定テスト ===\n');

// テスト1: 副露あり対々和
console.log('【テスト1: 副露あり対々和】');
// 手牌: 222m 555p 999s 77s（刻子3つ+雀頭） = 11枚
// 副露: 888p（刻子1つ） = 3枚
// 合計: 14枚 = 刻子4つ+雀頭 → 対々和成立
const hand1 = [
  new Tile('man', 2), new Tile('man', 2), new Tile('man', 2),
  new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 9), new Tile('sou', 9), new Tile('sou', 9),
  new Tile('sou', 7), new Tile('sou', 7),
];
const melds1 = [
  [new Tile('pin', 8), new Tile('pin', 8), new Tile('pin', 8)]
];
const result1 = calculator.calculateScore({
  hand: hand1,
  melds: melds1,
  winningTile: new Tile('sou', 7),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: false
});
console.log('手牌: 222m 555p 999s 77s（11枚）');
console.log('副露: 888p');
console.log('結果:', result1.valid ? result1.yaku.map(y => y.name).join(', ') : result1.error);
console.log('飜数:', result1.han, '符:', result1.fu, '点数:', result1.score);
console.log();

// テスト2: 副露あり、対々和にならない（順子がある）
console.log('【テスト2: 副露あり、順子混在（役なし）】');
const hand2 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 8), new Tile('sou', 8), new Tile('sou', 8),
  new Tile('sou', 7), new Tile('sou', 7),
];
const melds2 = [
  [new Tile('pin', 8), new Tile('pin', 8), new Tile('pin', 8)]
];
const result2 = calculator.calculateScore({
  hand: hand2,
  melds: melds2,
  winningTile: new Tile('sou', 7),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: false
});
console.log('手牌: 234m 555p 888s 77s（11枚）');
console.log('副露: 888p');
console.log('結果:', result2.valid ? result2.yaku.map(y => y.name).join(', ') : result2.error);
console.log('飜数:', result2.han, '符:', result2.fu, '点数:', result2.score);
console.log();

// テスト3: 副露ありタンヤオ
console.log('【テスト3: 副露ありタンヤオ（鳴きタンヤオ）】');
const hand3 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 4), new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 3), new Tile('sou', 3),
];
const melds3 = [
  [new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5)]
];
const result3 = calculator.calculateScore({
  hand: hand3,
  melds: melds3,
  winningTile: new Tile('sou', 3),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: false
});
console.log('手牌: 234m 567p 444s 33s（11枚）');
console.log('副露: 555s');
console.log('結果:', result3.valid ? result3.yaku.map(y => y.name).join(', ') : result3.error);
console.log('飜数:', result3.han, '符:', result3.fu, '点数:', result3.score);
console.log();

// テスト4: 副露あり役牌
console.log('【テスト4: 副露あり役牌（白）】');
const hand4 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
  new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
  new Tile('sou', 3), new Tile('sou', 3),
];
const melds4 = [
  [new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5)] // 白
];
const result4 = calculator.calculateScore({
  hand: hand4,
  melds: melds4,
  winningTile: new Tile('sou', 3),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: false
});
console.log('手牌: 234m 567p 789s 33s（11枚）');
console.log('副露: 白白白');
console.log('結果:', result4.valid ? result4.yaku.map(y => y.name).join(', ') : result4.error);
console.log('飜数:', result4.han, '符:', result4.fu, '点数:', result4.score);
console.log();

console.log('=== テスト完了 ===');
