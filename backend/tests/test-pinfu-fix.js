/**
 * 平和（ピンフ）判定テスト
 * - ロン・ツモ成立
 * - ペンチャン/両面判定
 * - 雀頭制約（場風・自風・三元牌）
 * - 暗槓時の不成立
 */
const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');

const calc = new ScoreCalculator();
let pass = 0, fail = 0;

function test(desc, winInfo, expectPinfu) {
  const result = calc.calculateScore(winInfo);
  const hasPinfu = result.yaku && result.yaku.some(y => y.name === '平和');
  const ok = hasPinfu === expectPinfu;
  if (ok) {
    pass++;
    console.log(`  ✅ ${desc}`);
  } else {
    fail++;
    console.log(`  ❌ ${desc} (期待: ${expectPinfu ? '平和あり' : '平和なし'}, 実際: ${hasPinfu ? '平和あり' : '平和なし'})`);
    if (result.yaku) console.log(`     役: ${result.yaku.map(y => y.name).join(', ')}`);
    if (result.fu) console.log(`     符: ${result.fu}`);
  }
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

console.log('=== テスト1: 平和ロン（基本形、両面待ち6mアガリ） ===');
test('平和ロン成立', {
  hand: makeBasicHand(), melds: [],
  winningTile: new Tile('man', 6),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 1,
}, true);

console.log('\n=== テスト2: 平和ツモ ===');
const result2 = test('平和ツモ成立', {
  hand: makeBasicHand(), melds: [],
  winningTile: new Tile('man', 6),
  isTsumo: true, isRon: false, riichi: false, menzen: true,
  roundWind: 1, seatWind: 1,
}, true);
if (result2.fu === 20) {
  pass++; console.log('  ✅ 平和ツモの符が20符');
} else {
  fail++; console.log(`  ❌ 平和ツモの符が20符 (実際: ${result2.fu}符)`);
}

console.log('\n=== テスト3: ペンチャン待ち（3アガリ）→ 不成立 ===');
test('ペンチャン3アガリ不成立', {
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

console.log('\n=== テスト4: ペンチャン待ち（7アガリ）→ 不成立 ===');
test('ペンチャン7アガリ不成立', {
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

console.log('\n=== テスト5: 2-3待ちで1アガリ → 両面、成立 ===');
test('2-3待ちで1p（両面）成立', {
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

console.log('\n=== テスト6: 7-8待ちで9アガリ → 両面、成立 ===');
test('7-8待ちで9s（両面）成立', {
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

console.log('\n=== テスト7: 場風雀頭 → 不成立 ===');
test('場風雀頭で不成立', {
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

console.log('\n=== テスト8: 自風雀頭 → 不成立 ===');
test('自風雀頭で不成立', {
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

console.log('\n=== テスト9: オタ風雀頭 → 成立 ===');
test('オタ風雀頭で成立', {
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

console.log('\n=== テスト10: 三元牌雀頭 → 不成立 ===');
test('三元牌雀頭で不成立', {
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

console.log('\n=== テスト11: 暗槓あり → 不成立 ===');
test('暗槓ありで不成立', {
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

console.log(`\n${'='.repeat(50)}`);
console.log(`結果: ${pass}/${pass + fail} テスト通過`);
if (fail > 0) {
  console.log(`${fail} テスト失敗`);
  process.exit(1);
} else {
  console.log('全テスト成功');
}
