/**
 * 役判定・得点計算テスト
 * - 緑一色、大車輪、三槓子、四槓子
 * - 大四喜、小四喜
 * - ドラ・裏ドラ計算
 */
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

// ========== 特殊役の判定 ==========

section('緑一色: 正しい緑一色手牌');
{
  const hand = [
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 3), new Tile('pin', 3),
    new Tile('pin', 4), new Tile('pin', 4),
    new Tile('pin', 6), new Tile('pin', 6),
    new Tile('pin', 8), new Tile('pin', 8),
    new Tile('honor', 6), new Tile('honor', 6),
    new Tile('pin', 2), new Tile('pin', 3),
  ];
  assert(calc.isRyokuisshoku(hand), '緑一色が検出される');
}

section('緑一色: マンズ含む → 不成立');
{
  const hand = [
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 3), new Tile('pin', 3),
    new Tile('pin', 4), new Tile('pin', 4),
    new Tile('pin', 6), new Tile('pin', 6),
    new Tile('man', 8), new Tile('man', 8),
    new Tile('honor', 6), new Tile('honor', 6),
    new Tile('pin', 2), new Tile('pin', 3),
  ];
  assert(!calc.isRyokuisshoku(hand), '不正な手牌はfalse');
}

section('大車輪: 筒子2-8全対子');
{
  const hand = [
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 3), new Tile('pin', 3),
    new Tile('pin', 4), new Tile('pin', 4),
    new Tile('pin', 5), new Tile('pin', 5),
    new Tile('pin', 6), new Tile('pin', 6),
    new Tile('pin', 7), new Tile('pin', 7),
    new Tile('pin', 8), new Tile('pin', 2),
  ];
  assert(calc.isDaisharin(hand), '大車輪が検出される');
}

section('大車輪: pin 1含む → 不成立');
{
  const hand = [
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 3), new Tile('pin', 3),
    new Tile('pin', 4), new Tile('pin', 4),
    new Tile('pin', 5), new Tile('pin', 5),
    new Tile('pin', 6), new Tile('pin', 6),
    new Tile('pin', 7), new Tile('pin', 7),
    new Tile('pin', 8),
  ];
  assert(!calc.isDaisharin(hand), '1含む手牌はfalse');
}

section('三槓子: 3つの槓 + 対子');
{
  const melds = [
    [new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), new Tile('man', 5)],
    [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)],
    [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)],
    [new Tile('honor', 1), new Tile('honor', 1)],
  ];
  assert(calc.isSankankouWithMelds(melds), '三槓子が検出される');
}

section('四槓子: 4つの槓');
{
  const melds = [
    [new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), new Tile('man', 5)],
    [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)],
    [new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7)],
    [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)],
  ];
  assert(calc.isSukankou(melds), '四槓子が検出される');
}

// ========== 大四喜・小四喜 ==========

section('大四喜: 東南西北が全て刻子（副露あり）');
{
  // 副露ありにして四暗刻との複合を避ける
  const melds = [
    [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)],
    [new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2)],
  ];
  const hand = [
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
    new Tile('man', 5), new Tile('man', 5),
  ];
  const result = calc.calculateScore({
    hand, melds, winningTile: new Tile('man', 5),
    isTsumo: true, isRon: false, riichi: false, menzen: false,
    roundWind: 1, seatWind: 1, doraIndicators: [], doraTiles: [], urahaTiles: [],
  });
  assert(result.valid, '有効な和了');
  assert(result.yaku.some(y => y.name === '大四喜'), '大四喜が含まれる');
}

section('小四喜: 3風刻子 + 1風対子');
{
  const melds = [
    [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)],
    [new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2)],
  ];
  const hand = [
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 4),
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
  ];
  const result = calc.calculateScore({
    hand, melds, winningTile: new Tile('man', 5),
    isTsumo: true, isRon: false, riichi: false, menzen: false,
    roundWind: 1, seatWind: 1, doraIndicators: [], doraTiles: [], urahaTiles: [],
  });
  assert(result.valid, '有効な和了');
  assert(result.yaku.some(y => y.name === '小四喜'), '小四喜が含まれる');
}

section('大四喜: 副露ありでも成立');
{
  const melds = [
    [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)],
    [new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2)],
  ];
  const hand = [
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
    new Tile('man', 5), new Tile('man', 5),
  ];
  const result = calc.calculateScore({
    hand, melds, winningTile: new Tile('man', 5),
    isTsumo: true, isRon: false, riichi: false, menzen: false,
    roundWind: 1, seatWind: 1, doraIndicators: [], doraTiles: [], urahaTiles: [],
  });
  assert(result.valid, '有効な和了');
  assert(result.yaku.some(y => y.name === '大四喜'), '副露でも大四喜');
}

// ========== ドラの計算 ==========

section('ドラ: getNextTile（表示牌→ドラ）');
{
  const doraInd = new Tile('honor', 4); // 北 → 白
  const next = calc.getNextTile(doraInd);
  assert(next.suit === 'honor' && next.number === 5, '北の次は白');
}

section('ドラ: countDora');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  const doraIndicator = new Tile('honor', 4);
  const doraInfo = calc.countDora(hand, [doraIndicator], []);
  assertEqual(doraInfo.dora, 2, '白が2枚でドラ2');
}

section('ドラ: ドラを含む和了の翻数');
{
  const hand = [
    new Tile('honor', 5), new Tile('honor', 5),
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
  ];
  const doraIndicator = new Tile('honor', 4);
  const result = calc.calculateScore({
    hand, melds: [], winningTile: new Tile('pin', 3),
    isTsumo: false, isRon: true, riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
    doraIndicators: [doraIndicator], doraTiles: [new Tile('honor', 5)], urahaTiles: [],
  });
  assert(result.valid, '有効な和了');
  assert(result.han >= 2, 'ドラ分の翻が加算されている');
}

section('ドラ: ドラのみでは和了不可');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 3), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 4), new Tile('pin', 6),
    new Tile('sou', 1), new Tile('sou', 3), new Tile('sou', 5),
    new Tile('sou', 7), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 3), new Tile('honor', 5),
  ];
  const doraIndicator = new Tile('honor', 4);
  const result = calc.calculateScore({
    hand, melds: [], winningTile: new Tile('honor', 5),
    isTsumo: false, isRon: true, riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
    doraIndicators: [doraIndicator], doraTiles: [new Tile('honor', 5)], urahaTiles: [],
  });
  assert(!result.valid, 'ドラのみでは和了不可');
}

section('ドラ: 裏ドラ（リーチ時）');
{
  const hand = [
    new Tile('honor', 5), new Tile('honor', 5),
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
  ];
  const doraIndicator = new Tile('honor', 4);
  const result = calc.calculateScore({
    hand, melds: [], winningTile: new Tile('sou', 3),
    isTsumo: true, isRon: false, riichi: true, menzen: true,
    roundWind: 1, seatWind: 1,
    doraIndicators: [doraIndicator], doraTiles: [new Tile('honor', 5)],
    urahaTiles: [new Tile('honor', 5), new Tile('honor', 5)],
  });
  assert(result.valid, '有効な和了');
  assert(result.yaku.some(y => y.name === 'リーチ' || y.name === '立直'), 'リーチ含む');
}

report();
