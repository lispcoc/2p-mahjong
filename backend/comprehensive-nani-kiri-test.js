#!/usr/bin/env node

const AIPlayer = require('./src/logic/AIPlayer');
const Tile = require('./src/logic/Tile');

class ComprehensiveNaniKiriTester {
  constructor() {
    this.ai = new AIPlayer();
  }

  /**
   * ランダムな手牌を生成
   */
  generateRandomHand() {
    const suits = ['man', 'pin', 'sou', 'honor'];
    const hand = [];

    for (let i = 0; i < 13; i++) {
      const suit = suits[Math.floor(Math.random() * suits.length)];
      let number;
      if (suit === 'honor') {
        number = Math.floor(Math.random() * 7) + 1;
      } else {
        number = Math.floor(Math.random() * 9) + 1;
      }
      hand.push(new Tile(suit, number));
    }

    // ツモ牌
    const drawnSuit = suits[Math.floor(Math.random() * suits.length)];
    let drawnNumber;
    if (drawnSuit === 'honor') {
      drawnNumber = Math.floor(Math.random() * 7) + 1;
    } else {
      drawnNumber = Math.floor(Math.random() * 9) + 1;
    }
    hand.push(new Tile(drawnSuit, drawnNumber));

    return hand;
  }

  /**
   * 削除牌の複合性スコアを計算
   */
  getTileComplexity(hand, tileIndex) {
    const tile = hand[tileIndex];
    const handWithout = hand.slice();
    handWithout.splice(tileIndex, 1);
    return this.ai.evaluateCombinationPotential(handWithout, tile);
  }

  /**
   * 全牌のスコア分布を計算
   */
  getScoreDistribution(hand) {
    const scores = [];

    for (let i = 0; i < hand.length; i++) {
      const tile = hand[i];
      const handWithout = hand.slice();
      handWithout.splice(i, 1);

      const combination = this.ai.evaluateCombinationPotential(handWithout, tile);
      const isolation = this.ai.evaluateTileIsolation(handWithout, tile);
      const ryanmen = tile.suit !== 'honor' && tile.number >= 2 && tile.number <= 8 
        ? this.ai.evaluateRyanmenEfficiency(handWithout, tile)
        : 0;
      const tileEff = isolation * 80 + combination * 3.0 + ryanmen * 1.2;
      const danger = this.ai.evaluateDanger(tile, {});
      const shape = this.ai.evaluateHandShape(handWithout);
      const totalScore = tileEff * 3.0 + danger + shape * 1.5;

      scores.push({
        index: i,
        tile: tile.toString(),
        combination,
        totalScore,
      });
    }

    scores.sort((a, b) => b.totalScore - a.totalScore);
    return scores;
  }

  /**
   * 1000問テストを実行
   */
  run1000Tests() {
    console.log('\n麻雀何切る問題 AI妥当性テスト （1000問）\n');
    console.log('='.repeat(100));

    const stats = {
      totalProblems: 1000,
      correctDiscards: 0,
      scoreStats: {
        minGap: Infinity,
        maxGap: -Infinity,
        totalGap: 0,
        avgGap: 0,
      },
      discardTileStats: {
        byClass: { honor: 0, terminal: 0, standard: 0 },
        byNumber: {},
      },
      examples: [],
    };

    for (let testNum = 0; testNum < 1000; testNum++) {
      const hand = this.generateRandomHand();
      const discardIndex = this.ai.chooseDiscard(hand, hand.length - 1);
      const scores = this.getScoreDistribution(hand);

      const discardedScore = scores.find(s => s.index === discardIndex);
      const bestScore = scores[0];
      const gap = bestScore.totalScore - discardedScore.totalScore;

      const discardTile = hand[discardIndex];
      const tileClass = this.ai.classifyTile(discardTile);

      // 統計情報を収集
      stats.scoreStats.minGap = Math.min(stats.scoreStats.minGap, gap);
      stats.scoreStats.maxGap = Math.max(stats.scoreStats.maxGap, gap);
      stats.scoreStats.totalGap += gap;

      // 削除牌別統計
      stats.discardTileStats.byClass[tileClass]++;
      stats.discardTileStats.byNumber[discardTile.number] = 
        (stats.discardTileStats.byNumber[discardTile.number] || 0) + 1;

      // 最高スコアの牌が削除されていればOK
      if (gap === 0) {
        stats.correctDiscards++;
      }

      // サンプルケース記録
      if (testNum < 5 || gap > 200) { // 最初の5問と、大きなギャップがあるケースを記録
        stats.examples.push({
          number: testNum + 1,
          hand: hand.map(t => t.toString()),
          discardTile: discardTile.toString(),
          discardIndex,
          bestTile: bestScore.tile,
          gap,
          isOptimal: gap === 0,
        });
      }

      // 進捗表示
      if ((testNum + 1) % 100 === 0) {
        process.stdout.write(`✓ ${testNum + 1}/1000 完了\n`);
      }
    }

    stats.scoreStats.avgGap = (stats.scoreStats.totalGap / stats.totalProblems).toFixed(2);
    stats.correctDiscards = `${stats.correctDiscards} (${((stats.correctDiscards / 1000) * 100).toFixed(2)}%)`;

    return stats;
  }

