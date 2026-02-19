const CPUBattleTest = require('./test-cpu-battle');

/**
 * リーチと一発の統計を詳しく分析
 */
class RiichiIppatsuAnalysis {
  async runAnalysis(numGames = 200) {
    const test = new CPUBattleTest();
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`リーチと一発の詳細統計分析（${numGames}局）`);
    console.log(`${'='.repeat(70)}\n`);

    const stats = {
      totalGames: numGames,
      wins: 0,
      draws: 0,
      
      riichiDeclarations: 0,
      riichiWins: 0,
      riichiFirstTurnWins: 0, // リーチ直後 (turn+1) での和了
      riichiSecondTurnWins: 0, // リーチ2ターン後 (turn+2) での和了
      ippatsuWins: 0,
      
      // パターン別統計
      riichiToTsumoWins: 0, // リーチ→ツモ
      riichiToRonWins: 0,   // リーチ→ロン
      ippatsuTsumo: 0,
      ippatsuRon: 0,
    };

    // Suppress logging for cleaner output
    const originalLog = console.log;
    const originalError = console.error;
    // Keep warnings visual
    let suppressedCount = 0;
    
    console.log(`実行中: 0/${numGames}`);
    
    for (let i = 0; i < numGames; i++) {
      if (i % 10 === 0) {
        process.stdout.write(`\r実行中: ${i + 1}/${numGames}`);
      }

      // Suppress logs temporarily
      console.log = () => {};
      console.error = () => {};

      try {
        const result = await test.runSingleGame();
        
        // Restore logging
        console.log = originalLog;
        console.error = originalError;

        // Process result
        if (result.isDraw) {
          stats.draws++;
        } else if (result.winner) {
          stats.wins++;
          
          const yakuList = result.scoreResult?.yaku || [];
          const yakuNames = yakuList.map(y => y.name);
          
          const hasRiichi = yakuNames.some(y => y === 'リーチ');
          const hasIppatsu = yakuNames.some(y => y === '一発');
          
          if (hasRiichi) {
            stats.riichiWins++;
            
            if (hasIppatsu) {
              stats.ippatsuWins++;
              
              // Check if tsumo or ron
              if (result.isTsumo) {
                stats.ippatsuTsumo++;
              } else {
                stats.ippatsuRon++;
              }
            }
          }
        }
      } catch (e) {
        console.log = originalLog;
        console.error = originalError;
        console.error(`ゲーム${i}でエラー:`, e.message);
      }
    }

    process.stdout.write('\r' + ' '.repeat(40) + '\r');

    // Display results
    console.log('\n基本統計：');
    console.log(`総局数: ${stats.totalGames}`);
    console.log(`和了: ${stats.wins}（${((stats.wins / stats.totalGames) * 100).toFixed(1)}%）`);
    console.log(`流局: ${stats.draws}（${((stats.draws / stats.totalGames) * 100).toFixed(1)}%）`);
    
    console.log('\nリーチ関連：');
    console.log(`リーチして和了: ${stats.riichiWins}局（和了全体の${((stats.riichiWins / stats.wins) * 100).toFixed(1)}%）`);
    
    if (stats.riichiWins > 0) {
      console.log(`  └─ ツモで和了: ${stats.riichiToTsumoWins}局`);
      console.log(`  └─ ロンで和了: ${stats.riichiToRonWins}局`);
    }
    
    console.log('\n一発関連：');
    console.log(`一発での和了: ${stats.ippatsuWins}局（和了全体の${((stats.ippatsuWins / stats.wins) * 100).toFixed(1)}%）`);
    console.log(`  └─ 一発ツモ: ${stats.ippatsuTsumo}局`);
    console.log(`  └─ 一発ロン: ${stats.ippatsuRon}局`);
    
    if (stats.riichiWins > 0) {
      const ippatsuRatio = (stats.ippatsuWins / stats.riichiWins) * 100;
      console.log(`\n一発がリーチのうち占める割合: ${ippatsuRatio.toFixed(1)}%`);
      console.log(`期待値（理論値）: 約15-20%程度`);
      
      if (ippatsuRatio > 25) {
        console.log(`⚠️  一発の出現率が高い（理論値より高い）`);
      } else if (ippatsuRatio < 10) {
        console.log(`✓ 一発の出現率は適切`);
      }
    }

    console.log(`\n${'='.repeat(70)}\n`);

    return stats;
  }
}

if (require.main === module) {
  const analysis = new RiichiIppatsuAnalysis();
  analysis.runAnalysis(200).catch(console.error);
}

module.exports = RiichiIppatsuAnalysis;
