/**
 * ダブル役満テスト
 * - 複数役満の重複（字一色+大四喜など）
 * - 四暗刻単騎（ダブル役満）
 * - 国士無双十三面待ち（ダブル役満）
 * - 純正九蓮宝燈（ダブル役満）
 * - 大四喜（ダブル役満）
 * - 三槓子が役満結果に混入しない確認
 */
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

// ========== 単体ダブル役満 ==========

section('四暗刻単騎: ツモ和了（単騎待ち）→ ダブル役満');
{
  // 手牌: 111m 222p 333s 444s + 55z（雀頭）
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 3), new Tile('sou', 3), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 4), new Tile('sou', 4),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  const winningTile = new Tile('honor', 5); // 単騎待ち: 白をツモ

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const suuankouTanki = result.yaku.find(y => y.name === '四暗刻単騎');
  assert(suuankouTanki, '四暗刻単騎が検出される');
  assertEqual(suuankouTanki && suuankouTanki.yakumanValue, 2, '四暗刻単騎はダブル役満');
  assertEqual(result.score, 64000, 'ダブル役満 = 64,000点');
  assertEqual(result.scoreType, 'ダブル役満', 'scoreTypeがダブル役満');
}

section('四暗刻単騎: ロン和了（単騎待ち）→ ダブル役満');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 3), new Tile('sou', 3), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 4), new Tile('sou', 4),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  const winningTile = new Tile('honor', 5);

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: false, isRon: true,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const suuankouTanki = result.yaku.find(y => y.name === '四暗刻単騎');
  assert(suuankouTanki, '四暗刻単騎がロンでも検出される');
  assertEqual(result.score, 64000, 'ロンでもダブル役満 = 64,000点');
}

section('四暗刻: ツモ和了（双碰待ち）→ シングル役満');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 3), new Tile('sou', 3), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 4), new Tile('sou', 4),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  const winningTile = new Tile('sou', 4); // 刻子の完成 = 双碰待ち

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  // 双碰待ちのツモでも四暗刻は成立するが、単騎ではないのでシングル
  const suuankou = result.yaku.find(y => y.name === '四暗刻');
  const suuankouTanki = result.yaku.find(y => y.name === '四暗刻単騎');
  assert(suuankou || suuankouTanki, '四暗刻が検出される');
  assertEqual(result.score, 32000, 'シングル役満 = 32,000点');
}

section('国士無双十三面待ち → ダブル役満');
{
  // 13種を全て1枚ずつ持ち、和了牌が14枚目
  const hand = [
    new Tile('man', 1), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 9),
    new Tile('sou', 1), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 6),
    new Tile('honor', 7), new Tile('honor', 7), // 中が2枚
  ];
  const winningTile = new Tile('honor', 7); // 中をツモ→13面待ち

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const kokushi13 = result.yaku.find(y => y.name === '国士無双十三面');
  assert(kokushi13, '国士無双十三面が検出される');
  assertEqual(kokushi13 && kokushi13.yakumanValue, 2, '国士無双十三面はダブル役満');
  assertEqual(result.score, 64000, 'ダブル役満 = 64,000点');
}

section('国士無双: 通常（非十三面）→ シングル役満');
{
  // 中が2枚あって、和了牌が中以外 → 非十三面
  const hand = [
    new Tile('man', 1), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 9),
    new Tile('sou', 1), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 6),
    new Tile('honor', 7), new Tile('honor', 7),
  ];
  const winningTile = new Tile('man', 1); // 1mをツモ → 非十三面

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const kokushi = result.yaku.find(y => y.name === '国士無双');
  assert(kokushi, '通常の国士無双が検出される');
  assertEqual(result.score, 32000, 'シングル役満 = 32,000点');
}

section('純正九蓮宝燈 → ダブル役満');
{
  // 基本形 1112345678999 + 5m（9面待ち→任意の数牌で上がれる）
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
    new Tile('man', 8), new Tile('man', 9), new Tile('man', 9),
    new Tile('man', 9), new Tile('man', 5),
  ];
  const winningTile = new Tile('man', 5); // 5mをツモ → 基本形+余り=純正

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const junsei = result.yaku.find(y => y.name === '純正九蓮宝燈');
  assert(junsei, '純正九蓮宝燈が検出される');
  assertEqual(junsei && junsei.yakumanValue, 2, '純正九蓮宝燈はダブル役満');
  assertEqual(result.score, 64000, 'ダブル役満 = 64,000点');
}

