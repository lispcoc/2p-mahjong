/**
 * 平和（ピンフ）判定テスト
 * - ロン・ツモ成立
 * - ペンチャン/両面判定
 * - 雀頭制約（場風・自風・三元牌）
 * - 暗槓時の不成立
 */
const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const { assert, assertEqual, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

function testPinfu(desc, winInfo, expectPinfu) {
  const result = calc.calculateScore(winInfo);
  const hasPinfu = result.yaku && result.yaku.some(y => y.name === '平和');
  const ok = hasPinfu === expectPinfu;
  assert(ok, desc + (ok ? '' : ` (期待: ${expectPinfu ? '平和あり' : '平和なし'}, 実際: ${hasPinfu ? '平和あり' : '平和なし'})`));
  return result;
}

// 基本手牌: 123m 456m 789s 123p + 55s (雀頭)
function makeBasicHand() {
  return [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ];
}

section('平和ロン（基本形、両面待ち6mアガリ）');
testPinfu('平和ロン成立', {
  hand: makeBasicHand(), melds: [],
  winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 1,
}, true);

section('平和ツモ');
{
  const result2 = testPinfu('平和ツモ成立', {
    hand: makeBasicHand(), melds: [],
    winningTile: new Tile('man', 6),
    isTsumo: true, isRon: false, riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
  }, true);
  assertEqual(result2.fu, 20, '平和ツモの符が20符');
}

section('ペンチャン待ち（3アガリ）→ 不成立');
testPinfu('ペンチャン3アガリ不成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ],
  melds: [], winningTile: new Tile('pin', 3),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

section('ペンチャン待ち（7アガリ）→ 不成立');
testPinfu('ペンチャン7アガリ不成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ],
  melds: [], winningTile: new Tile('sou', 7),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

section('2-3待ちで1アガリ → 両面、成立');
testPinfu('2-3待ちで1p（両面）成立', {
  hand: [
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ],
  melds: [], winningTile: new Tile('pin', 1),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, true);

section('7-8待ちで9アガリ → 両面、成立');
testPinfu('7-8待ちで9s（両面）成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('sou', 5), new Tile('sou', 5),
  ],
  melds: [], winningTile: new Tile('sou', 9),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, true);

section('場風雀頭 → 不成立');
testPinfu('場風雀頭で不成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('honor', 1), new Tile('honor', 1),
  ],
  melds: [], winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

section('自風雀頭 → 不成立');
testPinfu('自風雀頭で不成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('honor', 2), new Tile('honor', 2),
  ],
  melds: [], winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

section('オタ風雀頭 → 成立');
testPinfu('オタ風雀頭で成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('honor', 3), new Tile('honor', 3),
  ],
  melds: [], winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, true);

section('三元牌雀頭 → 不成立');
testPinfu('三元牌雀頭で不成立', {
  hand: [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('honor', 5), new Tile('honor', 5),
  ],
  melds: [], winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

section('暗槓あり → 不成立');
testPinfu('暗槓ありで不成立', {
  hand: [
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 5), new Tile('sou', 5),
  ],
  melds: [
    [new Tile('man', 1), new Tile('man', 1), new Tile('man', 1), new Tile('man', 1)],
  ],
  concealedMeldIndices: new Set([0]),
  winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

report();
