/**
 * 偶然役検出テスト（統合版）
 * - 一発（イッパツ）
 * - 海底撈月（ハイテイロウゲツ）
 * - 嶺上開花（リンシャンカイホウ）
 * 
 * 統合元: test-accidental-yaku-final.js, test-accidental-yaku-unit.js
 */
const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const { assert, section, report } = require('./test-helper');

// ログ抑制
const origLog = console.log;
const suppress = () => { console.log = (...args) => { const msg = args.join(' '); if (msg.includes('===') || msg.includes('✅') || msg.includes('❌') || msg.includes('結果')) origLog(...args); }; };
const restore = () => { console.log = origLog; };

function createHand(tiles) {
  return tiles.map(t => {
    const [suit, num] = t.split('_');
    return new Tile(suit, parseInt(num));
  });
}

// テスト用手牌（七対子形）
function makeAccidentalTestHand() {
  return createHand([
    'man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1',
    'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4'
  ]);
}

const scoreCalc = new ScoreCalculator();

// ============================================================
section('偶然役: 一発（イッパツ）検出');
{
  suppress();
  const hand = makeAccidentalTestHand();
  const winningTile = new Tile('honor', 4);
  const result = scoreCalc.calculateScore({
    hand: [...hand, winningTile],
    melds: [], winningTile, isTsumo: true, isRon: false,
    riichi: true, menzen: true, roundWind: 0, seatWind: 0,
    doraIndicators: [], doraTiles: [], urahaTiles: [],
    isIppatsumari: true, isHaitei: false, isRinshan: false
  });
  restore();
  assert(result.yaku.some(y => y.name === '一発'), '一発が検出される');
}

// ============================================================
section('偶然役: 海底撈月（ハイテイロウゲツ）検出');
{
  suppress();
  const hand = makeAccidentalTestHand();
  const winningTile = new Tile('honor', 4);
  const result = scoreCalc.calculateScore({
    hand: [...hand, winningTile],
    melds: [], winningTile, isTsumo: true, isRon: false,
    riichi: false, menzen: true, roundWind: 0, seatWind: 0,
    doraIndicators: [], doraTiles: [], urahaTiles: [],
    isIppatsumari: false, isHaitei: true, isRinshan: false
  });
  restore();
  assert(result.yaku.some(y => y.name === '海底撈月'), '海底撈月が検出される');
}

// ============================================================
section('偶然役: 嶺上開花（リンシャンカイホウ）検出');
{
  suppress();
  const hand = makeAccidentalTestHand();
  const winningTile = new Tile('honor', 4);
  const result = scoreCalc.calculateScore({
    hand: [...hand, winningTile],
    melds: [], winningTile, isTsumo: true, isRon: false,
    riichi: false, menzen: true, roundWind: 0, seatWind: 0,
    doraIndicators: [], doraTiles: [], urahaTiles: [],
    isIppatsumari: false, isHaitei: false, isRinshan: true
  });
  restore();
  assert(result.yaku.some(y => y.name === '嶺上開花'), '嶺上開花が検出される');
}

report();
