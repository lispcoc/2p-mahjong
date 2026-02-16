const GameRoom = require('./src/logic/GameRoom');
const fs = require('fs');
const path = require('path');

/**
 * CPU同士を決着まで戦わせるテスト
 * 潜在的な問題（無限ループ、手牌の枚数エラー、デッドロックなど）を検出する
 */

class CPUBattleTest {
  constructor(options = {}) {
    this.maxTurns = options.maxTurns || 300; // 最大ターン数（無限ループ防止）
    this.verbose = options.verbose !== undefined ? options.verbose : false; // 詳細ログ
    this.quiet = options.quiet !== undefined ? options.quiet : false; // 内部ログ抑制
    this.room = null;
    this.turnCount = 0;
    this.errors = [];
    this.warnings = [];
    this.logFile = options.logFile || null; // ログファイルのパス
    this.logStream = null;
    this.consoleOverrides = null;
    
    // ログファイルが指定されている場合、UTF-8で書き込み用のストリームを作成
    if (this.logFile) {
      this.logStream = fs.createWriteStream(this.logFile, { encoding: 'utf8', flags: 'w' });
    }

    if (this.quiet) {
      this.suppressConsoleLogs();
    }
  }
  
  // ログ出力（コンソールとファイルの両方）
  log(...args) {
    const message = args.join(' ');
    if (this.consoleOverrides) {
      this.consoleOverrides.originalLog(...args);
    } else {
      console.log(...args);
    }
    if (this.logStream) {
      this.logStream.write(message + '\n');
    }
  }

  // コンソールの詳細ログを抑制
  suppressConsoleLogs() {
    if (this.consoleOverrides) {
      return;
    }
    this.consoleOverrides = {
      originalLog: console.log,
      originalInfo: console.info,
      originalWarn: console.warn,
      originalDebug: console.debug,
    };
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
  }

  // コンソールのログ抑制を解除
  restoreConsoleLogs() {
    if (!this.consoleOverrides) {
      return;
    }
    console.log = this.consoleOverrides.originalLog;
    console.info = this.consoleOverrides.originalInfo;
    console.warn = this.consoleOverrides.originalWarn;
    console.debug = this.consoleOverrides.originalDebug;
    this.consoleOverrides = null;
  }
  
  // ログストリームを閉じる
  closeLog() {
    if (this.logStream) {
      this.logStream.end();
    }
    this.restoreConsoleLogs();
  }

  // 新しいゲームを開始
  startGame() {
    this.log('\n========================================')
    this.log('  CPU同士の自動対戦テスト開始');
    this.log('========================================\n');
    
    this.room = new GameRoom('cpuBattle', { testMode: true });
    this.turnCount = 0;
    this.errors = [];
    this.warnings = [];
    
    // 2人のCPUプレイヤーを追加
    this.room.addPlayer('cpu1', 'CPU-1', null, true);
    this.room.addPlayer('cpu2', 'CPU-2', null, true);
    
    this.log('✓ CPUプレイヤーを追加しました');
    this.log(`  - CPU-1 (cpu1)`);
    this.log(`  - CPU-2 (cpu2)`);
    
    // ゲーム開始
    this.room.start();
    this.log('✓ ゲームを開始しました');
    this.log('');
    
    return true;
  }

  // ゲーム状態をチェックして異常を検出
  checkGameState() {
    if (!this.room || !this.room.gameLogic) {
      return;
    }

    const playerIds = Array.from(this.room.players.keys());
    
    for (const pid of playerIds) {
      const player = this.room.gameLogic.players[pid];
      if (!player) continue;
      
      const hand = player.hand || [];
      const drawnTileIndex = player.drawnTileIndex;
      const melds = player.melds || [];
      const playerName = this.room.players.get(pid).playerName;
      
      // 手牌の枚数チェック
      const actualHandSize = hand.length;
      
      // ポン・チー後の場合は11枚または12枚の可能性がある
      const meldTiles = melds.reduce((sum, m) => {
        // meldsは配列の配列（各meldは直接タイル配列）
        if (m && Array.isArray(m)) {
          return sum + m.length;
        }
        return sum;
      }, 0);
      const totalTiles = actualHandSize + meldTiles;
      
      if (this.verbose) {
        this.log(`  [${playerName}] 手牌: ${actualHandSize}枚, 副露: ${meldTiles}枚 (${melds.length}個), 合計: ${totalTiles}枚`);
        if (melds.length > 0) {
          this.log(`    Melds詳細:`, melds.map(m => m ? m.length + '枚' : 'null'));
        }
      }
      
      // 合計が13枚または14枚でなければ異常
      if (totalTiles < 13 || totalTiles > 14) {
        const error = `異常な手牌枚数: ${playerName} - 手牌${actualHandSize}枚 + 副露${meldTiles}枚 = ${totalTiles}枚 (melds配列: ${melds.length}個, Turn: ${this.turnCount})`;
        this.errors.push(error);
        console.error(`❌ ${error}`);
        if (melds.length > 0) {
          console.error(`   Melds詳細:`, JSON.stringify(melds.map(m => m ? m.length : null)));
        }
      }
      
      // drawnTileIndexの整合性チェック
      if (drawnTileIndex >= hand.length) {
        const error = `異常なdrawnTileIndex: ${playerName} - drawnTileIndex=${drawnTileIndex}, hand.length=${hand.length} (Turn: ${this.turnCount})`;
        this.errors.push(error);
        console.error(`❌ ${error}`);
      }
    }
  }

