const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const maxAttempts = 100;
let attemptCount = 0;
let found = false;

console.log('流局になるまでCPU対戦テストを実行します');
console.log(`最大試行回数: ${maxAttempts}`);
console.log('');

function runTest() {
  attemptCount++;
  console.log(`試行 #${attemptCount}...`);

  exec('node test-cpu-battle.js', (error, stdout, stderr) => {
    const output = stdout || stderr;

    // 流局を検出
    if (output.match(/Draw -/) || output.match(/流局/) || output.match(/引き分け/)) {
      console.log('\n✅ 流局が検出されました！\n');
      console.log('========================================');
      console.log('流局テスト結果');
      console.log('========================================');
      console.log(output);
      found = true;
      return;
    }

    // 勝者を検出して表示
    const winnerMatch = output.match(/勝者:\s*([^\s]+)/);
    const turnsMatch = output.match(/総ターン数:\s*(\d+)/);
    if (winnerMatch && turnsMatch) {
      const winner = winnerMatch[1];
      const turns = turnsMatch[1];
      console.log(`  結果: ${winner} が ${turns} ターンで勝利`);
    }

    // 次のテストを実行
    if (attemptCount >= maxAttempts || found) {
      if (!found) {
        console.log('');
        console.log(`⚠️ ${maxAttempts} 回の試行で流局が検出されませんでした`);
        console.log('流局は確率的に発生するため、より多くの試行が必要な場合があります');
      }
      console.log('');
      console.log(`テスト完了: ${attemptCount} 回試行`);
      return;
    }

    runTest();
  });
}

runTest();