section('九蓮宝燈: 非純正（非9面待ち）→ シングル役満');
{
  // 1112234567899 + 3m (2mが2枚、和了牌は3m → 基本形ではない)
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
    new Tile('man', 9), new Tile('man', 9),
  ];
  const winningTile = new Tile('man', 3); // 3mをツモ → 非純正

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const chuuren = result.yaku.find(y => y.name === '九蓮宝燈');
  assert(chuuren, '通常の九蓮宝燈が検出される');
  assertEqual(result.score, 32000, 'シングル役満 = 32,000点');
}

section('大四喜 → ダブル役満');
{
  // 東東東 南南南 西西西 北北北 + 1m1m
  const hand = [
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
    new Tile('man', 1), new Tile('man', 1),
  ];
  const winningTile = new Tile('man', 1);

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
  });

  assert(result.valid, '和了成立');
  const daishushi = result.yaku.find(y => y.name === '大四喜');
  assert(daishushi, '大四喜が検出される');
  assertEqual(daishushi && daishushi.yakumanValue, 2, '大四喜はダブル役満');
  // 大四喜(2) + 字一色(1) = トリプル or 大四喜(2)だけでも64000
  assert(result.score >= 64000, '少なくともダブル役満以上');
}

// ========== 複数役満の重複 ==========

section('字一色 + 大四喜 + 四暗刻単騎 = 5倍役満');
{
  // 全て字牌、風牌4面子 + 字牌雀頭、全くが暗刻+単騎
  const hand = [
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  const winningTile = new Tile('honor', 5);

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
  });

  assert(result.valid, '和了成立');
  const tsuuiisou = result.yaku.find(y => y.name === '字一色');
  const daishushi = result.yaku.find(y => y.name === '大四喜');
  const suuankouTanki = result.yaku.find(y => y.name === '四暗刻単騎');
  assert(tsuuiisou, '字一色が検出される');
  assert(daishushi, '大四喜が検出される');
  assert(suuankouTanki, '四暗刻単騎も検出される');
  // 四暗刻単騎(2) + 大四喜(2) + 字一色(1) = 5倍
  assertEqual(result.score, 160000, '字一色+大四喜+四暗刻単騎 = 5倍役満 160,000点');
}

section('字一色 + 小四喜 + 四暗刻単騎 = 4倍役満');
{
  // 全て字牌、風牌3面子+風牌雀頭+三元牌面子、全くが暗刻+単騎
  const hand = [
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
    new Tile('honor', 4), new Tile('honor', 4),
  ];
  const winningTile = new Tile('honor', 4);

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
  });

  assert(result.valid, '和了成立');
  const tsuuiisou = result.yaku.find(y => y.name === '字一色');
  const shousushi = result.yaku.find(y => y.name === '小四喜');
  const suuankouTanki = result.yaku.find(y => y.name === '四暗刻単騎');
  assert(tsuuiisou, '字一色が検出される');
  assert(shousushi, '小四喜が検出される');
  assert(suuankouTanki, '四暗刻単騎も検出される');
  // 四暗刻単騎(2) + 小四喜(1) + 字一色(1) = 4倍
  assertEqual(result.score, 128000, '字一色+小四喜+四暗刻単騎 = 4倍役満 128,000点');
}

section('字一色 + 小四喜（副露あり）= ダブル役満');
{
  // 副露ありなので四暗刻は成立しない
  const hand = [
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
    new Tile('honor', 4), new Tile('honor', 4),
  ];
  const melds = [
    [new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)],
    [new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2)],
  ];
  const winningTile = new Tile('honor', 4);

  const result = calc.calculateScore({
    hand, melds, winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: false,
    roundWind: 1, seatWind: 2,
  });

  assert(result.valid, '和了成立');
  const tsuuiisou = result.yaku.find(y => y.name === '字一色');
  const shousushi = result.yaku.find(y => y.name === '小四喜');
  assert(tsuuiisou, '字一色が検出される');
  assert(shousushi, '小四喜が検出される');
  assertEqual(result.score, 64000, '字一色+小四喜 = ダブル役満 64,000点');
}

section('四暗刻単騎 + 字一色 = トリプル役満');
{
  // 字牌のみ4暗刻 + 単騎
  const hand = [
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('honor', 2), new Tile('honor', 2), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  const winningTile = new Tile('honor', 5); // 白単騎

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
  });

  assert(result.valid, '和了成立');
  // 四暗刻単騎(2) + 字一色(1) + 大四喜(2) = 5倍
  // or 四暗刻単騎(2) + 字一色(1) = 3倍 depending on combination
  assert(result.score >= 96000, '複数役満の重複で大得点');
}

