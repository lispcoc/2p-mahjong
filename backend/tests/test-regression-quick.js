/**
 * 回帰テスト（スモークテスト）
 * - 基本的な断么九スコアリング
 * - 七対子＋断么九の複合
 */
const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const { assert, section, report } = require('./test-helper');

// ログ抑制
const origLog = console.log;
console.log = () => {};

const calc = new ScoreCalculator();

// テスト1: 基本的な断么九手
const hand1 = [
  new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
  new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
  new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
  new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
  new Tile('pin', 2), new Tile('pin', 2),
];
const r1 = calc.calculateScore({
  hand: hand1, melds: [], winningTile: new Tile('pin', 2),
  isTsumo: false, isRon: true, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2
});

// テスト2: 七対子＋断么九
const hand2 = [
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 4), new Tile('man', 4),
  new Tile('pin', 3), new Tile('pin', 3),
  new Tile('pin', 6), new Tile('pin', 6),
  new Tile('sou', 5), new Tile('sou', 5),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('sou', 8), new Tile('sou', 8),
];
const r2 = calc.calculateScore({
  hand: hand2, melds: [], winningTile: new Tile('sou', 8),
  isTsumo: true, isRon: false, riichi: false, menzen: true,
  roundWind: 1, seatWind: 2
});

console.log = origLog;

section('回帰: 基本断么九');
assert(r1.valid, '和了が有効');
assert(r1.yaku.some(y => y.name === '断么九'), '断么九が検出される');

section('回帰: 七対子＋断么九');
assert(r2.valid, '和了が有効');
assert(r2.yaku.some(y => y.name === '七対子'), '七対子が検出される');
assert(r2.yaku.some(y => y.name === '断么九'), '断么九が検出される');

report();
