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
    console.log(`✓ ${desc}`);
  } else {
    fail++;
    console.log(`✗ ${desc} (期待: ${expectPinfu ? '平和あり' : '平和なし'}, 実際: ${hasPinfu ? '平和あり' : '平和なし'})`);
    if (result.yaku) console.log(`  役: ${result.yaku.map(y => y.name).join(', ')}`);
    if (result.fu) console.log(`  符: ${result.fu}`);
  }
  return result;
}

// === 基本手牌: 123m 456m 789s 123p + 55s (雀頭) ===
function makeBasicHand() {
  return [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 7), new Tile('souzu', 8), new Tile('souzu', 9),
    new Tile('pinzu', 1), new Tile('pinzu', 2), new Tile('pinzu', 3),
    new Tile('souzu', 5), new Tile('souzu', 5),
  ];
}

console.log('=== テスト1: 平和ロン（基本形、両面待ち6mアガリ） ===');
test('平和ロン成立', {
  hand: makeBasicHand(),
  melds: [],
  winningTile: new Tile('manzu', 6),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 1,
}, true);

console.log('\n=== テスト2: 平和ツモ（ツモでも成立すべき） ===');
const result2 = test('平和ツモ成立', {
  hand: makeBasicHand(),
  melds: [],
  winningTile: new Tile('manzu', 6),
  isTsumo: true, isRon: false,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 1,
}, true);
// 平和ツモは20符であるべき
if (result2.fu === 20) {
  pass++;
  console.log('✓ 平和ツモの符が20符');
} else {
  fail++;
  console.log(`✗ 平和ツモの符が20符 (実際: ${result2.fu}符)`);
}

console.log('\n=== テスト3: ペンチャン待ち（1-2-3で3アガリ）→ 平和不成立 ===');
// 123m 456m 789s 55s + 12p → 3pでアガリ
test('ペンチャン3アガリ不成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 7), new Tile('souzu', 8), new Tile('souzu', 9),
    new Tile('pinzu', 1), new Tile('pinzu', 2), new Tile('pinzu', 3),
    new Tile('souzu', 5), new Tile('souzu', 5),
  ],
  melds: [],
  winningTile: new Tile('pinzu', 3),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

console.log('\n=== テスト4: ペンチャン待ち（7-8-9で7アガリ）→ 平和不成立 ===');
test('ペンチャン7アガリ不成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 7), new Tile('souzu', 8), new Tile('souzu', 9),
    new Tile('pinzu', 1), new Tile('pinzu', 2), new Tile('pinzu', 3),
    new Tile('souzu', 5), new Tile('souzu', 5),
  ],
  melds: [],
  winningTile: new Tile('souzu', 7),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

console.log('\n=== テスト5: 2-3待ちで1アガリ（1-2-3）→ 両面、平和成立 ===');
// 123m 456m 789s 55s + 23p → 1pか4pでアガリ
// 1pでアガリ → 2-3待ちの両面
test('2-3待ちで1p（両面）成立', {
  hand: [
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 7), new Tile('souzu', 8), new Tile('souzu', 9),
    new Tile('pinzu', 4), new Tile('pinzu', 5), new Tile('pinzu', 6),
    new Tile('pinzu', 1), new Tile('pinzu', 2), new Tile('pinzu', 3),
    new Tile('souzu', 5), new Tile('souzu', 5),
  ],
  melds: [],
  winningTile: new Tile('pinzu', 1),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, true);

console.log('\n=== テスト6: 7-8待ちで9アガリ（7-8-9）→ 両面、平和成立 ===');
test('7-8待ちで9s（両面）成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('pinzu', 1), new Tile('pinzu', 2), new Tile('pinzu', 3),
    new Tile('souzu', 7), new Tile('souzu', 8), new Tile('souzu', 9),
    new Tile('souzu', 5), new Tile('souzu', 5),
  ],
  melds: [],
  winningTile: new Tile('souzu', 9),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, true);

console.log('\n=== テスト7: 雀頭が場風（東=1）→ 平和不成立 ===');
test('場風雀頭で不成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 4), new Tile('souzu', 5), new Tile('souzu', 6),
    new Tile('pinzu', 4), new Tile('pinzu', 5), new Tile('pinzu', 6),
    new Tile('honor', 1), new Tile('honor', 1), // 東東
  ],
  melds: [],
  winningTile: new Tile('manzu', 6),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

console.log('\n=== テスト8: 雀頭が自風（南=2）→ 平和不成立 ===');
test('自風雀頭で不成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 4), new Tile('souzu', 5), new Tile('souzu', 6),
    new Tile('pinzu', 4), new Tile('pinzu', 5), new Tile('pinzu', 6),
    new Tile('honor', 2), new Tile('honor', 2), // 南南
  ],
  melds: [],
  winningTile: new Tile('manzu', 6),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

console.log('\n=== テスト9: 雀頭がオタ風（西=3、場風東/自風南）→ 平和成立 ===');
test('オタ風雀頭で成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 4), new Tile('souzu', 5), new Tile('souzu', 6),
    new Tile('pinzu', 4), new Tile('pinzu', 5), new Tile('pinzu', 6),
    new Tile('honor', 3), new Tile('honor', 3), // 西西
  ],
  melds: [],
  winningTile: new Tile('manzu', 6),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, true);

console.log('\n=== テスト10: 雀頭が白（三元牌）→ 平和不成立 ===');
test('三元牌雀頭で不成立', {
  hand: [
    new Tile('manzu', 1), new Tile('manzu', 2), new Tile('manzu', 3),
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 4), new Tile('souzu', 5), new Tile('souzu', 6),
    new Tile('pinzu', 4), new Tile('pinzu', 5), new Tile('pinzu', 6),
    new Tile('honor', 5), new Tile('honor', 5), // 白白
  ],
  melds: [],
  winningTile: new Tile('manzu', 6),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

console.log('\n=== テスト11: 暗槓あり → 平和不成立 ===');
// 暗槓 1111m + 手牌 456m 789s 55s + 23p → 平和不成立
test('暗槓ありで不成立', {
  hand: [
    new Tile('manzu', 4), new Tile('manzu', 5), new Tile('manzu', 6),
    new Tile('souzu', 7), new Tile('souzu', 8), new Tile('souzu', 9),
    new Tile('pinzu', 2), new Tile('pinzu', 3), new Tile('pinzu', 4),
    new Tile('souzu', 5), new Tile('souzu', 5),
  ],
  melds: [
    [new Tile('manzu', 1), new Tile('manzu', 1), new Tile('manzu', 1), new Tile('manzu', 1)],
  ],
  concealedMeldIndices: new Set([0]),
  winningTile: new Tile('manzu', 6),
  isTsumo: false, isRon: true,
  riichi: false, menzen: true,
  roundWind: 1, seatWind: 2,
}, false);

console.log(`\n========================================`);
console.log(`結果: ${pass}/${pass + fail} テスト通過`);
if (fail > 0) {
  console.log(`${fail} テスト失敗`);
  process.exit(1);
}
