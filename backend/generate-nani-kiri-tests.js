#!/usr/bin/env node

const AIPlayer = require('./src/logic/AIPlayer');
const Tile = require('./src/logic/Tile');

class NaniKiriTestGenerator {
  constructor() {
    this.ai = new AIPlayer();
    this.suits = ['man', 'pin', 'sou'];
    this.testResults = [];
  }

  /**
   * ランダムなタイルを生成
   */
  generateRandomTile() {
    const suit = this.suits[Math.floor(Math.random() * this.suits.length)];
    let number;
    if (suit === 'honor') {
      number = Math.floor(Math.random() * 7) + 1;
    } else {
      number = Math.floor(Math.random() * 9) + 1;
    }
    return new Tile(suit, number);
  }

  /**
   * 手牌を生成（複合性の程度を指定）
   * complexity: 'high' | 'medium' | 'low'
   */
  generateHand(complexity = 'medium') {
    const hand = [];

    if (complexity === 'high') {
      // 複合性が高い手：多くのスーツに複数の牌
      // パターン：順子複数
      hand.push(new Tile('man', 2));
      hand.push(new Tile('man', 3));
      hand.push(new Tile('man', 4));
      hand.push(new Tile('man', 5));

      hand.push(new Tile('pin', 4));
      hand.push(new Tile('pin', 5));
      hand.push(new Tile('pin', 6));

      hand.push(new Tile('sou', 7));
      hand.push(new Tile('sou', 8));
      hand.push(new Tile('sou', 9));

      // 孤立牌を追加
      hand.push(new Tile('honor', 1));
      hand.push(new Tile('honor', 5));
      hand.push(new Tile('honor', 5));
    } else if (complexity === 'medium') {
      // 中程度の複合性
      hand.push(new Tile('man', 3));
      hand.push(new Tile('man', 4));
      hand.push(new Tile('man', 5));

      hand.push(new Tile('pin', 5));
      hand.push(new Tile('pin', 5));
      hand.push(new Tile('pin', 6));

      hand.push(new Tile('sou', 2));
      hand.push(new Tile('sou', 3));
      hand.push(new Tile('honor', 1));
      hand.push(new Tile('honor', 2));
      hand.push(new Tile('honor', 5));
      hand.push(new Tile('honor', 5));
    } else {
      // 低い複合性：孤立が多い
      hand.push(new Tile('man', 1));
      hand.push(new Tile('man', 5));
      hand.push(new Tile('man', 9));

      hand.push(new Tile('pin', 2));
      hand.push(new Tile('pin', 8));

      hand.push(new Tile('sou', 1));
      hand.push(new Tile('sou', 4));
      hand.push(new Tile('sou', 9));

      hand.push(new Tile('honor', 1));
      hand.push(new Tile('honor', 2));
      hand.push(new Tile('honor', 3));
      hand.push(new Tile('honor', 5));
    }

    // ツモ牌を追加
    const drawnTile = this.generateRandomTile();
    hand.push(drawnTile);

    return hand;
  }

  /**
   * 削除結果が妥当かどうかを判定
   */
  isValidDiscard(hand, discardIndex) {
    const discardedTile = hand[discardIndex];

    // 複合可能性を評価
    const handWithout = hand.slice();
    handWithout.splice(discardIndex, 1);
    const combination = this.ai.evaluateCombinationPotential(handWithout, discardedTile);
    const isolation = this.ai.evaluateTileIsolation(handWithout, discardedTile);

    // 妥当性チェック
    const checks = {
      // テンパイ状態かつテンパイを破壊していない
      tenpaiNotBroken: true,
      // 複合性が最も低い牌を削除
      lowestCombination: true,
      // 孤立度が高い牌を優先
      isolationPriority: true,
      // 老頭牌や字牌を優先的に削除
      terminalsFirst: true,
    };

    // 複合性スコア：負が大きいほど保持すべき
    const allCombinations = hand.map((tile, i) => {
      const hw = hand.slice();
      hw.splice(i, 1);
      return {
        index: i,
        combination: this.ai.evaluateCombinationPotential(hw, tile),
        isolation: this.ai.evaluateTileIsolation(hw, tile),
        tileClass: this.ai.classifyTile(tile),
      };
    });

    // 複合性が最も低い（負が最小）かチェック
    const minCombination = Math.min(...allCombinations.map(c => c.combination));
    const withMinCombination = allCombinations.filter(c => c.combination === minCombination);

    // 複合性が最小の牌が削除されているか
    checks.lowestCombination = withMinCombination.some(c => c.index === discardIndex);

    // 孤立度も考慮：孤立度が高い場合は優先
    const maxIsolation = this.ai.evaluateTileIsolation(handWithout, discardedTile);
    if (maxIsolation > 0.5) {
      checks.isolationPriority = true; // 孤立した牌を削除
    }

    return checks;
  }

