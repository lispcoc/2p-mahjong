const GameRoom = require('../src/logic/GameRoom');

// 内部ログを制御するための最小限のログシステム
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  // テスト用ログのみ表示（他の内部ログは抑制）
  const msg = args[0]?.toString() || '';
  if (msg.includes('✅') || msg.includes('=====') || msg.includes('ラウンド') || msg.includes('【') || msg.includes('テスト') || msg.includes('進捗')) {
    originalConsoleLog(...args);
  }
};

console.warn = (...args) => {
  // 警告は表示しない
};

// エラーは表示（console.error は制御しない）

/**
 * 偶然役テスト（一発、海底、嶺上開花）
 * CPU同士の対戦を回して、各役が出るまでテストします
 */

class AccidentalYakuTest {
  constructor(options = {}) {
    this.maxRounds = options.maxRounds || 100; // 最大ラウンド数
    this.verbose = options.verbose !== undefined ? options.verbose : false;
    this.resultsOverview = {};
    this.yakuResults = {
      'ツモ': 0,
      'リーチ': 0,
      '一発': 0,
      '海底撈月': 0,
      '嶺上開花': 0,
      'その他': 0,
      '役なし': 0
    };
  }

  async runTest() {
    originalConsoleLog('\n========== 偶然役テスト実行中 ==========\n');

    let roundCount = 0;
    const yakuFoundResults = {
      '一発': false,
      '海底撈月': false,
      '嶺上開花': false
    };

    while (roundCount < this.maxRounds) {
      roundCount++;
      
      // 進捗表示（毎10ラウンドごと）
      if (roundCount % 10 === 1) {
        if (roundCount > 1) process.stdout.write('\n');
        process.stdout.write(`ラウンド ${String(roundCount).padStart(3)}-${String(Math.min(roundCount + 9, this.maxRounds)).padStart(3)}: `);
      }

      const result = await this.runOneRound();

      if (result.winner && result.yaku && result.yaku.length > 0) {
        // 役がある場合のみ詳細表示
        originalConsoleLog(`\n  ✓ ラウンド${roundCount}: ${result.winnerName}が和了`);
        
        // 偶然役を検出
        if (result.yaku.some(y => y.name === '一発')) {
          originalConsoleLog(`    ✅ 【一発】を検出！`);
          yakuFoundResults['一発'] = true;
        }
        if (result.yaku.some(y => y.name === '海底撈月')) {
          originalConsoleLog(`    ✅ 【海底撈月】を検出！`);
          yakuFoundResults['海底撈月'] = true;
        }
        if (result.yaku.some(y => y.name === '嶺上開花')) {
          originalConsoleLog(`    ✅ 【嶺上開花】を検出！`);
          yakuFoundResults['嶺上開花'] = true;
        }

        const yakuNames = result.yaku.map(y => y.name).join(' + ');
        originalConsoleLog(`    役: ${yakuNames}`);
        process.stdout.write(`  進捗: `);

        // 役統計を更新
        for (const yaku of result.yaku) {
          if (this.yakuResults.hasOwnProperty(yaku.name)) {
            this.yakuResults[yaku.name]++;
          } else {
            this.yakuResults['その他']++;
          }
        }
      } else {
        process.stdout.write('.');
        if (result.yaku && result.yaku.length === 0) {
          this.yakuResults['役なし']++;
        }
      }

      // すべての役が揃ったら終了
      if (yakuFoundResults['一発'] && yakuFoundResults['海底撈月'] && yakuFoundResults['嶺上開花']) {
        originalConsoleLog(`\n\n✅ すべての偶然役が検出されました！`);
        break;
      }
    }

    originalConsoleLog(''); // 改行
    this.printSummary(roundCount, yakuFoundResults);
  }

