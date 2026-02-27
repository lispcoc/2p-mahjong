/**
 * テスト共通ヘルパー
 * 全テストファイルで使用するアサーション・レポート機能
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message} (期待: ${expected}, 実際: ${actual})`);
  }
}

function assertIncludes(arr, item, message) {
  const found = Array.isArray(arr) && arr.some(a =>
    typeof a === 'object' && typeof item === 'object'
      ? a.suit === item.suit && a.number === item.number
      : a === item
  );
  if (found) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message} (配列内に見つからず)`);
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

function report() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`結果: ${passed}/${passed + failed} テスト通過`);
  if (failed > 0) {
    console.log(`${failed} テスト失敗`);
    process.exit(1);
  } else {
    console.log('全テスト成功');
  }
}

/**
 * カウンタをリセット（テストランナーでの連続実行用）
 */
function reset() {
  passed = 0;
  failed = 0;
}

/**
 * 現在のカウンタを取得（テストランナー用）
 */
function getResults() {
  return { passed, failed };
}

module.exports = { assert, assertEqual, assertIncludes, section, report, reset, getResults };
