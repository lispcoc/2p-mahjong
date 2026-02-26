/**
 * 両リーチ時のツモ和了テスト
 * 双方リーチ状態でCPUがツモ和了できることを確認する
 */
const GameRoom = require('../src/logic/GameRoom');

// コンソールログを抑制
const originalLog = console.log;
const originalError = console.error;
let suppressLogs = true;
console.log = (...args) => { if (!suppressLogs) originalLog(...args); };
console.error = (...args) => { if (!suppressLogs) originalError(...args); };

function restoreLogs() {
  suppressLogs = false;
}
function suppressAll() {
  suppressLogs = true;
}

// executeCPUTurnをPromiseでラップ（setTimeoutを待つ）
function executeCPUTurnAsync(room) {
  return new Promise((resolve) => {
    if (room.status !== 'playing') {
      resolve(false);
      return;
    }
    room.executeCPUTurn(() => {
      resolve(true);
    });
    // 安全のためタイムアウト（CPUが行動しなかった場合）
    setTimeout(() => resolve(false), 500);
  });
}

/**
 * テスト1: CPU同士のゲームが正常に完了するか
 */
async function testCPUBattleCompletes() {
  restoreLogs();
  console.log('\n=== Test 1: CPU battle completes ===');
  suppressAll();

  const room = new GameRoom('test-1', { testMode: true });
  room.addPlayer('cpu1', 'CPU-1', null, true);
  room.addPlayer('cpu2', 'CPU-2', null, true);
  room.start();

  let turnCount = 0;
  const maxTurns = 300;

  while (room.status === 'playing' && turnCount < maxTurns) {
    const didAct = await executeCPUTurnAsync(room);
    if (!didAct) break;
    turnCount++;
  }

  restoreLogs();
  if (room.status !== 'playing') {
    console.log(`  ✅ Game completed in ${turnCount} turns`);
    return true;
  } else {
    console.log(`  ❌ Game stuck after ${turnCount} turns`);
    return false;
  }
}

/**
 * テスト2: executeBothRiichiAutoPlay がツモ和了/流局まで正しく動作するか
 */
async function testBothRiichiAutoPlayLoop() {
  restoreLogs();
  console.log('\n=== Test 2: executeBothRiichiAutoPlay returns correctly ===');
  suppressAll();

  let bothRiichiFound = false;
  let testsPassed = 0;
  const numGames = 30;

  for (let i = 0; i < numGames; i++) {
    const room = new GameRoom(`test-2-${i}`, { testMode: true });
    room.addPlayer('cpu1', 'CPU-1', null, true);
    room.addPlayer('cpu2', 'CPU-2', null, true);
    room.start();

    let turnCount = 0;
    let gameResolved = false;
    while (room.status === 'playing' && turnCount < 300) {
      // 両リーチ検出
      if (room.gameLogic.areBothPlayersInRiichi() &&
          !room.gameLogic.getRonPossibleFor() &&
          !room.gameLogic.getPendingPungFor()) {
        bothRiichiFound = true;

        // executeBothRiichiAutoPlayを直接テスト
        let broadcastCount = 0;
        const result = await room.executeBothRiichiAutoPlay(() => {
          broadcastCount++;
        });

        if (result.finished || room.status !== 'playing') {
          testsPassed++;
          gameResolved = true;
          break;
        }

        // ロン可能 or ツモ可能で停止 → 正常
        const ronFor = room.gameLogic.getRonPossibleFor();
        const ct = room.gameLogic.getCurrentTurn();
        const canWin = room.gameLogic.getDrawnTileIndex(ct) >= 0 &&
                       room.gameLogic.isWinningHand(ct);

        if (ronFor || canWin) {
          testsPassed++;
          gameResolved = true;
          break;
        }
      }

      // 通常のCPUターン
      const didAct = await executeCPUTurnAsync(room);
      if (!didAct) break;
      turnCount++;
    }

    if (!gameResolved && room.status !== 'playing') {
      testsPassed++;
    }
  }

  restoreLogs();
  console.log(`  Both riichi occurred: ${bothRiichiFound}`);
  console.log(`  Games completed: ${testsPassed}/${numGames}`);
  if (testsPassed === numGames) {
    console.log('  ✅ All games completed');
    return true;
  } else {
    console.log(`  ❌ ${numGames - testsPassed} games stuck`);
    return false;
  }
}

/**
 * テスト3: 多数のCPU戦でデッドロックがないか確認
 */
async function testMultipleCPUBattles() {
  restoreLogs();
  console.log('\n=== Test 3: Multiple CPU battles (20 games) ===');
  suppressAll();

  const numGames = 20;
  let completed = 0;
  let bothRiichiCount = 0;

  for (let i = 0; i < numGames; i++) {
    const room = new GameRoom(`test-3-${i}`, { testMode: true });
    room.addPlayer('cpu1', 'CPU-1', null, true);
    room.addPlayer('cpu2', 'CPU-2', null, true);
    room.start();

    let turnCount = 0;
    let hadBothRiichi = false;
    while (room.status === 'playing' && turnCount < 300) {
      if (room.gameLogic.areBothPlayersInRiichi()) {
        hadBothRiichi = true;
      }
      const didAct = await executeCPUTurnAsync(room);
      if (!didAct) break;
      turnCount++;
    }

    if (room.status !== 'playing') completed++;
    if (hadBothRiichi) bothRiichiCount++;
  }

  restoreLogs();
  console.log(`  Completed: ${completed}/${numGames}`);
  console.log(`  Games with both riichi: ${bothRiichiCount}/${numGames}`);
  if (completed === numGames) {
    console.log('  ✅ All games completed');
    return true;
  } else {
    console.log(`  ❌ ${numGames - completed} games stuck`);
    return false;
  }
}

// メイン実行
async function main() {
  restoreLogs();
  console.log('========================================');
  console.log('  両リーチ時ツモ和了テスト');
  console.log('========================================');
  suppressAll();

  const results = [];
  results.push(await testCPUBattleCompletes());
  results.push(await testBothRiichiAutoPlayLoop());
  results.push(await testMultipleCPUBattles());

  restoreLogs();
  console.log('\n========================================');
  console.log('  テスト結果');
  console.log('========================================');

  const allPassed = results.every(r => r);
  if (allPassed) {
    console.log('✅ すべてのテストに合格しました');
  } else {
    console.log('❌ 一部のテストが失敗しました');
    process.exit(1);
  }
}

main().catch(err => {
  restoreLogs();
  console.error('Fatal error:', err);
  process.exit(1);
});
