#!/usr/bin/env node

const Tile = require('./src/logic/Tile');
const MahjongLogic = require('./src/logic/MahjongLogic');
const ScoreCalculator = require('./src/logic/ScoreCalculator');

// ログ抑制
const originalLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('テスト') || msg.includes('✓') || msg.includes('❌') || msg.includes('役') || msg.includes('DEBUG')) {
    originalLog(...args);
  }
};

function createHand(tiles) {
  return tiles.map(t => {
    const [suit, num] = t.split('_');
    return new Tile(suit, parseInt(num));
  });
}

function testIppatsumari() {
  console.log('\n========== テスト1：一発（イッパツ） ==========');
  
  // トイトイテンパイの手（対子で和了）
  const hand = createHand(['man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1', 'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4']);
  const winningTile = new Tile('honor', 4);
  const fullHand = [...hand, winningTile];
  
  console.log(`DEBUG: 手牌総数 = ${fullHand.length}`);
  
  // 和了形の検証
  const logic = new MahjongLogic([], {});
  const isWinningForm = logic.checkValidMeldStructure(fullHand);
  console.log(`DEBUG: 和了形か = ${isWinningForm}`);
  
  const scoreCalculator = new ScoreCalculator();
  const result = scoreCalculator.calculateScore({
    hand: fullHand,
    melds: [],
    winningTile: winningTile,
    isTsumo: true,
    isRon: false,
    riichi: true,
    menzen: true,
    roundWind: 0,
    seatWind: 0,
    doraIndicators: [],
    doraTiles: [],
    urahaTiles: [],
    isIppatsumari: true,  // リーチ直後
    isHaitei: false,
    isRinshan: false
  });
  
  console.log(`役: ${result.yaku.map(y => y.name + '(' + y.han + '翻)').join('、') || '役なし'}`);
  
  const hasIppatsumari = result.yaku.some(y => y.name === '一発');
  console.log(`結果: ${hasIppatsumari ? '✅ 一発を検出' : '❌ 一発を検出できず'}`);
  
  return hasIppatsumari;
}

function testHaitei() {
  console.log('\n========== テスト2：海底撈月（ハイテイロウゲツ） ==========');
  
  // ツモ門前での海底テスト（七対子で和了可能な手）
  const hand = createHand(['man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1', 'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4']);
  const winningTile = new Tile('honor', 4);
  const fullHand = [...hand, winningTile];
  
  const scoreCalculator = new ScoreCalculator();
  const result = scoreCalculator.calculateScore({
    hand: fullHand,
    melds: [],
    winningTile: winningTile,
    isTsumo: true,
    isRon: false,
    riichi: false,
    menzen: true,
    roundWind: 0,
    seatWind: 0,
    doraIndicators: [],
    doraTiles: [],
    urahaTiles: [],
    isIppatsumari: false,
    isHaitei: true,  // 壁が空
    isRinshan: false
  });
  
  console.log(`役: ${result.yaku.map(y => y.name + '(' + y.han + '翻)').join('、') || '役なし'}`);
  
  const hasHaitei = result.yaku.some(y => y.name === '海底撈月');
  console.log(`結果: ${hasHaitei ? '✅ 海底撈月を検出' : '❌ 海底撈月を検出できず'}`);
  
  return hasHaitei;
}

function testRinshan() {
  console.log('\n========== テスト3：嶺上開花（リンシャンカイホウ） ==========');
  
  // ツモ門前でのカン後テスト（七対子で和了可能な手）
  const hand = createHand(['man_1', 'man_1', 'pin_1', 'pin_1', 'sou_1', 'sou_1', 'honor_1', 'honor_1', 'honor_2', 'honor_2', 'honor_3', 'honor_3', 'honor_4']);
  const winningTile = new Tile('honor', 4);
  const fullHand = [...hand, winningTile];
  
  const scoreCalculator = new ScoreCalculator();
  const result = scoreCalculator.calculateScore({
    hand: fullHand,
    melds: [],
    winningTile: winningTile,
    isTsumo: true,
    isRon: false,
    riichi: false,
    menzen: true,
    roundWind: 0,
    seatWind: 0,
    doraIndicators: [],
    doraTiles: [],
    urahaTiles: [],
    isIppatsumari: false,
    isHaitei: false,
    isRinshan: true  // カン後の嶺上牌
  });
  
  console.log(`役: ${result.yaku.map(y => y.name + '(' + y.han + '翻)').join('、') || '役なし'}`);
  
  const hasRinshan = result.yaku.some(y => y.name === '嶺上開花');
  console.log(`結果: ${hasRinshan ? '✅ 嶺上開花を検出' : '❌ 嶺上開花を検出できず'}`);
  
  return hasRinshan;
}

async function main() {
  console.log('========== 偶然役（アクシデンタル役） 検出テスト ==========');
  
  const r1 = testIppatsumari();
  const r2 = testHaitei();
  const r3 = testRinshan();
  
  console.log('\n========== テスト結果サマリー ==========');
  const allPass = r1 && r2 && r3;
  
  if (allPass) {
    console.log('✅ すべてのテストに成功しました！');
  } else {
    console.log(`⚠️  テスト結果: 一発=${r1 ? '✅' : '❌'}, 海底=${r2 ? '✅' : '❌'}, 嶺上=${r3 ? '✅' : '❌'}`);
  }
}

main().catch(err => {
  console.error('エラー:', err.message);
  console.error(err.stack);
  process.exit(1);
});
