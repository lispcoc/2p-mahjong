#!/usr/bin/env node

const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');

function createHand(tiles) {
  return tiles.map(t => {
    const [suit, num] = t.split('_');
    return new Tile(suit, parseInt(num));
  });
}

// 内部ログの最小化
const origLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('[') || msg.includes('===')) origLog(...args);
};

function test() {
  const results = {};
  
  // テスト1：一発
  {
    const hand = createHand(['man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1', 'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4']);
    const winningTile = new Tile('honor', 4);
    const scoreCalc = new ScoreCalculator();
    const result = scoreCalc.calculateScore({
      hand: [...hand, winningTile],
      melds: [], winningTile, isTsumo: true, isRon: false,
      riichi: true, menzen: true, roundWind: 0, seatWind: 0,
      doraIndicators: [], doraTiles: [], urahaTiles: [],
      isIppatsumari: true, isHaitei: false, isRinshan: false
    });
    results['一発'] = result.yaku.some(y => y.name === '一発');
  }
  
  // テスト2：海底撈月
  {
    const hand = createHand(['man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1', 'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4']);
    const winningTile = new Tile('honor', 4);
    const scoreCalc = new ScoreCalculator();
    const result = scoreCalc.calculateScore({
      hand: [...hand, winningTile],
      melds: [], winningTile, isTsumo: true, isRon: false,
      riichi: false, menzen: true, roundWind: 0, seatWind: 0,
      doraIndicators: [], doraTiles: [], urahaTiles: [],
      isIppatsumari: false, isHaitei: true, isRinshan: false
    });
    results['海底撈月'] = result.yaku.some(y => y.name === '海底撈月');
  }
  
  // テスト3：嶺上開花
  {
    const hand = createHand(['man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1', 'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4']);
    const winningTile = new Tile('honor', 4);
    const scoreCalc = new ScoreCalculator();
    const result = scoreCalc.calculateScore({
      hand: [...hand, winningTile],
      melds: [], winningTile, isTsumo: true, isRon: false,
      riichi: false, menzen: true, roundWind: 0, seatWind: 0,
      doraIndicators: [], doraTiles: [], urahaTiles: [],
      isIppatsumari: false, isHaitei: false, isRinshan: true
    });
    results['嶺上開花'] = result.yaku.some(y => y.name === '嶺上開花');
  }
  
  console.log = origLog;
  console.log('\n===== 偶然役検出テスト结果 =====\n');
  console.log(`一発（イッパツ）: ${results['一発'] ? '✅ 検出' : '❌ 未検出'}`);
  console.log(`海底撈月（ハイテイロウゲツ）: ${results['海底撈月'] ? '✅ 検出' : '❌ 未検出'}`);
  console.log(`嶺上開花（リンシャンカイホウ）: ${results['嶺上開花'] ? '✅ 検出' : '❌ 未検出'}`);
  
  const allPass = Object.values(results).every(v => v);
  console.log(`\n${allPass ? '✅ すべてのテストに成功！' : '❌ 一部のテストが失敗'}`);
  
  return allPass ? 0 : 1;
}

process.exit(test());
