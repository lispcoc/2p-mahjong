const GameRoom = require('../src/logic/GameRoom');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * CPU同士を決着まで戦わせるテスト
 * 潜在的な問題（無限ループ、手牌の枚数エラー、デッドロックなど）を検出する
 */

class CPUBattleTest {
  constructor(options = {}) {
    this.maxTurns = options.maxTurns || 300; // 最大ターン数（無限ループ防止）
    this.verbose = options.verbose !== undefined ? options.verbose : false; // 詳細ログ
    this.quiet = options.quiet !== undefined ? options.quiet : false; // 内部ログ抑制
    this.summaryOnly = options.summaryOnly !== undefined ? options.summaryOnly : false; // 局の結果のみ表示
    this.progress = options.progress !== undefined ? options.progress : false; // プログレッシブ進行度表示
    this.parallel = options.parallel !== undefined ? options.parallel : false; // 並列実行モード
    this.concurrency = options.concurrency || Math.max(2, Math.floor(os.cpus().length / 2)); // 並列度（デフォルトはCPUコア数の半分）
    this.room = null;
    this.turnCount = 0;
    this.errors = [];
    this.warnings = [];
    this.logFile = options.logFile || null; // ログファイルのパス
    this.logStream = null;
    this.consoleOverrides = null;
    this.yakuStats = {}; // 役の統計情報
    
    // ログファイルが指定されている場合、UTF-8で書き込み用のストリームを作成
    if (this.logFile) {
      this.logStream = fs.createWriteStream(this.logFile, { encoding: 'utf8', flags: 'w' });
    }

    // progressモード、summaryOnlyモード、quietモードではログ抑制を有効にする
    if (this.progress || this.summaryOnly || this.quiet) {
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
    if (!this.summaryOnly && !this.progress) {
      this.log('\n========================================')
      this.log('  CPU同士の自動対戦テスト開始');
      this.log('========================================\n');
    }
    
    this.room = new GameRoom('cpuBattle', { testMode: true });
    this.turnCount = 0;
    this.errors = [];
    this.warnings = [];
    
    // 2人のCPUプレイヤーを追加
    this.room.addPlayer('cpu1', 'CPU-1', null, true);
    this.room.addPlayer('cpu2', 'CPU-2', null, true);
    
    if (!this.summaryOnly && !this.progress) {
      this.log('✓ CPUプレイヤーを追加しました');
      this.log(`  - CPU-1 (cpu1)`);
      this.log(`  - CPU-2 (cpu2)`);
    }
    
    // ゲーム開始
    this.room.start();
    
    if (!this.summaryOnly && !this.progress) {
      this.log('✓ ゲームを開始しました');
      this.log('');
    }
    
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
    if (!this.summaryOnly) {
      this.log('\n========================================')
      this.log('  テスト結果');
      this.log('========================================\n');
      
      this.log(`総ターン数: ${this.turnCount}`);
      this.log(`ゲーム状態: ${this.room.status}`);
    }
    
    if (this.room.status === 'finished') {
      const winner = this.room.getWinner();
      if (this.summaryOnly) {
        // summaryOnlyモード：局の結果のみを簡潔に表示
        if (winner) {
          const winnerName = this.room.players.get(winner)?.playerName || winner;
          this.log(`🎉 ${this.turnCount}ターン - 勝者: ${winnerName}`);
        } else {
          this.log(`🏁 ${this.turnCount}ターン - 流局`);
        }
      } else {
        // 通常モード：詳細情報を表示
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
      
      if (!this.summaryOnly) {
        // 局の詳細結果を表示
        this.log('\n========================================');
        this.log('  局の結果詳細（ドラ確認）');
        this.log('========================================\n');
      } else {
        // summaryOnlyモード：局の結果をコンパクトに表示
        this.log('');
      }
      
      const roundHistory = this.room.getRoundHistory();
      roundHistory.forEach((roundResult, idx) => {
        const roundNum = idx + 1;
        if (this.summaryOnly) {
          // summaryOnlyモード：１行表示
          const resultLine = `【第${roundNum}局】 ${roundResult.roundName} ${roundResult.roundNumber}局 - ${roundResult.winType}`;
          
          if (roundResult.scoreResult && roundResult.scoreResult.valid) {
            const sr = roundResult.scoreResult;
            const yaku = sr.yaku.map(y => y.name).join(',');
            const doraYaku = sr.yaku.filter(y => y.isDora);
            const doraStr = doraYaku.length > 0 
              ? ` | 💎 ${doraYaku.map(y => `${y.name}(${y.han}翻)`).join(',')}` 
              : '';
            this.log(`${resultLine} | ${yaku} | ${sr.han}翻 | ${sr.score}点${doraStr}`);
          } else if (roundResult.isDraw) {
            this.log(`${resultLine}`);
          } else {
            this.log(`${resultLine}`);
          }
        } else {
          // 通常モード：詳細表示
          this.log(`【第${roundNum}局】 ${roundResult.roundName} ${roundResult.roundNumber}局`);
          this.log(`  結果: ${roundResult.winType}`);
          
          if (roundResult.winner) {
            const winnerName = this.room.players.get(roundResult.winner)?.playerName || roundResult.winner;
            this.log(`  勝者: ${winnerName}`);
          }
          
          // スコア結果の詳細を表示
          if (roundResult.scoreResult && roundResult.scoreResult.valid) {
            const sr = roundResult.scoreResult;
            this.log(`  役: ${sr.yaku.map(y => y.name).join(', ')}`);
            
            // ドラを含むかチェック
            const doraYaku = sr.yaku.filter(y => y.isDora);
            if (doraYaku.length > 0) {
              this.log(`  💎 ドラあり: ${doraYaku.map(y => `${y.name}(${y.han}翻)`).join(', ')}`);
            }
            
            this.log(`  翻数: ${sr.han}翻`);
            if (sr.fu) {
              this.log(`  符: ${sr.fu}符`);
            }
            this.log(`  得点: ${sr.score}点`);
          } else if (roundResult.isDraw) {
            // 流局の場合
            if (roundResult.tenpai && Object.keys(roundResult.tenpai).length > 0) {
              const tenpaiPlayers = Object.entries(roundResult.tenpai)
                .filter(([_, isTenpai]) => isTenpai)
                .map(([playerId, _]) => this.room.players.get(playerId)?.playerName || playerId);
              if (tenpaiPlayers.length > 0) {
                this.log(`  天和: ${tenpaiPlayers.join(', ')}`);
              }
            }
          }
          
          // ドラ表示牌情報をゲーム開始時に取得して表示
          if (idx === 0) {
            const gameState = this.room.getGameState();
            if (gameState && gameState.dora) {
              this.log(`\n  【ドラ表示牌】`);
              if (gameState.dora.indicators && gameState.dora.indicators.length > 0) {
                const doraIndicators = gameState.dora.indicators.map(d => d.display).join(', ');
                this.log(`  表: ${doraIndicators}`);
              }
              if (gameState.dora.tiles && gameState.dora.tiles.length > 0) {
                const doraTiles = gameState.dora.tiles.map(d => d.display).join(', ');
                this.log(`  実ドラ: ${doraTiles}`);
              }
            }
          }
          
          this.log('');
        }
      });
    }
    
    // エラーと警告を表示
    if (!this.summaryOnly) {
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
    } else {
      // summaryOnlyモード：エラーがある場合のみ表示
      if (this.errors.length > 0) {
        this.log('\n❌ エラー検出:');
        this.errors.forEach((err) => {
          this.log(`  - ${err}`);
        });
      }
    }
    
    this.closeLog();
  }

  // 役の統計情報をリセット
  resetYakuStats() {
    this.yakuStats = {};
  }

  // 役の統計に追加
  addToYakuStats(yaku) {
    if (!yaku || !Array.isArray(yaku)) return;
    yaku.forEach(y => {
      const yakuName = y.name;
      if (!this.yakuStats[yakuName]) {
        this.yakuStats[yakuName] = { name: yakuName, count: 0, han: y.han, isDora: y.isDora || false };
      }
      this.yakuStats[yakuName].count++;
    });
  }

  // プログレッシブ進行度バーを表示
  showProgressBar(current, total) {
    if (!this.progress) return;
    const barLength = 30;
    const percentage = current / total;
    const filledLength = Math.round(barLength * percentage);
    const bar = '='.repeat(filledLength) + '-'.repeat(barLength - filledLength);
    const progressStr = `進行中: [${bar}] ${current}/${total} 局`;
    process.stdout.write('\r' + progressStr);
  }

  // 単一のゲームを実行（独立した状態で実行）
  async runSingleGame(gameIndex) {
    if (!this.summaryOnly && !this.progress) {
      this.log(`\n【第${gameIndex + 1}回目】`);
    }
    
    // 各ゲーム実行のための局所的な状態を作成
    const localRoom = new GameRoom(`cpuBattle_${gameIndex}`, { testMode: true });
    const localTurnCount = { value: 0 };
    const localErrors = [];
    const localWarnings = [];
    
    // CPUプレイヤーを追加
    localRoom.addPlayer('cpu1', 'CPU-1', null, true);
    localRoom.addPlayer('cpu2', 'CPU-2', null, true);
    
    // ゲーム開始
    localRoom.start();
    
    // ゲーム実行ループ
    let canContinue = true;
    while (canContinue && localRoom.status === 'playing') {
      localTurnCount.value++;
      
      // 最大ターン数に達したら強制終了
      if (localTurnCount.value >= this.maxTurns) {
        localWarnings.push(`最大ターン数(${this.maxTurns})に達しました。ゲームを強制終了します。`);
        break;
      }
      
      // ゲーム状態チェック（エラー検出）
      const playerIds = Array.from(localRoom.players.keys());
      for (const pid of playerIds) {
        const player = localRoom.gameLogic.players[pid];
        if (!player) continue;
        
        const hand = player.hand || [];
        const melds = player.melds || [];
        const meldTiles = melds.reduce((sum, m) => {
          if (m && Array.isArray(m)) {
            return sum + m.length;
          }
          return sum;
        }, 0);
        const totalTiles = hand.length + meldTiles;
        
        if (totalTiles < 13 || totalTiles > 14) {
          const error = `異常な手牌枚数: ${player.playerName || pid} - 手牌${hand.length}枚 + 副露${meldTiles}枚 = ${totalTiles}枚 (Turn: ${localTurnCount.value})`;
          localErrors.push(error);
        }
      }
      
      // エラーが発生したら中断
      if (localErrors.length > 0) {
        break;
      }
      
      // CPUターン実行（同期的に待機）
      await new Promise((resolve) => {
        localRoom.executeCPUTurn(() => {
          setTimeout(resolve, 10);
        });
      });
    }
    
    // ゲーム結果を返す
    const gameResult = {
      index: gameIndex,
      turnCount: localTurnCount.value,
      errors: localErrors,
      warnings: localWarnings,
      room: localRoom,
    };
    
    if (localRoom.status === 'finished') {
      const winner = localRoom.getWinner();
      if (winner) {
        const scoreResult = localRoom.lastResult?.scoreResult;
        gameResult.winner = winner;
        gameResult.scoreResult = scoreResult;
      } else {
        gameResult.isDraw = true;
      }
    }
    
    return gameResult;
  }

  // 複数回実行
  async runMultiple(count) {
    if (!this.progress) {
      this.log(`\n${'='.repeat(50)}`);
      this.log(`  ${count}回の自動対戦テストを実行します`);
      this.log(`${'='.repeat(50)}\n`);
    }
    
    this.resetYakuStats();
    
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
    
    if (this.parallel) {
      // 並列実行モード
      for (let i = 0; i < count; i += this.concurrency) {
        const end = Math.min(i + this.concurrency, count);
        const gameTasks = [];
        
        for (let j = i; j < end; j++) {
          gameTasks.push(this.runSingleGame(j));
        }
        
        const gameResults = await Promise.all(gameTasks);
        
        for (const gameResult of gameResults) {
          // 進行度バーを表示
          const progressIndex = gameResult.index + 1;
          this.showProgressBar(progressIndex, count);
          
          results.totalTurns += gameResult.turnCount;
          
          if (gameResult.errors.length > 0) {
            results.failed++;
            results.errors.push(...gameResult.errors);
          } else if (gameResult.room.status === 'finished') {
            results.success++;
            if (gameResult.winner) {
              const scoreResult = gameResult.scoreResult;
              const winScore = scoreResult?.score || 0;
              const yaku = scoreResult?.yaku?.map(y => y.name).join(',') || '不明';
              const han = scoreResult?.han || 0;
              results.totalWinPoints += winScore;
              results.winCount++;
              // 役の統計に追加
              if (scoreResult?.yaku) {
                this.addToYakuStats(scoreResult.yaku);
              }
            } else {
              results.draws++;
            }
          } else {
            results.incomplete++;
          }
          
          results.warnings.push(...gameResult.warnings);
        }
      }
    } else {
      // 順序実行モード
      for (let i = 0; i < count; i++) {
        if (!this.summaryOnly && !this.progress) {
          this.log(`\n【第${i + 1}回目】`);
        }
        
        // プログレッシブ進行度バーを表示
        this.showProgressBar(i, count);
        
        const gameResult = await this.runSingleGame(i);
        
        results.totalTurns += gameResult.turnCount;
        
        if (gameResult.errors.length > 0) {
          results.failed++;
          results.errors.push(...gameResult.errors);
        } else if (gameResult.room.status === 'finished') {
          results.success++;
          if (gameResult.winner) {
            const scoreResult = gameResult.scoreResult;
            const winScore = scoreResult?.score || 0;
            const yaku = scoreResult?.yaku?.map(y => y.name).join(',') || '不明';
            const han = scoreResult?.han || 0;
            results.totalWinPoints += winScore;
            results.winCount++;
            // 役の統計に追加
            if (scoreResult?.yaku) {
              this.addToYakuStats(scoreResult.yaku);
            }
            const resultLine = `🎉 第${i + 1}回: ${gameResult.turnCount}ターン - 和了 ${winScore}点 | 上がり手: ${yaku} | ${han}翻`;
            if (!this.progress) {
              this.log(resultLine);
            }
          } else {
            results.draws++;
            const resultLine = `🏁 第${i + 1}回: ${gameResult.turnCount}ターン - 流局`;
            if (!this.progress) {
              this.log(resultLine);
            }
          }
        } else {
          results.incomplete++;
        }
        
        results.warnings.push(...gameResult.warnings);
      }
    }
    
    // プログレッシブ進行度バーを最後まで進める
    if (this.progress) {
      this.showProgressBar(count, count);
      process.stdout.write('\n'); // 改行
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
    
    // 役の統計情報を表示
    if (Object.keys(this.yakuStats).length > 0) {
      this.log('\n' + '='.repeat(50));
      this.log('  和了した役の統計');
      this.log('='.repeat(50));
      
      // 役を出現回数でソート（降順）
      const sortedYaku = Object.values(this.yakuStats)
        .sort((a, b) => b.count - a.count);
      
      sortedYaku.forEach((y) => {
        const pct = ((y.count / results.success) * 100).toFixed(1);
        const doraStr = y.isDora ? ' 💎' : '';
        this.log(`  ${y.name}${doraStr}: ${y.count}回 (${pct}%)`);
      });
    }
    
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
  let summaryOnly = false;
  let progress = false;
  let parallel = false;
  let concurrency = null;
  let showHelp = false;

  args.forEach((arg) => {
    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      return;
    }
    if (arg === '--quiet' || arg === '--silent') {
      quiet = true;
      return;
    }
    if (arg === '--verbose') {
      verbose = true;
      return;
    }
    if (arg === '--summary-only' || arg === '--summary') {
      summaryOnly = true;
      return;
    }
    if (arg === '--progress') {
      progress = true;
      return;
    }
    if (arg === '--parallel') {
      parallel = true;
      return;
    }
    if (arg.startsWith('--concurrency=')) {
      concurrency = parseInt(arg.split('=')[1], 10);
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
  
  // ヘルプ表示
  if (showHelp) {
    console.log(`
CPU同士の自動対戦テスト

使い方:
  node test-cpu-battle.js [回数] [オプション]

オプション:
  --progress              プログレッシブ進行度表示モード（ログを抑制）
  --parallel              マルチスレッド並列実行モード（高速化）
  --concurrency=N         並列度を指定（デフォルト: CPUコア数の半分）
  --summary               局の結果のみ表示
  --verbose               詳細ログを表示
  --quiet, --silent       内部ログを抑制
  --help, -h              このメッセージを表示

使用例:
  順序実行（通常モード）:
    node test-cpu-battle.js 10

  並列実行（高速化）:
    node test-cpu-battle.js 10 --progress --parallel

  並列度を指定:
    node test-cpu-battle.js 10 --progress --parallel --concurrency=8

  ログファイルに保存:
    node test-cpu-battle.js 10 output.log

速度比較（20回実行):
  順序実行:   約16秒
  並列実行:   約3秒（約5倍高速化）
    `);
    process.exit(0);
  }
  
  const test = new CPUBattleTest({
    maxTurns: 300,
    verbose: verbose, // trueにすると詳細ログを出力
    quiet: quiet, // trueにすると内部ログを抑制
    summaryOnly: summaryOnly, // trueにすると局の結果のみ表示
    progress: progress, // trueにするとプログレッシブ進行度表示モード
    parallel: parallel, // trueにするとマルチスレッド並列実行
    concurrency: concurrency, // 並列度を指定（デフォルトはCPUコア数の半分）
    logFile: logFile, // ログファイルのパス（UTF-8で保存される）
  });
  
  if (count > 1) {
    test.runMultiple(count).catch(console.error);
  } else {
    test.runUntilFinish().catch(console.error);
  }
}

module.exports = CPUBattleTest;
