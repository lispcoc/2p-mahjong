/**
 * 符計算修正テスト
 * - 風牌の雀頭符
 * - 待ち形の符
 * - 平和ツモの風牌チェック
 */

const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

// ヘルパー: 牌生成
function t(suit, num) { return new Tile(suit, num); }

// ヘルパー: calculateFuWithCombination を直接呼び出す
function fuWith(combination, melds, concealedMeldIndices, winningTile, isTsumo, roundWind, seatWind) {
  // hand引数は符計算では使われないのでダミー
  const hand = [];
  return calc.calculateFuWithCombination(hand, melds, concealedMeldIndices, winningTile, isTsumo, combination, roundWind, seatWind);
}

// =============================================================
section('1. 風牌の雀頭符');
// =============================================================

{
  // 東の雀頭（場風=東, 自風=南）→ +2符
  const combination = {
    pair: t('honor', 1), // 東
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('man', 4), t('man', 5), t('man', 6)],
    ]
  };
  const winTile = t('man', 6);
  // 門前ロン: 20(副底) + 10(門前ロン) + 2(場風雀頭) + 0(両面待ち) = 32 → 切り上げ40符
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '場風(東)雀頭: 40符');
}

{
  // 南の雀頭（場風=東, 自風=南）→ +2符
  const combination = {
    pair: t('honor', 2), // 南
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('man', 4), t('man', 5), t('man', 6)],
    ]
  };
  const winTile = t('man', 6);
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '自風(南)雀頭: 40符');
}

{
  // 連風牌: 東場の東家で東の雀頭 → +4符
  const combination = {
    pair: t('honor', 1), // 東
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('man', 4), t('man', 5), t('man', 6)],
    ]
  };
  const winTile = t('man', 6);
  // 門前ロン: 20 + 10 + 4(連風) + 0(両面) = 34 → 切り上げ40符
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 1);
  const rounded = calc.roundFu(fu);
  assertEqual(fu, 34, '連風牌(東場東家): 切り上げ前34符');
  assertEqual(rounded, 40, '連風牌(東場東家): 切り上げ後40符');
}

{
  // 字牌だが風牌でも役牌でもない（西、場風=東、自風=南）→ +0符
  const combination = {
    pair: t('honor', 3), // 西
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('man', 4), t('man', 5), t('man', 6)],
    ]
  };
  const winTile = t('man', 6);
  // 門前ロン: 20 + 10 + 0 + 0 = 30符
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  assertEqual(fu, 30, 'オタ風(西)雀頭: 30符');
}

{
  // 三元牌(白)の雀頭 → +2符（従来通り動くことを確認）
  const combination = {
    pair: t('honor', 5), // 白
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('man', 4), t('man', 5), t('man', 6)],
    ]
  };
  const winTile = t('man', 6);
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '三元牌(白)雀頭: 40符');
}

// =============================================================
section('2. 待ち形の符');
// =============================================================

{
  // 嵌張（カンチャン）待ち: 4-6で5を引いた → +2符
  const combination = {
    pair: t('man', 1),
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)], // 5がカンチャン
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('man', 5); // カンチャン
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  // 20 + 10 + 0(雀頭) + 2(カンチャン) = 32 → 40
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '嵌張待ち: 40符');
}

{
  // 辺張（ペンチャン）待ち: 1-2で3を引いた → +2符
  const combination = {
    pair: t('sou', 5),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)], // 3がペンチャン
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('man', 3); // ペンチャン
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  // 20 + 10 + 0 + 2(ペンチャン) = 32 → 40
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '辺張待ち(1-2-3): 40符');
}