  async runOneRound() {
    return new Promise((resolve) => {
      const room = new GameRoom('test-room', {
        initialScore: 25000,
        wallTiles: 87,
        testMode: true
      });

      // CPU同士を追加
      room.addPlayer('cpu1', 'CPU-1', null, true);
      room.addPlayer('cpu2', 'CPU-2', null, true);

      // ゲーム開始
      room.start();

      const maxTurns = 300;
      let turnCount = 0;

      const playGame = () => {
        if (room.status !== 'playing') {
          // ゲーム終了
          const winner = room.gameLogic.getWinner();
          
          if (winner) {
            // 和了の場合
            const scoreResult = room.gameLogic.calculateWinScore(winner, room.gameLogic.players[winner].drawnTile, true);
            const yaku = scoreResult.yaku || [];
            resolve({
              winner: winner,
              winnerName: room.players.get(winner).playerName,
              winMethod: 'tsumo',
              yaku: yaku,
              score: scoreResult.score || 0
            });
          } else {
            // 流局の場合
            resolve({
              winner: null,
              winnerName: null,
              winMethod: 'draw',
              yaku: [],
              score: 0
            });
          }
          return;
        }

        turnCount++;

        if (turnCount > maxTurns) {
          resolve({
            winner: null,
            winnerName: null,
            winMethod: 'timeout',
            yaku: [],
            score: 0
          });
          return;
        }

        // 現在のプレイヤーを取得
        const currentPlayerId = room.gameLogic.getCurrentTurn();
        const currentPlayer = room.players.get(currentPlayerId);

        // 手牌にツモ牌がない場合はツモを実行
        const playerData = room.gameLogic.players[currentPlayerId];
        if (playerData.drawnTile === null) {
          const drawResult = room.gameLogic.drawForTurn(currentPlayerId);
          if (drawResult && drawResult.finished) {
            room.status = 'finished';
            playGame();
            return;
          }
        }

        // 和了可能かチェック
        if (playerData.hand.length === 14 && room.gameLogic.isWinningHand(currentPlayerId)) {
          const winResult = room.gameLogic.handleWin(currentPlayerId);
          if (winResult.success) {
            room.status = 'finished';
            playGame();
            return;
          }
        }

        // 捨て牌を実行
        const handLength = playerData.hand.length;
        const discardTileIndex = Math.floor(Math.random() * (handLength - 1));
        const discardTile = playerData.hand[discardTileIndex];
        const discardResult = room.gameLogic.handleDiscard(currentPlayerId, `${discardTile.suit}_${discardTile.number}`);

        if (discardResult && discardResult.finished) {
          room.status = 'finished';
          playGame();
          return;
        }

        // 次のターンへ
        setTimeout(playGame, 0);
      };

      playGame();
    });
  }

  printSummary(roundCount, yakuFoundResults) {
    originalConsoleLog('===== テスト結果 =====');
    originalConsoleLog(`実行ラウンド数: ${roundCount}/${this.maxRounds}`);
    originalConsoleLog(`\n【偶然役の検出状況】`);
    originalConsoleLog(`  一発: ${yakuFoundResults['一発'] ? '✅ 検出' : '❌ 未検出'}`);
    originalConsoleLog(`  海底撈月: ${yakuFoundResults['海底撈月'] ? '✅ 検出' : '❌ 未検出'}`);
    originalConsoleLog(`  嶺上開花: ${yakuFoundResults['嶺上開花'] ? '✅ 検出' : '❌ 未検出'}`);

    originalConsoleLog(`\n【役の出現統計】`);
    for (const [yaku, count] of Object.entries(this.yakuResults)) {
      if (count > 0) {
        originalConsoleLog(`  ${yaku}: ${count}回`);
      }
    }

    const allFound = yakuFoundResults['一発'] && yakuFoundResults['海底撍'] && yakuFoundResults['嶺上開花'];
    originalConsoleLog(`\n${allFound ? '✅ テスト成功' : '⏳ テスト継続中'}\n`);
  }
}

// テスト実行
const tester = new AccidentalYakuTest({ maxRounds: 100 });
tester.runTest().catch(err => {
  originalConsoleLog('❌ テスト中にエラーが発生しました:', err);
  process.exit(1);
});
