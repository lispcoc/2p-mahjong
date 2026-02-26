// Quick regression test
const Tile = require('../src/logic/Tile');
const SC = require('../src/logic/ScoreCalculator');

// Suppress debug logs
const origLog = console.log;
console.log = () => {};

const calc = new SC();

// Test 1: basic tanyao hand (all middle tiles)
const hand1 = [
  new Tile('man',2), new Tile('man',3), new Tile('man',4),
  new Tile('pin',4), new Tile('pin',5), new Tile('pin',6),
  new Tile('sou',3), new Tile('sou',4), new Tile('sou',5),
  new Tile('man',5), new Tile('man',5), new Tile('man',5),
  new Tile('pin',2), new Tile('pin',2),
];
const r1 = calc.calculateScore({hand:hand1, melds:[], winningTile: new Tile('pin',2), isTsumo:false, isRon:true, riichi:false, menzen:true, roundWind:1, seatWind:2});

// Test 2: chiitoitsu + tanyao
const hand2 = [
  new Tile('man',2), new Tile('man',2),
  new Tile('man',4), new Tile('man',4),
  new Tile('pin',3), new Tile('pin',3),
  new Tile('pin',6), new Tile('pin',6),
  new Tile('sou',5), new Tile('sou',5),
  new Tile('sou',7), new Tile('sou',7),
  new Tile('sou',8), new Tile('sou',8),
];
const r2 = calc.calculateScore({hand:hand2, melds:[], winningTile: new Tile('sou',8), isTsumo:true, isRon:false, riichi:false, menzen:true, roundWind:1, seatWind:2});

console.log = origLog;

console.log('Test 1 (basic):', r1.valid, 'yaku:', r1.yaku?.map(y=>y.name).join(','), 'han:', r1.han, 'score:', r1.score);
console.log('Test 2 (chiitoi+tanyao):', r2.valid, 'yaku:', r2.yaku?.map(y=>y.name).join(','), 'han:', r2.han, 'score:', r2.score);

// Verify
if (!r1.valid) { console.log('FAIL: Test 1 not valid'); process.exit(1); }
if (!r2.valid) { console.log('FAIL: Test 2 not valid'); process.exit(1); }
if (!r2.yaku.some(y => y.name === '七対子')) { console.log('FAIL: Missing chiitoi'); process.exit(1); }
if (!r2.yaku.some(y => y.name === '断么九')) { console.log('FAIL: Missing tanyao'); process.exit(1); }
console.log('ALL REGRESSION TESTS PASSED');