{
  // 辺張（ペンチャン）待ち: 8-9で7を引いた → +2符
  const combination = {
    pair: t('sou', 5),
    melds: [
      [t('man', 7), t('man', 8), t('man', 9)], // 7がペンチャン
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 1), t('sou', 2), t('sou', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('man', 7); // ペンチャン
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '辺張待ち(7-8-9): 40符');
}

{
  // 単騎（タンキ）待ち: 雀頭で和了 → +2符
  const combination = {
    pair: t('man', 5),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 4), t('pin', 5), t('pin', 6)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('man', 5); // タンキ
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  // 20 + 10 + 0 + 2(タンキ) = 32 → 40
  const rounded = calc.roundFu(fu);
  assertEqual(rounded, 40, '単騎待ち: 40符');
}

{
  // 両面（リャンメン）待ち: 4-5で6を引いた → 0符
  const combination = {
    pair: t('man', 1),
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)],
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('man', 6); // 両面
  const fu = fuWith(combination, [], new Set(), winTile, false, 1, 2);
  // 20 + 10 + 0 + 0(両面) = 30
  assertEqual(fu, 30, '両面待ち: 30符');
}

{
  // 双碰（シャンポン）待ち: 刻子で和了 → 0符
  const combination = {
    pair: t('man', 1),
    melds: [
      [t('man', 5), t('man', 5), t('man', 5)], // シャンポン
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('man', 5); // シャンポン
  const waitFu = calc.getWaitFu(combination, winTile);
  // シャンポンと単騎の判定: 刻子に含まれるので shanpon(0), pairには不一致
  assertEqual(waitFu, 0, '双碰待ち: 待ち符0');
}

// =============================================================
section('3. 平和ツモの風牌チェック');
// =============================================================

{
  // 平和ツモ（風牌でない雀頭）→ 20符
  const combination = {
    pair: t('man', 1), // 数牌雀頭 → OK
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)],
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 4), t('sou', 5), t('sou', 6)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('pin', 9); // 両面
  const fu = fuWith(combination, [], new Set(), winTile, true, 1, 2);
  assertEqual(fu, 20, '平和ツモ(数牌雀頭): 20符');
}

{
  // 平和ツモだが場風(東)が雀頭 → 平和不成立 → 20符にならない
  const combination = {
    pair: t('honor', 1), // 東 = 場風
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)],
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 4), t('sou', 5), t('sou', 6)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('pin', 9); // 両面
  const fu = fuWith(combination, [], new Set(), winTile, true, 1, 2);
  // 平和不成立: 20 + 2(ツモ) + 2(場風雀頭) + 0(両面) = 24 → 最低30
  assert(fu >= 30, '場風(東)雀頭で平和ツモ不成立: 30符以上');
  assertEqual(fu, 30, '場風(東)雀頭: 最低30符(24→30)');
}

{
  // 平和ツモだが自風(南)が雀頭 → 平和不成立
  const combination = {
    pair: t('honor', 2), // 南 = 自風
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)],
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 4), t('sou', 5), t('sou', 6)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('pin', 9);
  const fu = fuWith(combination, [], new Set(), winTile, true, 1, 2);
  assert(fu >= 30, '自風(南)雀頭で平和ツモ不成立: 30符以上');
}

{
  // 平和ツモでオタ風(西)の雀頭 → 平和成立可 → 20符
  const combination = {
    pair: t('honor', 3), // 西（場風でも自風でもない）
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)],
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 4), t('sou', 5), t('sou', 6)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('pin', 9);
  const fu = fuWith(combination, [], new Set(), winTile, true, 1, 2);
  assertEqual(fu, 20, 'オタ風(西)雀頭で平和ツモ成立: 20符');
}

{
  // 平和ツモで三元牌(白)雀頭 → 平和不成立
  const combination = {
    pair: t('honor', 5), // 白
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)],
      [t('pin', 1), t('pin', 2), t('pin', 3)],
      [t('sou', 4), t('sou', 5), t('sou', 6)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const winTile = t('pin', 9);
  const fu = fuWith(combination, [], new Set(), winTile, true, 1, 2);
  assert(fu >= 30, '三元牌(白)雀頭で平和ツモ不成立: 30符以上');
}

// =============================================================
section('4. calculateScore 統合テスト');
// =============================================================