  /**
   * 単一の何切る問題を評価
   */
  evaluateSingleProblem(hand) {
    const discardIndex = this.ai.chooseDiscard(hand, hand.length - 1);
    const discardTile = hand[discardIndex];
    const checks = this.isValidDiscard(hand, discardIndex);

    return {
      hand: hand.map(t => t.toString()),
      discardIndex,
      discardTile: discardTile.toString(),
      tileClass: this.ai.classifyTile(discardTile),
      valid: checks.lowestCombination, // 簡略化：複合性が最小なら妥当
      checks,
    };
  }

  /**
   * N個の何切る問題を生成・評価
   */
  generateAndEvaluate(count = 100) {
    console.log(`\n何切る問題生成テスト（${count}問）\n`);
    console.log('='.repeat(80));

    const complexities = ['high', 'medium', 'low'];
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      byComplexity: {
        high: { total: 0, valid: 0 },
        medium: { total: 0, valid: 0 },
        low: { total: 0, valid: 0 },
      },
      examples: [],
    };

    for (let i = 0; i < count; i++) {
      const complexity = complexities[i % 3];
      const hand = this.generateHand(complexity);
      const result = this.evaluateSingleProblem(hand);

      results.total++;
      results.byComplexity[complexity].total++;

      if (result.valid) {
        results.valid++;
        results.byComplexity[complexity].valid++;
      } else {
        results.invalid++;
      }

      // 異常なケースをサンプル記録
      if (!result.valid && results.examples.length < 10) {
        results.examples.push({
          number: i + 1,
          complexity,
          ...result,
        });
      }

      // 進捗表示
      if ((i + 1) % 100 === 0) {
        process.stdout.write(`✓ ${i + 1}問処理完了\n`);
      }
    }

    return results;
  }

  /**
   * 結果をレポート出力
   */
  printReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('テスト結果サマリー');
    console.log('='.repeat(80));

    const validRate = ((results.valid / results.total) * 100).toFixed(2);
    console.log(`\n総問題数: ${results.total}`);
    console.log(`妥当な判定: ${results.valid} (${validRate}%)`);
    console.log(`不妥当な判定: ${results.invalid}`);

    console.log('\n【複合性別の結果】\n');
    Object.entries(results.byComplexity).forEach(([complexity, data]) => {
      const rate = ((data.valid / data.total) * 100).toFixed(2);
      console.log(`${complexity.toUpperCase().padEnd(8)}: ${data.valid}/${data.total} (${rate}%)`);
    });

    if (results.examples.length > 0) {
      console.log('\n【不妥当な判定の例（最初の10個）】\n');
      results.examples.forEach((ex, idx) => {
        console.log(`${idx + 1}. 問題${ex.number}（複合性: ${ex.complexity}）`);
        console.log(`   手牌: ${ex.hand.join('、')}`);
        console.log(`   削除牌: ${ex.discardTile} (${ex.tileClass})`);
        console.log(`   複合性: ${ex.checks.lowestCombination ? '×' : '✓'}`);
        console.log();
      });
    }

    console.log('='.repeat(80));
  }
}

// テスト実行
const tester = new NaniKiriTestGenerator();
const results = tester.generateAndEvaluate(1000);
tester.printReport(results);

// 結果をファイルに保存
const fs = require('fs');
fs.writeFileSync(
  './test-results.json',
  JSON.stringify(results, null, 2)
);
console.log('\n詳細結果を test-results.json に保存しました');
