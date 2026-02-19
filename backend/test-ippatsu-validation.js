const GameRoom = require('./src/logic/GameRoom');

/**
 * 一発の出現率と妥当性を検証するテスト
 */

class IppatsuValidationTest {
  async runTests(count = 500) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`一発の出現率検証テスト（${count}局）`);
    console.log(`${'='.repeat(60)}\n`);

    const stats = {
      total: count,
      draws: 0,
      successGames: 0,
      riichiGames: 0,
      ippatsuGames: 0,
      riichiWinGames: 0, // リーチして和了した局数
      ippatsuWinGames: 0, // 一発で和了した局数
    };

    for (let i = 0; i < count; i++) {
      if (i % 50 === 0) {
        process.stdout.write(`\r進行中: ${i}/${count}`);
      }

      const room = new GameRoom(`test_${i}`, { testMode: true });
      room.addPlayer('cpu1', 'CPU-1', null, true);
      room.addPlayer('cpu2', 'CPU-2', null, true);
      room.start();

      let canContinue = true;
      while (canContinue && room.status === 'playing') {
        room.executeCPUTurn(() => {
          // 同期実行
        });

        if (room.status !== 'playing') {
          canContinue = false;
        }
      }

      // 結果を集計
      const roundHistory = room.getRoundHistory();
      if (roundHistory.length > 0) {
        const lastRound = roundHistory[roundHistory.length - 1];
        
        if (lastRound.isDraw) {
          stats.draws++;
        } else if (lastRound.winner) {
          stats.successGames++;
          
          // リーチ含有有無を判定
          const hasRiichi = lastRound.scoreResult?.yaku?.some(y => y.name === 'リーチ');
          const hasIppatsu = lastRound.scoreResult?.yaku?.some(y => y.name === '一発');
          
          if (hasRiichi) {
            stats.riichiWinGames++;
          }
          
          if (hasIppatsu) {
            stats.ippatsuWinGames++;
          }
        }
      }
    }

    process.stdout.write('\r' + ' '.repeat(50) + '\r');

    // 結果を表示
    console.log('\n結果：');
    console.log(`総局数: ${stats.total}`);
    console.log(`流局: ${stats.draws}（${((stats.draws / stats.total) * 100).toFixed(1)}%）`);
    console.log(`和了: ${stats.successGames}（${((stats.successGames / stats.total) * 100).toFixed(1)}%）`);
    console.log('');
    console.log('リーチ関連統計：');
    console.log(`リーチして和了: ${stats.riichiWinGames}局`);
    console.log(`一発で和了: ${stats.ippatsuWinGames}局`);
    
    if (stats.riichiWinGames > 0) {
      const ippatsuRate = (stats.ippatsuWinGames / stats.riichiWinGames) * 100;
      console.log(`リーチのうち一発の割合: ${ippatsuRate.toFixed(1)}%`);
    }
    
    if (stats.successGames > 0) {
      const ippatsuInAllWin = (stats.ippatsuWinGames / stats.successGames) * 100;
      console.log(`全和了のうち一発の割合: ${ippatsuInAllWin.toFixed(1)}%`);
    }

    console.log(`\n${'='.repeat(60)}\n`);

    return stats;
  }
}

// テスト実行
if (require.main === module) {
  const test = new IppatsuValidationTest();
  test.runTests(500).catch(console.error);
}

module.exports = IppatsuValidationTest;
