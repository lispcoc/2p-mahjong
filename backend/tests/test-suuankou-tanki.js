/**
 * 四暗刻の単騎待ちロン対応テスト
 * - 単騎待ちロン → 四暗刻単騎成立（ダブル役満）
 * - 双碰待ちロン → 四暗刻不成立（三暗刻に降格）
 * - ツモ（双碰） → 四暗刻成立（従来通り）
 * - ツモ（単騎） → 四暗刻単騎成立（ダブル役満）
 */
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

const calc = new ScoreCalculator();

// ========== 四暗刻：単騎待ちロン ==========

section('四暗刻: 単騎待ちロン → 四暗刻単騎（ダブル役満）');
{
  // 手牌: 1m1m1m 3m3m3m 5p5p5p 9s9s9s 東東
  // 和了牌: 東（単騎待ち＝雀頭を完成）
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 9), new Tile('sou', 9), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 1),  // 東東（雀頭）
  ];

  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    winningTile: new Tile('honor', 1), // 単騎待ち: 東
    isTsumo: false,
    isRon: true,
    riichi: false,
    menzen: true,
    roundWind: 1,
    seatWind: 1,
  });

  assert(result.valid, '和了が有効');
  const yakuNames = result.yaku.map(y => y.name);
  assert(yakuNames.includes('四暗刻単騎'), '四暗刻単騎が検出される（単騎ロン）');
  assertEqual(result.score, 64000, 'ダブル役満（64,000点）');
  console.log(`    得点: ${result.score}点, 役: ${yakuNames.join(', ')}`);
}

// ========== 四暗刻：双碰待ちロン ==========

section('四暗刻: 双碰待ちロン → 不成立');
{
  // 手牌: 1m1m1m 3m3m3m 5p5p5p 9s9s 東東東
  // 和了牌: 9s（双碰待ち＝刻子を完成させた）
  // この場合、9sの刻子はロンで完成→明刻扱い→四暗刻不成立
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 9), new Tile('sou', 9), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 1),  // 東東
  ];

  // 双碰待ちの場合: 9sで和了 → 9sの刻子がロンで完成
  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    winningTile: new Tile('sou', 9), // 双碰待ち: 9s
    isTsumo: false,
    isRon: true,
    riichi: false,
    menzen: true,
    roundWind: 1,
    seatWind: 1,
  });

  // 和了自体は有効（三暗刻＋対々和などが付く可能性がある）
  const yakuNames = result.yaku.map(y => y.name);
  assert(!yakuNames.includes('四暗刻'), '四暗刻は検出されない（双碰ロン）');
  console.log(`    得点: ${result.score}点, 役: ${yakuNames.join(', ')}`);
}

// ========== 四暗刻：ツモ（従来通り成立） ==========

section('四暗刻: ツモ（双碰） → 成立（従来通り）');
{
  // 手牌: 1m1m1m 3m3m3m 5p5p5p 9s9s9s 東東
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 9), new Tile('sou', 9), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 1),
  ];

  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    winningTile: new Tile('sou', 9), // ツモでは双碰でもOK
    isTsumo: true,
    isRon: false,
    riichi: false,
    menzen: true,
    roundWind: 1,
    seatWind: 1,
  });

  assert(result.valid, '和了が有効');
  const yakuNames = result.yaku.map(y => y.name);
  assert(yakuNames.includes('四暗刻'), '四暗刻が検出される（ツモ）');
  assertEqual(result.score, 32000, 'シングル役満（32,000点）');
  console.log(`    得点: ${result.score}点, 役: ${yakuNames.join(', ')}`);
}

// ========== 四暗刻：単騎待ちツモ ==========

section('四暗刻: 単騎待ちツモ → 四暗刻単騎（ダブル役満）');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 9), new Tile('sou', 9), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 1),
  ];

  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    winningTile: new Tile('honor', 1), // 単騎ツモ
    isTsumo: true,
    isRon: false,
    riichi: false,
    menzen: true,
    roundWind: 1,
    seatWind: 1,
  });

  assert(result.valid, '和了が有効');
  const yakuNames = result.yaku.map(y => y.name);
  assert(yakuNames.includes('四暗刻単騎'), '四暗刻単騎が検出される（単騎ツモ）');
  assertEqual(result.score, 64000, 'ダブル役満（64,000点）');
  console.log(`    得点: ${result.score}点, 役: ${yakuNames.join(', ')}`);
}

// ========== 数牌の単騎待ちロン ==========

section('四暗刻: 数牌の単騎待ちロン → 四暗刻単騎（ダブル役満）');
{
  // 手牌: 1m1m1m 3m3m3m 5p5p5p 9s9s9s 2p2p
  // 和了牌: 2p（数牌単騎）
  const hand = [
    new Tile('man', 1), new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 5), new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 9), new Tile('sou', 9), new Tile('sou', 9),
    new Tile('pin', 2), new Tile('pin', 2),
  ];

  const result = calc.calculateScore({
    hand: hand,
    melds: [],
    winningTile: new Tile('pin', 2), // 数牌の単騎待ち
    isTsumo: false,
    isRon: true,
    riichi: false,
    menzen: true,
    roundWind: 1,
    seatWind: 1,
  });

  assert(result.valid, '和了が有効');
  const yakuNames = result.yaku.map(y => y.name);
  assert(yakuNames.includes('四暗刻単騎'), '四暗刻単騎が検出される（数牌単騎ロン）');
  assertEqual(result.score, 64000, 'ダブル役満（64,000点）');
  console.log(`    得点: ${result.score}点, 役: ${yakuNames.join(', ')}`);
}

report();