  /**
   * 結果をプリント
   */
  printResults(stats) {
    console.log('\n' + '='.repeat(100));
    console.log('テスト結果サマリー');
    console.log('='.repeat(100) + '\n');

    console.log(`【全体統計】`);
    console.log(`  総問題数: ${stats.totalProblems}問`);
    console.log(`  最適解を選択: ${stats.correctDiscards}`);
    console.log(`  平均スコアギャップ: ${stats.scoreStats.avgGap}`);
    console.log(`  最小ギャップ: ${stats.scoreStats.minGap.toFixed(2)}`);
    console.log(`  最大ギャップ: ${stats.scoreStats.maxGap.toFixed(2)}`);

    console.log(`\n【削除牌の分類別集計】`);
    console.log(`  字牌 (honor):   ${stats.discardTileStats.byClass.honor}回`);
    console.log(`  老頭牌 (terminal): ${stats.discardTileStats.byClass.terminal}回`);
    console.log(`  標準牌 (standard): ${stats.discardTileStats.byClass.standard}回`);

    console.log(`\n【削除牌の数別集計】`);
    const numberStats = Object.entries(stats.discardTileStats.byNumber)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .slice(0, 10); // トップ10を表示
    numberStats.forEach(([num, count]) => {
      console.log(`  ${num || 'honor'}: ${count}回`);
    });

    console.log(`\n【サンプルケース（最初の3問）】\n`);
    stats.examples.slice(0, 3).forEach((ex, idx) => {
      console.log(`${idx + 1}. 問題${ex.number}`);
      console.log(`   手牌: ${ex.hand.join('、')}`);
      console.log(`   AI削除: ${ex.discardTile} vs 最高スコア: ${ex.bestTile}`);
      console.log(`   ギャップ: ${ex.gap.toFixed(2)} ${ex.isOptimal ? '✅' : ''}`);
      console.log();
    });

    if (stats.examples.some(e => e.gap > 100)) {
      console.log(`\n【大きなギャップがあるケース（スコア差>100）】\n`);
      stats.examples.filter(e => e.gap > 100).forEach((ex, idx) => {
        console.log(`${idx + 1}. 問題${ex.number}`);
        console.log(`   手牌: ${ex.hand.join('、')}`);
        console.log(`   AI削除: ${ex.discardTile} vs 最高スコア: ${ex.bestTile}`);
        console.log(`   ギャップ: ${ex.gap.toFixed(2)} ⚠️`);
        console.log();
      });
    }

    console.log('='.repeat(100));
    console.log('\n✅ テスト完了！詳細結果は以下を確認してください：');
    console.log('   - 結果JSON: test-results.json');
    console.log('   - 分析レポート: test-analysis-report.txt');
  }
}

// テスト実行
const tester = new ComprehensiveNaniKiriTester();
const startTime = Date.now();
const stats = tester.run1000Tests();
const endTime = Date.now();

tester.printResults(stats);

console.log(`\n処理時間: ${((endTime - startTime) / 1000).toFixed(2)}秒\n`);

// 結果をファイルに保存
const fs = require('fs');
const report = `
# 麻雀AI妥当性テストレポート

## テスト概要
- テスト日時: ${new Date().toISOString()}
- テスト問題数: 1000問
- 処理時間: ${((endTime - startTime) / 1000).toFixed(2)}秒

## 結果サマリー
- 最適解を選択率: ${stats.correctDiscards}
- 平均スコアギャップ: ${stats.scoreStats.avgGap}
- スコアギャップ範囲: ${stats.scoreStats.minGap.toFixed(2)} ～ ${stats.scoreStats.maxGap.toFixed(2)}

## 削除牌分析
- 字牌: ${stats.discardTileStats.byClass.honor}回
- 老頭牌: ${stats.discardTileStats.byClass.terminal}回
- 標準牌: ${stats.discardTileStats.byClass.standard}回

## 評価
${stats.correctDiscards === '1000 (100.00%)' 
  ? '✅ AIの判定は非常に妥当です。複合性スコアの評価が適切に機能しています。'
  : '⚠️ 改善の余地があります。スコアギャップが大きいケースを確認してください。'}
`;

fs.writeFileSync('./test-analysis-report.txt', report);
fs.writeFileSync('./test-results.json', JSON.stringify(stats, null, 2));

console.log('✅ レポートをファイルに保存しました');
