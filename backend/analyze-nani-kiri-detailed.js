#!/usr/bin/env node

const AIPlayer = require('./src/logic/AIPlayer');
const Tile = require('./src/logic/Tile');

class DetailedNaniKiriAnalyzer {
  constructor() {
    this.ai = new AIPlayer();
    this.suits = ['man', 'pin', 'sou'];
  }

  /**
   * 削除結果を詳細に分析
   */
  analyzeDiscard(hand) {
    const discardIndex = this.ai.chooseDiscard(hand, hand.length - 1);
    const discardTile = hand[discardIndex];

    // すべての牌のスコアを計算
    const allTiles = hand.map((tile, idx) => {
      const handWithout = hand.slice();
      handWithout.splice(idx, 1);

      const combination = this.ai.evaluateCombinationPotential(handWithout, tile);
      const isolation = this.ai.evaluateTileIsolation(handWithout, tile);
      const ryanmen = tile.suit !== 'honor' && tile.number >= 2 && tile.number <= 8 
        ? this.ai.evaluateRyanmenEfficiency(handWithout, tile)
        : 0;
      const tileEff = isolation * 80 + combination * 3.0 + ryanmen * 1.2;
      const danger = this.ai.evaluateDanger(tile, {});
      const shape = this.ai.evaluateHandShape(handWithout);
      const totalScore = tileEff * 3.0 + danger + shape * 1.5;

      return {
        index: idx,
        tile: tile.toString(),
        tileClass: this.ai.classifyTile(tile),
        combination,
        isolation,
        ryanmen,
        tileEff,
        danger,
        shape,
        totalScore,
        isDiscarded: idx === discardIndex,
      };
    });

    // スコアでソート
    allTiles.sort((a, b) => b.totalScore - a.totalScore);

    return {
      hand: hand.map(t => t.toString()),
      discardIndex,
      discardTile: discardTile.toString(),
      allTiles,
      topDispcard: allTiles[0],
    };
  }

  /**
   * 複合性スコアの観点から妥当性を判定
   */
  isValidFromCombinationView(analysis) {
    // 削除された牌が複合性スコアで最小（最も負が大きい）であるか
    const discardedTile = analysis.allTiles.find(t => t.isDiscarded);
    const bestTile = analysis.allTiles[0];

    if (discardedTile.combination > bestTile.combination - 50) {
      // 複合性スコアで大きく差がない場合は妥当
      return true;
    }
    return false;
  }

  /**
   * 100問の詳細分析を実行
   */
  analyze100Problems() {
    console.log('\n何切る問題詳細分析（100問）\n');
    console.log('='.repeat(100));

    const results = {
      validDiscards: 0,
      borderlineDiscards: 0,
      invalidDiscards: 0,
      problems: [],
    };

    for (let i = 0; i < 100; i++) {
      // ランダムな手を生成
      const hand = this.generateRandomHand();
      const analysis = this.analyzeDiscard(hand);

      const isValid = this.isValidFromCombinationView(analysis);

      if (isValid) {
        results.validDiscards++;
      } else {
        // 微妙なケースかコンプリート妥当でないか判定
        const diff = analysis.allTiles[0].totalScore - analysis.allTiles.find(t => t.isDiscarded).totalScore;
        if (diff < 100) {
          results.borderlineDiscards++;
        } else {
          results.invalidDiscards++;
          if (results.problems.length < 20) {
            results.problems.push({
              number: i + 1,
              analysis,
              diff,
            });
          }
        }
      }
    }

    return results;
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
   * 結果をプリント
   */
  printResults(results) {
    console.log('\n' + '='.repeat(100));
    console.log('テスト結果');
    console.log('='.repeat(100) + '\n');

    console.log(`適切な削除: ${results.validDiscards} (${(results.validDiscards).toFixed(1)}%)`);
    console.log(`微妙な削除: ${results.borderlineDiscards} (${(results.borderlineDiscards).toFixed(1)}%)`);
    console.log(`不適切な削除: ${results.invalidDiscards} (${(results.invalidDiscards).toFixed(1)}%)`);

    if (results.problems.length > 0) {
      console.log('\n【不適切な削除の例（詳細分析）】\n');
      results.problems.slice(0, 5).forEach((prob, idx) => {
        const analysis = prob.analysis;
        console.log(`\n${idx + 1}. 問題${prob.number}`);
        console.log(`手牌: ${analysis.hand.join('、')}`);
        console.log(`\n削除された牌: ${analysis.discardTile}`);
        console.log(`最善の削除候補: ${analysis.topDispcard.tile}`);
        console.log(`スコア差: ${prob.diff.toFixed(0)}`);

        console.log('\n上位5つの削除候補:');
        analysis.allTiles.slice(0, 5).forEach((tile, tidx) => {
          console.log(
            `${tidx + 1}. ${tile.tile.padEnd(3)} (${tile.tileClass.padEnd(8)}) ` +
            `複合性:${tile.combination.toFixed(0).padStart(4)} × 3.0 = ${(tile.combination * 3.0).toFixed(0).padStart(4)} ` +
            `[総スコア:${tile.totalScore.toFixed(0).padStart(5)}]` +
            (tile.isDiscarded ? ' ← 削除対象' : '')
          );
        });
        console.log();
      });
    }

    console.log('='.repeat(100));
  }
}

const analyzer = new DetailedNaniKiriAnalyzer();
const results = analyzer.analyze100Problems();
analyzer.printResults(results);
