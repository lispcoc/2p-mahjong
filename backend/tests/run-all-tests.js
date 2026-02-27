#!/usr/bin/env node

/**
 * 全テスト一括実行ランナー
 * 
 * 使い方:
 *   node tests/run-all-tests.js           # 全テスト実行
 *   node tests/run-all-tests.js --verbose # 詳細出力
 *   node tests/run-all-tests.js --quiet   # サマリーのみ
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const quiet = args.includes('--quiet');

// テストファイル一覧（実行順序）
// test-cpu-battle.js はシミュレーションテストのため除外
const testFiles = [
  // 回帰テスト（スモーク）
  'test-regression-quick.js',
  
  // 役判定
  'test-yaku-detection.js',
  'test-chanta-junchan-chuuren.js',
  'test-pinfu-fix.js',
  'test-suuankou-tanki.js',
  'test-accidental-yaku.js',
  
  // 得点計算
  'test-fu-calculation.js',
  
  // テンパイ・フリテン
  'test-tenpai-detection.js',
  'test-furiten-multipattern.js',
  
  // ゲームメカニクス
  'test-game-mechanics.js',
  'test-ippatsu-cancellation.js',
  'test-kan-uradora.js',
  
  // AI
  'test-ai-decisions.js',
  
  // ツモ運
  'test-tsumo-luck-combined.js',
  'test-adaptive-luck.js',
];

const results = [];
let totalPassed = 0;
let totalFailed = 0;
let totalFiles = 0;
let failedFiles = [];

console.log('╔══════════════════════════════════════════════════╗');
console.log('║          麻雀テストスイート 一括実行             ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log(`\n実行テスト数: ${testFiles.length} ファイル\n`);

const startTime = Date.now();

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  const label = file.replace('test-', '').replace('.js', '');
  totalFiles++;

  try {
    const output = execSync(`node "${filePath}"`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // テスト結果行からパス/フェイル数を抽出
    const resultMatch = output.match(/結果:\s*(\d+)\/(\d+)/);
    const allPassMatch = output.match(/ALL.*PASSED|全テスト成功|All.*passed|All.*PASSED/i);
    
    let passed = 0, total = 0;
    if (resultMatch) {
      passed = parseInt(resultMatch[1]);
      total = parseInt(resultMatch[2]);
    } else if (allPassMatch) {
      // 独自フォーマットのテスト
      const passMatches = output.match(/✅|✓|✔/g);
      passed = passMatches ? passMatches.length : 1;
      total = passed;
    }

    const failed = total - passed;
    totalPassed += passed;
    totalFailed += failed;

    const status = failed === 0 ? '✅' : '⚠️';
    if (!quiet) {
      console.log(`${status} ${label.padEnd(30)} ${passed}/${total} 通過`);
    }
    if (verbose) {
      console.log(output.split('\n').map(l => `    ${l}`).join('\n'));
    }

    results.push({ file, passed, total, failed, status: 'pass' });
    if (failed > 0) {
      failedFiles.push(file);
    }
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    
    // エラー時もパス/フェイル数を抽出
    const resultMatch = output.match(/結果:\s*(\d+)\/(\d+)/);
    let passed = 0, total = 0;
    if (resultMatch) {
      passed = parseInt(resultMatch[1]);
      total = parseInt(resultMatch[2]);
    }
    const failed = Math.max(total - passed, 1);
    totalPassed += passed;
    totalFailed += failed;

    console.log(`❌ ${label.padEnd(30)} ${passed}/${total || '?'} 通過 (exit code: ${err.status})`);
    if (verbose || !quiet) {
      // エラー行のみ表示
      const errorLines = output.split('\n').filter(l => l.includes('❌') || l.includes('✗') || l.includes('FAIL') || l.includes('Error'));
      if (errorLines.length > 0) {
        errorLines.slice(0, 5).forEach(l => console.log(`    ${l.trim()}`));
      }
    }

    failedFiles.push(file);
    results.push({ file, passed, total, failed, status: 'fail' });
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ========== サマリー ==========
console.log('\n' + '═'.repeat(50));
console.log('  テスト結果サマリー');
console.log('═'.repeat(50));
console.log(`  ファイル数:   ${totalFiles}`);
console.log(`  テスト合計:   ${totalPassed + totalFailed}`);
console.log(`  成功:         ${totalPassed}`);
console.log(`  失敗:         ${totalFailed}`);
console.log(`  実行時間:     ${elapsed}秒`);

if (failedFiles.length > 0) {
  console.log(`\n  ❌ 失敗したテスト:`);
  failedFiles.forEach(f => console.log(`     - ${f}`));
}

console.log('═'.repeat(50));

if (totalFailed > 0) {
  console.log(`\n❌ ${totalFailed} テスト失敗`);
  process.exit(1);
} else {
  console.log(`\n✅ 全 ${totalPassed} テスト成功！`);
  process.exit(0);
}