{
  // 場風雀頭付きの手で点数計算（東場・南家）
  // 手牌: 東東 + 123m + 456p + 789s + 456m, 和了=6m（両面）
  const hand = [
    t('honor', 1), t('honor', 1),
    t('man', 1), t('man', 2), t('man', 3),
    t('pin', 4), t('pin', 5), t('pin', 6),
    t('sou', 7), t('sou', 8), t('sou', 9),
    t('man', 4), t('man', 5), t('man', 6),
  ];
  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    concealedMeldIndices: new Set(),
    winningTile: t('man', 6),
    isTsumo: false,
    isRon: true,
    riichi: true,
    menzen: true,
    roundWind: 1, // 東場
    seatWind: 2,  // 南家
    doraIndicators: [],
    doraTiles: [],
    urahaIndicators: [],
    urahaTiles: [],
  });
  if (result.valid) {
    // リーチ(1翻) + 場風でない平和確認
    // 東は場風なので平和不成立 → 符にはリーチのみ(1翻)
    console.log(`  統合テスト結果: ${result.han}翻 ${result.fu}符 ${result.score}点`);
    assert(result.fu >= 30, '場風雀頭で統合テスト: 30符以上');
  } else {
    console.log(`  統合テスト: 役なし（${result.error}）`);
  }
}

{
  // カンチャン待ちの統合テスト
  // 手牌: 11m + 465p(カンチャン5) + 123m + 789s + 789p, リーチ
  const hand = [
    t('man', 1), t('man', 1),
    t('pin', 4), t('pin', 5), t('pin', 6),
    t('man', 1), t('man', 2), t('man', 3),
    t('sou', 7), t('sou', 8), t('sou', 9),
    t('pin', 7), t('pin', 8), t('pin', 9),
  ];
  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    concealedMeldIndices: new Set(),
    winningTile: t('pin', 5), // カンチャン
    isTsumo: false,
    isRon: true,
    riichi: true,
    menzen: true,
    roundWind: 1,
    seatWind: 2,
    doraIndicators: [],
    doraTiles: [],
    urahaIndicators: [],
    urahaTiles: [],
  });
  if (result.valid) {
    console.log(`  カンチャン統合テスト: ${result.han}翻 ${result.fu}符 ${result.score}点`);
    // リーチ(1翻) + 平和は不成立(カンチャン) = 1翻 40符
    assertEqual(result.fu, 40, 'カンチャン待ちで40符');
  }
}

// =============================================================
section('5. getWaitFu 単体テスト');
// =============================================================

{
  // カンチャン
  const comb = {
    pair: t('man', 1),
    melds: [[t('sou', 3), t('sou', 4), t('sou', 5)]]
  };
  assertEqual(calc.getWaitFu(comb, t('sou', 4)), 2, 'getWaitFu: カンチャン=2');
}

{
  // ペンチャン (1-2-3, win=3)
  const comb = {
    pair: t('man', 1),
    melds: [[t('pin', 1), t('pin', 2), t('pin', 3)]]
  };
  assertEqual(calc.getWaitFu(comb, t('pin', 3)), 2, 'getWaitFu: ペンチャン(3)=2');
}

{
  // ペンチャン (7-8-9, win=7)
  const comb = {
    pair: t('man', 1),
    melds: [[t('sou', 7), t('sou', 8), t('sou', 9)]]
  };
  assertEqual(calc.getWaitFu(comb, t('sou', 7)), 2, 'getWaitFu: ペンチャン(7)=2');
}

{
  // リャンメン
  const comb = {
    pair: t('man', 1),
    melds: [[t('pin', 4), t('pin', 5), t('pin', 6)]]
  };
  assertEqual(calc.getWaitFu(comb, t('pin', 6)), 0, 'getWaitFu: リャンメン=0');
}

{
  // タンキ
  const comb = {
    pair: t('sou', 3),
    melds: [[t('man', 1), t('man', 2), t('man', 3)]]
  };
  assertEqual(calc.getWaitFu(comb, t('sou', 3)), 2, 'getWaitFu: タンキ=2');
}

{
  // シャンポン
  const comb = {
    pair: t('man', 1),
    melds: [[t('sou', 5), t('sou', 5), t('sou', 5)]]
  };
  assertEqual(calc.getWaitFu(comb, t('sou', 5)), 0, 'getWaitFu: シャンポン=0');
}

report();
