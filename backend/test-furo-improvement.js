/**
 * AIプレイヤーの副露（ポン）改善のための統合テスト
 * 実際のゲーム状況での判断をシミュレート
 */

const Tile = require('./src/logic/Tile');
const AIPlayer = require('./src/logic/AIPlayer');
const TenpaiChecker = require('./src/logic/TenpaiChecker');

// ===== テストシナリオ定義 =====

const scenarios = [
  {
    name: '✅ シナリオ1: ホンイツ（混一色）を目指す場合',
    description: '字牌を含まない筒子で統一し、高得点ホンイツを狙う',
    hand: [
      new Tile('p', 2), new Tile('p', 3), new Tile('p', 4),
      new Tile('p', 5), new Tile('p', 5), new Tile('p', 6),
      new Tile('p', 7), new Tile('p', 8), new Tile('p', 9),
      new Tile('p', 2), new Tile('p', 3), new Tile('p', 4),
    ],
    discardedTile: new Tile('p', 5),
    melds: [],
    expectedDecision: true,
    reason: 'ホンイツ構築の明確な道筋がある'
  },
  
  {
    name: '❌ シナリオ2: 無謀なポン（役を破壊）',
    description: '役を狙っているのに、無関係な牌をポンして失う',
    hand: [
      new Tile('m', 1), new Tile('m', 2), new Tile('m', 3),
      new Tile('m', 5), new Tile('m', 6), new Tile('m', 7),
      new Tile('m', 8), new Tile('m', 9),
      new Tile('p', 1), new Tile('p', 2),
      new Tile('s', 1)
    ],
    discardedTile: new Tile('honor', 1), // 無関係な字牌
    melds: [],
    expectedDecision: false,
    reason: '手の一体性を失い、戦略が崩壊する'
  },

  {
    name: '✅ シナリオ3: テンパイに向かう場合',
    description: 'ポンするとテンパイに向かう場合は積極的に',
    hand: [
      new Tile('m', 1), new Tile('m', 2),
      new Tile('m', 4), new Tile('m', 5), new Tile('m', 6),
      new Tile('p', 1), new Tile('p', 1),
      new Tile('s', 1), new Tile('s', 2), new Tile('s', 3),
      new Tile('honor', 1)
    ],
    discardedTile: new Tile('m', 2),
    melds: [],
    expectedDecision: true,
    reason: 'テンパイ達成が見える'
  },

  {
    name: '❌ シナリオ4: バラバラな手でのポン回避',
    description: '手牌がバラバラになりすぎていてはっきりした戦略がない場合',
    hand: [
      new Tile('m', 2), new Tile('m', 9),
      new Tile('p', 1), new Tile('p', 5), new Tile('p', 9),
      new Tile('s', 3), new Tile('s', 8),
      new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
      new Tile('honor', 4), new Tile('honor', 5)
    ],
    discardedTile: new Tile('honor', 2),
    melds: [],
    expectedDecision: false,
    reason: '戦略性なく、ポンしても無意味'
  },

  {
    name: '✅ シナリオ5: メルドがある場合は慎重に',
    description: 'メルド1つある状態での判断（tanyao狙い）',
    hand: [
      new Tile('m', 2), new Tile('m', 3), new Tile('m', 4),
      new Tile('m', 5), new Tile('m', 6), new Tile('m', 7),
      new Tile('p', 3), new Tile('p', 4), new Tile('p', 5),
      new Tile('p', 6), new Tile('p', 7)
    ],
    discardedTile: new Tile('m', 3),
    melds: [
      [new Tile('m', 8), new Tile('m', 8), new Tile('m', 8)] // tanyaoメルド
    ],
    expectedDecision: true,
    reason: 'タンヤオ役を深掘りする好機'
  }
];

// ===== テスト実行 =====

console.log('\n='.repeat(70));
console.log('AI副露（ポン）改善 - 統合テスト');
console.log('='.repeat(70) + '\n');

let passed = 0;
let failed = 0;

scenarios.forEach((scenario, index) => {
  console.log(`\n【テスト ${index + 1}】${scenario.name}`);
  console.log(`説明: ${scenario.description}`);
  console.log(`理由: ${scenario.reason}`);
  console.log('-'.repeat(70));

  try {
    const aiPlayer = new AIPlayer();
    const decision = aiPlayer.shouldPung(scenario.hand, scenario.discardedTile, scenario.melds);
    
    const isCorrect = decision === scenario.expectedDecision;
    const emoji = isCorrect ? '✅' : '❌';
    const decisionStr = decision ? 'ポンする' : 'ポンしない';
    const expectedStr = scenario.expectedDecision ? 'ポンする' : 'ポンしない';

    console.log(`判定: ${decisionStr}`);
    console.log(`期待値: ${expectedStr}`);
    console.log(`結果: ${emoji} ${isCorrect ? 'PASS' : 'FAIL'}\n`);

    if (isCorrect) {
      passed++;
    } else {
      failed++;
    }
  } catch (error) {
    console.log(`エラー: ${error.message}\n`);
    failed++;
  }
});

// ===== 結果サマリー =====

console.log('\n' + '='.repeat(70));
console.log(`📊 テスト結果: ${passed}/${scenarios.length} 成功, ${failed}/${scenarios.length} 失敗`);
console.log('='.repeat(70));

if (passed === scenarios.length) {
  console.log('\n🎉 全てのテストに合格しました！');
} else {
  console.log(`\n⚠️  ${failed}個のテストが失敗しました`);
}
