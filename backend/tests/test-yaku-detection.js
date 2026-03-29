/**
 * 役判定・得点計算テスト
 * - 緑一色、大車輪、三槓子、四槓子
 * - 大四喜、小四喜
 * - ドラ・裏ドラ計算
 * - ダブル立直、天和、地和、人和（統合元: test-special-yaku.js）
 */
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

// ========== 特殊役の判定 ==========

section('緑一色: 正しい緑一色手牌');
{
  const hand = [
    new Tile('sou', 2), new Tile('sou', 2),
    new Tile('sou', 3), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 4),
    new Tile('sou', 6), new Tile('sou', 6),
    new Tile('sou', 8), new Tile('sou', 8),
    new Tile('honor', 6), new Tile('honor', 6),
    new Tile('sou', 2), new Tile('sou', 3),
  ];
  assert(calc.isRyokuisshoku(hand), '緑一色が検出される');
}

section('緑一色: マンズ含む → 不成立');
{
  const hand = [
    new Tile('sou', 2), new Tile('sou', 2),
    new Tile('sou', 3), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 4),
    new Tile('sou', 6), new Tile('sou', 6),
    new Tile('man', 8), new Tile('man', 8),
    new Tile('honor', 6), new Tile('honor', 6),
    new Tile('sou', 2), new Tile('sou', 3),
  ];
  assert(!calc.isRyokuisshoku(hand), '不正な手牌はfalse');
}

section('大車輪: 筒子2-8全対子（七対子形）');
{
  const hand = [
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 3), new Tile('pin', 3),
    new Tile('pin', 4), new Tile('pin', 4),
    new Tile('pin', 5), new Tile('pin', 5),
    new Tile('pin', 6), new Tile('pin', 6),
    new Tile('pin', 7), new Tile('pin', 7),
    new Tile('pin', 8), new Tile('pin', 8),
  ];
  assert(calc.isDaisharin(hand), '大車輪が検出される');
}

section('大車輪: 枚数が不正（pin2が3枚）→ 不成立');
{
  const hand = [
    new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 3), new Tile('pin', 3),
    new Tile('pin', 4), new Tile('pin', 4),
    new Tile('pin', 5), new Tile('pin', 5),
    new Tile('pin', 6), new Tile('pin', 6),
    new Tile('pin', 7), new Tile('pin', 7),
    new Tile('pin', 8),
  ];
  assert(!calc.isDaisharin(hand), '各2枚ずつでない手牌はfalse');
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

// ========== 特殊役: 天和・地和・人和・ダブル立直 ==========
// (統合元: test-special-yaku.js)

// ヘルパー: ピンフ形の完成手牌
function makePinfuHand() {
  return [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ];
}

section('天和: 親の配牌が和了形 (役満)');
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];
  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
    isTenhou: true,
  });
  assert(result.valid, '天和: 和了が有効');
  assert(result.yaku?.some(y => y.name === '天和'), '天和役が存在する');
  assert(result.yaku?.find(y => y.name === '天和')?.han === 13, '天和: 13翻（役満）');
  assertEqual(result.score, 32000, `天和: 32000点`);
}

section('地和: 子の最初のツモで和了 (役満)');
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];
  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
    isChiihou: true,
  });
  assert(result.valid, '地和: 和了が有効');
  assert(result.yaku?.some(y => y.name === '地和'), '地和役が存在する');
  assert(result.yaku?.find(y => y.name === '地和')?.han === 13, '地和: 13翻（役満）');
  assertEqual(result.score, 32000, `地和: 32000点`);
}

section('人和: 子がロンで和了 (役満)');
{
  const hand = makePinfuHand();
  const winningTile = new Tile('pin', 3);
  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: false, isRon: true,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
    isRenhou: true,
  });
  assert(result.valid, '人和: 和了が有効');
  assert(result.yaku?.some(y => y.name === '人和'), '人和役が存在する');
  assert(result.yaku?.find(y => y.name === '人和')?.han === 13, '人和: 13翻（役満）');
  assertEqual(result.score, 32000, `人和: 32000点`);
}

section('ダブル立直: 最初の巡目でのリーチ宣言 (2翻)');
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];
  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: true, menzen: true,
    roundWind: 1, seatWind: 1,
    isDoubleRiichi: true,
    isIppatsumari: true,
  });
  assert(result.valid, 'ダブル立直: 和了が有効');
  assert(result.yaku?.some(y => y.name === 'ダブル立直'), 'ダブル立直役が存在する');
  assert(result.yaku?.find(y => y.name === 'ダブル立直')?.han === 2, 'ダブル立直: 2翻');
  assert(!result.yaku?.some(y => y.name === 'リーチ'), 'ダブル立直時に通常リーチが含まれない');
  assert(result.yaku?.some(y => y.name === '一発'), 'ダブル立直: 一発と複合できる');
}

section('通常リーチ: ダブル立直でない場合 (1翻)');
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];
  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: true, menzen: true,
    roundWind: 1, seatWind: 1,
    isDoubleRiichi: false,
  });
  assert(result.valid, '通常リーチ: 和了が有効');
  assert(result.yaku?.some(y => y.name === 'リーチ'), '通常リーチ役が存在する');
  assert(result.yaku?.find(y => y.name === 'リーチ')?.han === 1, '通常リーチ: 1翻');
  assert(!result.yaku?.some(y => y.name === 'ダブル立直'), 'ダブル立直が含まれない');
}

section('MahjongLogic: ダブル立直フラグの設定');
{
  const game = new MahjongLogic(['player1', 'player2'], {}, undefined, {
    dealerIndex: 0,
    roundWindNumber: 1,
    seatWinds: { player1: 1, player2: 2 },
  });
  game.initialize();
  game.dealTiles();
  const player1 = game.players['player1'];
  assert(game.firstGoAroundIntact === true, 'firstGoAroundIntact初期値はtrue');
  assert(player1.isDoubleRiichi === false, 'isDoubleRiichi初期値はfalse');
  assertEqual(player1.discards.length, 0, '最初は捨て牌0');
}

section('天和: ScoreCalculatorはフラグに忠実');
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];
  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: false, isRon: true,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
    isTenhou: true,
  });
  assert(result.yaku?.some(y => y.name === '天和'), 'ScoreCalculatorはフラグに忠実に天和を付ける');
}

report();
