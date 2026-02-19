const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');

const calculator = new ScoreCalculator();

console.log('=== 大四喜（だいすうじ）と小四喜（しょうすうじ）のテスト ===\n');

// テスト1: 大四喜 - 東西南北が全て刻子
console.log('テスト1: 大四喜（東西南北が全て刻子）');
const daishushiHand = [
  new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 東刻子
  new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2), // 南刻子
  new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3), // 西刻子
  new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4), // 北刻子
  new Tile('man', 5), new Tile('man', 5) // 雀頭
];

const winInfo1 = {
  hand: daishushiHand,
  melds: [],
  winningTile: new Tile('man', 5),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [],
  doraTiles: [],
  urahaTiles: []
};

const result1 = calculator.calculateScore(winInfo1);
console.log(`手牌: 東東東 南南南 西西西 北北北 五萬`);
console.log(`有効判定: ${result1.valid}`);
console.log(`役: ${result1.yaku.map(y => y.name).join(', ')}`);
console.log(`飜数: ${result1.han}飜`);
console.log(`点数: ${result1.score}点`);
console.log(`スコアタイプ: ${result1.scoreType}\n`);

// テスト2: 小四喜 - 3つが刻子、1つが対子（副露あり）
console.log('テスト2: 小四喜（東西南が刻子、北が対子）');
const shousushiMelds = [
  [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)], // 東刻子
  [new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2)], // 南刻子
];

const shousushiHand = [
  new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3), // 西刻子
  new Tile('honor', 4), new Tile('honor', 4), // 北対子（雀頭）
  new Tile('man', 5), new Tile('man', 5), new Tile('man', 5) // その他の刻子
];

const winInfo2 = {
  hand: shousushiHand,
  melds: shousushiMelds,
  winningTile: new Tile('man', 5),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: false,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [],
  doraTiles: [],
  urahaTiles: []
};

const result2 = calculator.calculateScore(winInfo2);
console.log(`手牌: 東東東 南南南 西西西 北北 五萬`);
console.log(`有効判定: ${result2.valid}`);
console.log(`役: ${result2.yaku.map(y => y.name).join(', ')}`);
console.log(`飜数: ${result2.han}飜`);
console.log(`点数: ${result2.score}点`);
console.log(`スコアタイプ: ${result2.scoreType}\n`);

// テスト3: 大四喜 + 副露（開かされた形）
console.log('テスト3: 大四喜（副露あり）');
const daishushiMelds = [
  [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)], // 東刻子
  [new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2)], // 南刻子
];

const daishushiHandWithMelds = [
  new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3), // 西刻子
  new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4), // 北刻子
  new Tile('man', 5), new Tile('man', 5) // 雀頭
];

const winInfo3 = {
  hand: daishushiHandWithMelds,
  melds: daishushiMelds,
  winningTile: new Tile('man', 5),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: false,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [],
  doraTiles: [],
  urahaTiles: []
};

const result3 = calculator.calculateScore(winInfo3);
console.log(`手牌: 西西西 北北北 五萬 [副露: 東東東 南南南]`);
console.log(`有効判定: ${result3.valid}`);
console.log(`役: ${result3.yaku.map(y => y.name).join(', ')}`);
console.log(`飜数: ${result3.han}飜`);
console.log(`点数: ${result3.score}点`);
console.log(`スコアタイプ: ${result3.scoreType}\n`);

// テスト4: 小四喜が判定されない例（全部刻子の場合は大四喜になる）
console.log('テスト4: 大四喜か小四喜か（全部刻子 → 大四喜）');
const shouldBeDaishushi = [
  new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
  new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2),
  new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
  new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
  new Tile('man', 5), new Tile('man', 5)
];

const winInfo4 = {
  hand: shouldBeDaishushi,
  melds: [],
  winningTile: new Tile('man', 5),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [],
  doraTiles: [],
  urahaTiles: []
};

const result4 = calculator.calculateScore(winInfo4);
console.log(`手牌: 東東東 南南南 西西西 北北北 五萬`);
console.log(`有効判定: ${result4.valid}`);
console.log(`役: ${result4.yaku.map(y => y.name).join(', ')}`);
console.log(`飜数: ${result4.han}飜`);
console.log(`期待される役: 大四喜のみ`);
console.log(`合致: ${result4.yaku.some(y => y.name === '大四喜') ? '✓' : '✗'}\n`);

console.log('=== テスト完了 ===');