// ========== 三槓子の役満結果混入修正確認 ==========

section('三槓子が役満結果に混入しない');
{
  // 四槓子の手牌を再現（3カン+1カン+雀頭）
  // 四槓子は melds で判定するため、副露ありの手牌で確認
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
  ];
  const melds = [
    [new Tile('pin', 1), new Tile('pin', 1), new Tile('pin', 1), new Tile('pin', 1)],
    [new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2)],
    [new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3), new Tile('pin', 3)],
    [new Tile('pin', 4), new Tile('pin', 4), new Tile('pin', 4), new Tile('pin', 4)],
  ];
  const winningTile = new Tile('man', 1);

  const yaku = calc.detectYaku(
    hand, melds, winningTile,
    true, false, false, false, null,
    1, 1
  );

  const hasSankantsu = yaku.some(y => y.name === '三槓子');
  const hasSuukantsu = yaku.some(y => y.name === '四槓子');
  assert(!hasSankantsu, '三槓子が役満結果に含まれない');
  assert(hasSuukantsu, '四槓子が検出される');
}

// ========== 通常役満（シングル）の確認 ==========

section('シングル役満が正常に動作する');
{
  // 大三元
  const hand = [
    new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
    new Tile('honor', 6), new Tile('honor', 6), new Tile('honor', 6),
    new Tile('honor', 7), new Tile('honor', 7), new Tile('honor', 7),
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 5), new Tile('pin', 5),
  ];
  const winningTile = new Tile('pin', 5);

  const result = calc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  });

  assert(result.valid, '和了成立');
  const daisangen = result.yaku.find(y => y.name === '大三元');
  assert(daisangen, '大三元が検出される');
  assertEqual(result.score, 32000, 'シングル役満 = 32,000点');
  assertEqual(result.scoreType, '役満', 'scoreTypeが役満');
}

// ========== getYakumanCount ヘルパーテスト ==========

section('getYakumanCount: 正しくカウントされる');
{
  const yaku1 = [
    { name: '字一色', han: 13, isYakuman: true, yakumanValue: 1 },
    { name: '大四喜', han: 26, isYakuman: true, yakumanValue: 2 },
  ];
  assertEqual(calc.getYakumanCount(yaku1), 3, '字一色(1)+大四喜(2) = 3');

  const yaku2 = [
    { name: '四暗刻単騎', han: 26, isYakuman: true, yakumanValue: 2 },
  ];
  assertEqual(calc.getYakumanCount(yaku2), 2, '四暗刻単騎 = 2');

  const yaku3 = [
    { name: 'リーチ', han: 1 },
    { name: 'ツモ', han: 1 },
  ];
  assertEqual(calc.getYakumanCount(yaku3), 0, '通常役 = 0');
}

// ========== 特殊形判定メソッドのテスト ==========

section('isKokushiJuusanmen: 正しい判定');
{
  const hand13 = [
    new Tile('man', 1), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 9),
    new Tile('sou', 1), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 6),
    new Tile('honor', 7), new Tile('honor', 7),
  ];
  assert(calc.isKokushiJuusanmen(hand13, new Tile('honor', 7)), '中待ちで十三面');
  assert(!calc.isKokushiJuusanmen(hand13, new Tile('man', 1)), '1m待ちは非十三面（中が2枚ある）');
}

section('isJunseiChuurenPoutou: 正しい判定');
{
  const tiles = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
    new Tile('man', 8), new Tile('man', 9), new Tile('man', 9),
    new Tile('man', 9), new Tile('man', 5),
  ];
  assert(calc.isJunseiChuurenPoutou(tiles, new Tile('man', 5)), '5m待ちで純正');
  assert(!calc.isJunseiChuurenPoutou(tiles, new Tile('man', 1)), '1m待ちは非純正（1mが4枚残る）');
}

section('isSuuankouTanki: 正しい判定');
{
  const combination = {
    pair: new Tile('honor', 5),
    melds: [
      [new Tile('man', 1), new Tile('man', 1), new Tile('man', 1)],
      [new Tile('pin', 2), new Tile('pin', 2), new Tile('pin', 2)],
      [new Tile('sou', 3), new Tile('sou', 3), new Tile('sou', 3)],
      [new Tile('sou', 4), new Tile('sou', 4), new Tile('sou', 4)],
    ],
  };
  assert(calc.isSuuankouTanki(combination, new Tile('honor', 5)), '白単騎は四暗刻単騎');
  assert(!calc.isSuuankouTanki(combination, new Tile('sou', 4)), '4s待ちは四暗刻単騎でない');
}

report();