  // 1ターンを実行
  async executeTurn() {
    return new Promise((resolve) => {
      if (this.room.status !== 'playing') {
        resolve(false);
        return;
      }
      
      this.turnCount++;
      
      if (this.verbose) {
        const currentTurn = this.room.gameLogic.getCurrentTurn();
        const currentPlayer = this.room.players.get(currentTurn);
        const wallCount = this.room.gameLogic.getWallCount();
        this.log(`\n--- Turn ${this.turnCount} ---`);
        this.log(`  現在のプレイヤー: ${currentPlayer?.playerName}`);
        this.log(`  残り牌: ${wallCount}枚`);
      }
      
      // ゲーム状態をチェック
      this.checkGameState();
      
      // 最大ターン数に達したら強制終了
      if (this.turnCount >= this.maxTurns) {
        const warning = `最大ターン数(${this.maxTurns})に達しました。ゲームを強制終了します。`;
        this.warnings.push(warning);
        this.log(`⚠️  ${warning}`);
        resolve(false);
        return;
      }
      
      // CPUに行動させる
      this.room.executeCPUTurn(() => {
        // 次のターンまで少し待機
        setTimeout(() => {
          resolve(true);
        }, 10);
      });
    });
  }

  // ゲーム終了まで実行
  async runUntilFinish() {
    this.startGame();
    
    let canContinue = true;
    while (canContinue && this.room.status === 'playing') {
      canContinue = await this.executeTurn();
      
      // エラーが発生したら中断
      if (this.errors.length > 0) {
        this.log('\n❌ エラーが検出されたため、テストを中断します。');
        break;
      }
    }
    
    // 結果を表示
    this.showResults();
  }

  // テスト結果を表示
  showResults() {
    this.log('\n========================================')
    this.log('  テスト結果');
    this.log('========================================\n');
    
    this.log(`総ターン数: ${this.turnCount}`);
    this.log(`ゲーム状態: ${this.room.status}`);
    
    if (this.room.status === 'finished') {
      const winner = this.room.getWinner();
      if (winner) {
        const winnerName = this.room.players.get(winner)?.playerName || winner;
        this.log(`\n🎉 勝者: ${winnerName}`);
      } else {
        this.log(`\n🏁 流局`);
      }
      
      const scores = this.room.getScores();
      this.log('\n最終スコア:');
      Object.entries(scores).forEach(([name, score]) => {
        this.log(`  ${name}: ${score}点`);
      });
    }
    
    // エラーと警告を表示
    if (this.errors.length > 0) {
      this.log('\n❌ エラー:');
      this.errors.forEach((err, i) => {
        this.log(`  ${i + 1}. ${err}`);
      });
    } else {
      this.log('\n✅ エラーは検出されませんでした');
    }
    
    if (this.warnings.length > 0) {
      this.log('\n⚠️  警告:');
      this.warnings.forEach((warn, i) => {
        this.log(`  ${i + 1}. ${warn}`);
      });
    }
    
    // 最終判定
    this.log('\n========================================')
    if (this.errors.length === 0 && this.room.status === 'finished') {
      this.log('✅ テスト成功: ゲームは正常に完了しました');
    } else if (this.errors.length === 0) {
      this.log('⚠️  テスト完了: エラーはありませんが、ゲームは未完了です');
    } else {
      this.log('❌ テスト失敗: エラーが検出されました');
    }
    this.log('========================================\n');
    
    this.closeLog();
  }

