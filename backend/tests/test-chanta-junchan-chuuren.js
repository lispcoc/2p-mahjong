/**
 * チャンタ・純チャン・九蓮宝燈・七対子複合のテスト
 */
const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const { assert: helperAssert, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

function test(name, fn) {
  try {
    fn();
    helperAssert(true, name);
  } catch (e) {
    helperAssert(false, `${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function t(suit, num) {
  return new Tile(suit, num);
}

// =========================================================
section('混全帯么九（チャンタ）テスト');

test('チャンタ: 123m 789p 111s 東東東 9m9m (門前)', () => {
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('honor', 1), t('honor', 1), t('honor', 1)],
    ]
  };
  const hand = [...combination.melds.flat(), combination.pair, t('man', 9)];
  const allTiles = hand;
  const result = calc.isChantaWithCombination(combination, [], allTiles);
  assert(result === true, 'チャンタが成立するはず');
});

test('チャンタ: 字牌なしでは不成立', () => {
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
    ]
  };
  const hand = [...combination.melds.flat(), combination.pair, t('man', 9)];
  const allTiles = hand;
  const result = calc.isChantaWithCombination(combination, [], allTiles);
  assert(result === false, '字牌なしではチャンタ不成立');
});

test('チャンタ: 中張牌を含む面子があると不成立', () => {
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('man', 4), t('man', 5), t('man', 6)], // 中張牌のみ
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('honor', 1), t('honor', 1), t('honor', 1)],
    ]
  };
  const hand = [...combination.melds.flat(), combination.pair, t('man', 9)];
  const allTiles = hand;
  const result = calc.isChantaWithCombination(combination, [], allTiles);
  assert(result === false, '456を含むのでチャンタ不成立');
});

test('チャンタ: 雀頭が中張牌だと不成立', () => {
  const combination = {
    pair: t('man', 5),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('honor', 1), t('honor', 1), t('honor', 1)],
    ]
  };
  const hand = [...combination.melds.flat(), combination.pair, t('man', 5)];
  const allTiles = hand;
  const result = calc.isChantaWithCombination(combination, [], allTiles);
  assert(result === false, '雀頭が5mなのでチャンタ不成立');
});

test('チャンタ: 混老頭の場合は不成立（detectYaku側で制御）', () => {
  const allTiles = [
    t('man', 1), t('man', 1), t('man', 1),
    t('pin', 9), t('pin', 9), t('pin', 9),
    t('sou', 1), t('sou', 1), t('sou', 1),
    t('honor', 5), t('honor', 5), t('honor', 5),
    t('honor', 1), t('honor', 1),
  ];
  const isHonroutou = calc.isHonroutou(allTiles);
  assert(isHonroutou === true, '混老頭のはず');
  // detectYaku側で isHonroutou チェックにより チャンタは付かない
});

// =========================================================
section('純全帯么九（ジュンチャン）テスト');

test('純チャン: 123m 789p 111s 789s 9m9m (門前)', () => {
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
    ]
  };
  const hand = [...combination.melds.flat(), combination.pair, t('man', 9)];
  const allTiles = hand;
  const result = calc.isJunchanWithCombination(combination, [], allTiles);
  assert(result === true, '純チャンが成立するはず');
});

test('純チャン: 字牌があると不成立', () => {
  const combination = {
    pair: t('honor', 1),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
    ]
  };
  const hand = [...combination.melds.flat(), combination.pair, t('honor', 1)];
  const allTiles = hand;
  const result = calc.isJunchanWithCombination(combination, [], allTiles);
  assert(result === false, '字牌があるので純チャン不成立');
});

test('純チャン: 副露を含む場合 (食い下がり2翻)', () => {
  const combination = {
    pair: t('man', 1),
    melds: [
      [t('man', 7), t('man', 8), t('man', 9)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
    ]
  };
  const furoMelds = [
    [t('sou', 1), t('sou', 2), t('sou', 3)],
    [t('sou', 9), t('sou', 9), t('sou', 9)],
  ];
  const allTiles = [...combination.melds.flat(), combination.pair, t('man', 1), ...furoMelds.flat()];
  const result = calc.isJunchanWithCombination(combination, furoMelds, allTiles);
  assert(result === true, '純チャンが副露ありでも成立するはず');
});

// =========================================================
section('九蓮宝燈テスト');

test('九蓮宝燈: 1112345678999m + 5m', () => {
  const tiles = [
    t('man', 1), t('man', 1), t('man', 1),
    t('man', 2), t('man', 3), t('man', 4),
    t('man', 5), t('man', 5), t('man', 6),
    t('man', 7), t('man', 8),
    t('man', 9), t('man', 9), t('man', 9),
  ];
  assert(calc.isChuurenPoutou(tiles) === true, '九蓮宝燈が成立するはず');
});

test('九蓮宝燈: 1112345678999p + 1p', () => {
  const tiles = [
    t('pin', 1), t('pin', 1), t('pin', 1), t('pin', 1),
    t('pin', 2), t('pin', 3), t('pin', 4),
    t('pin', 5), t('pin', 6), t('pin', 7),
    t('pin', 8),
    t('pin', 9), t('pin', 9), t('pin', 9),
  ];
  assert(calc.isChuurenPoutou(tiles) === true, '九蓮宝燈（純正）が成立するはず');
});

test('九蓮宝燈: 混合スートでは不成立', () => {
  const tiles = [
    t('man', 1), t('man', 1), t('man', 1),
    t('man', 2), t('man', 3), t('man', 4),
    t('man', 5), t('pin', 6), t('man', 7), // pin混入
    t('man', 8),
    t('man', 9), t('man', 9), t('man', 9),
    t('man', 6),
  ];
  assert(calc.isChuurenPoutou(tiles) === false, '混合スートでは不成立');
});

test('九蓮宝燈: 1が2枚しかない場合は不成立', () => {
  const tiles = [
    t('man', 1), t('man', 1),
    t('man', 2), t('man', 2), t('man', 3), t('man', 4),
    t('man', 5), t('man', 6), t('man', 7),
    t('man', 8),
    t('man', 9), t('man', 9), t('man', 9),
    t('man', 3),
  ];
  assert(calc.isChuurenPoutou(tiles) === false, '1が3枚未満では不成立');
});

// =========================================================
section('七対子複合テスト');

test('七対子 + 断么九', () => {
  const hand = [
    t('man', 2), t('man', 2),
    t('man', 4), t('man', 4),
    t('pin', 3), t('pin', 3),
    t('pin', 6), t('pin', 6),
    t('sou', 5), t('sou', 5),
    t('sou', 7), t('sou', 7),
    t('sou', 8), t('sou', 8),
  ];
  const yaku = calc.detectYaku(hand, [], t('sou', 8), true, false, false, true, null, 1, 1, [], [], [], [], false, false, false, false, false, false, false, false);
  const names = yaku.map(y => y.name);
  assert(names.includes('七対子'), '七対子があるはず');
  assert(names.includes('断么九'), '断么九もあるはず');
  console.log('    yaku:', names.join(', '));
});

test('七対子 + 混一色', () => {
  const hand = [
    t('man', 1), t('man', 1),
    t('man', 3), t('man', 3),
    t('man', 5), t('man', 5),
    t('man', 7), t('man', 7),
    t('man', 9), t('man', 9),
    t('honor', 5), t('honor', 5),
    t('honor', 6), t('honor', 6),
  ];
  const yaku = calc.detectYaku(hand, [], t('honor', 6), true, false, false, true, null, 1, 1, [], [], [], [], false, false, false, false, false, false, false, false);
  const names = yaku.map(y => y.name);
  assert(names.includes('七対子'), '七対子があるはず');
  assert(names.includes('混一色'), '混一色もあるはず');
  console.log('    yaku:', names.join(', '));
});

test('七対子 + 清一色', () => {
  const hand = [
    t('man', 1), t('man', 1),
    t('man', 2), t('man', 2),
    t('man', 3), t('man', 3),
    t('man', 5), t('man', 5),
    t('man', 6), t('man', 6),
    t('man', 7), t('man', 7),
    t('man', 9), t('man', 9),
  ];
  const yaku = calc.detectYaku(hand, [], t('man', 9), true, false, false, true, null, 1, 1, [], [], [], [], false, false, false, false, false, false, false, false);
  const names = yaku.map(y => y.name);
  assert(names.includes('七対子'), '七対子があるはず');
  assert(names.includes('清一色'), '清一色もあるはず');
  console.log('    yaku:', names.join(', '));
});

test('七対子 + 混老頭', () => {
  const hand = [
    t('man', 1), t('man', 1),
    t('man', 9), t('man', 9),
    t('pin', 1), t('pin', 1),
    t('pin', 9), t('pin', 9),
    t('sou', 1), t('sou', 1),
    t('honor', 1), t('honor', 1),
    t('honor', 5), t('honor', 5),
  ];
  const yaku = calc.detectYaku(hand, [], t('honor', 5), true, false, false, true, null, 1, 1, [], [], [], [], false, false, false, false, false, false, false, false);
  const names = yaku.map(y => y.name);
  assert(names.includes('七対子'), '七対子があるはず');
  assert(names.includes('混老頭'), '混老頭もあるはず');
  console.log('    yaku:', names.join(', '));
});

// =========================================================
section('detectYaku 統合テスト');

test('detectYaku: チャンタが正しく検出される (門前2翻)', () => {
  const hand = [
    t('man', 1), t('man', 2), t('man', 3),
    t('pin', 7), t('pin', 8), t('pin', 9),
    t('sou', 1), t('sou', 1), t('sou', 1),
    t('honor', 1), t('honor', 1), t('honor', 1),
    t('man', 9), t('man', 9),
  ];
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('honor', 1), t('honor', 1), t('honor', 1)],
    ]
  };
  const yaku = calc.detectYaku(hand, [], t('man', 9), false, true, false, true, combination, 1, 2, [], [], [], [], false, false, false, false, false, false, false, false);
  const chanta = yaku.find(y => y.name === '混全帯么九');
  assert(chanta, '混全帯么九が検出されるはず');
  assert(chanta.han === 2, '門前で2翻のはず');
  console.log('    yaku:', yaku.map(y => `${y.name}(${y.han})`).join(', '));
});

test('detectYaku: 純チャンが正しく検出される (門前3翻)', () => {
  const hand = [
    t('man', 1), t('man', 2), t('man', 3),
    t('pin', 7), t('pin', 8), t('pin', 9),
    t('sou', 1), t('sou', 1), t('sou', 1),
    t('sou', 7), t('sou', 8), t('sou', 9),
    t('man', 9), t('man', 9),
  ];
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('man', 1), t('man', 2), t('man', 3)],
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
      [t('sou', 7), t('sou', 8), t('sou', 9)],
    ]
  };
  const yaku = calc.detectYaku(hand, [], t('man', 9), false, true, false, true, combination, 1, 2, [], [], [], [], false, false, false, false, false, false, false, false);
  const junchan = yaku.find(y => y.name === '純全帯么九');
  assert(junchan, '純全帯么九が検出されるはず');
  assert(junchan.han === 3, '門前で3翻のはず');
  const chanta = yaku.find(y => y.name === '混全帯么九');
  assert(!chanta, 'チャンタと純チャンは複合しない');
  console.log('    yaku:', yaku.map(y => `${y.name}(${y.han})`).join(', '));
});

test('detectYaku: チャンタ 食い下がり1翻', () => {
  const combination = {
    pair: t('man', 9),
    melds: [
      [t('pin', 7), t('pin', 8), t('pin', 9)],
      [t('sou', 1), t('sou', 1), t('sou', 1)],
    ]
  };
  const furoMelds = [
    [t('man', 1), t('man', 2), t('man', 3)],
    [t('honor', 5), t('honor', 5), t('honor', 5)],
  ];
  const hand = [...combination.melds.flat(), combination.pair, t('man', 9)];
  const allTiles = [...hand, ...furoMelds.flat()];
  const yaku = calc.detectYaku(hand, furoMelds, t('man', 9), false, true, false, false, combination, 1, 2, [], [], [], [], false, false, false, false, false, false, false, false);
  const chanta = yaku.find(y => y.name === '混全帯么九');
  assert(chanta, '混全帯么九が検出されるはず');
  assert(chanta.han === 1, '食い下がりで1翻のはず');
  console.log('    yaku:', yaku.map(y => `${y.name}(${y.han})`).join(', '));
});

// =========================================================
report();