  // 複数回実行
  async runMultiple(count) {
    this.log(`\n${'='.repeat(50)}`);
    this.log(`  ${count}回の自動対戦テストを実行します`);
    this.log(`${'='.repeat(50)}\n`);
    
    const results = {
      total: count,
      success: 0,
      failed: 0,
      incomplete: 0,
      draws: 0,
      totalTurns: 0,
      totalWinPoints: 0,
      winCount: 0,
      errors: [],
      warnings: [],
    };
    
    for (let i = 0; i < count; i++) {
      this.log(`\n【第${i + 1}回目】`);
      this.startGame();
      
      let canContinue = true;
      while (canContinue && this.room.status === 'playing') {
        canContinue = await this.executeTurn();
        
        if (this.errors.length > 0) {
          this.log('\n❌ エラー検出により中断');
          break;
        }
      }
      
      results.totalTurns += this.turnCount;
      
      if (this.errors.length > 0) {
        results.failed++;
        results.errors.push(...this.errors);
      } else if (this.room.status === 'finished') {
        results.success++;
        const winner = this.room.getWinner();
        if (winner) {
          const winScore = this.room.lastResult?.scoreResult?.score || 0;
          results.totalWinPoints += winScore;
          results.winCount++;
          this.log(`✅ 第${i + 1}回目終了: ${this.turnCount}ターン (和了 ${winScore}点)`);
        } else {
          results.draws++;
          this.log(`✅ 第${i + 1}回目終了: ${this.turnCount}ターン (流局)`);
        }
      } else {
        results.incomplete++;
      }
      
      results.warnings.push(...this.warnings);
    }
    
    // 総合結果
    this.log('\n' + '='.repeat(50));
    this.log('  総合結果');
    this.log('='.repeat(50));
    this.log(`総テスト数: ${results.total}`);
    this.log(`成功: ${results.success}`);
    this.log(`失敗: ${results.failed}`);
    this.log(`未完了: ${results.incomplete}`);
    this.log(`流局: ${results.draws}`);
    this.log(`平均ターン数: ${(results.totalTurns / results.total).toFixed(1)}`);
    const drawRate = results.total > 0 ? (results.draws / results.total) * 100 : 0;
    this.log(`流局率: ${drawRate.toFixed(1)}%`);
    const avgWinPoints = results.winCount > 0 ? (results.totalWinPoints / results.winCount) : 0;
    this.log(`平均打点: ${avgWinPoints.toFixed(0)}点`);
    
    if (results.errors.length > 0) {
      this.log(`\n❌ 検出されたエラー数: ${results.errors.length}`);
      // 重複を除いたエラーを表示
      const uniqueErrors = [...new Set(results.errors)];
      uniqueErrors.forEach((err, i) => {
        this.log(`  ${i + 1}. ${err}`);
      });
    } else {
      this.log('\n✅ エラーは検出されませんでした');
    }
    
    if (results.warnings.length > 0) {
      this.log(`\n⚠️  警告数: ${results.warnings.length}`);
    }
    
    this.log('='.repeat(50) + '\n');
    
    this.closeLog();
    
    return results;
  }
}

// テスト実行
if (require.main === module) {
  // コマンドライン引数で実行回数とログファイルを指定できる
  const args = process.argv.slice(2);
  let count = 1;
  let logFile = null;
  let quiet = false;
  let verbose = false;

  args.forEach((arg) => {
    if (arg === '--quiet' || arg === '--silent') {
      quiet = true;
      return;
    }
    if (arg === '--verbose') {
      verbose = true;
      return;
    }
    if (/^\d+$/.test(arg) && count === 1) {
      count = parseInt(arg, 10);
      return;
    }
    if (!logFile && !arg.startsWith('--')) {
      logFile = arg;
    }
  });
  
  const test = new CPUBattleTest({
    maxTurns: 300,
    verbose: verbose, // trueにすると詳細ログを出力
    quiet: quiet, // trueにすると内部ログを抑制
    logFile: logFile, // ログファイルのパス（UTF-8で保存される）
  });
  
  if (count > 1) {
    test.runMultiple(count).catch(console.error);
  } else {
    test.runUntilFinish().catch(console.error);
  }
}

module.exports = CPUBattleTest;
