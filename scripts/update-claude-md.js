#!/usr/bin/env node

/**
 * update-claude-md.js — CLAUDE.md 自動更新スクリプト
 *
 * プロジェクトの現在の状態をスキャンして CLAUDE.md の動的セクションを更新する。
 * 手動実行: node scripts/update-claude-md.js
 * Git hook:  pre-commit で自動実行
 *
 * 検出対象:
 *   - backend/frontend の依存関係 (package.json)
 *   - バックエンドコアモジュール (backend/src/logic/)
 *   - フロントエンドコンポーネント・フック・ユーティリティ
 *   - テストファイル数
 *   - 各ファイルの行数
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');

// ──────────────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function listFiles(dir, ext) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith(ext));
  } catch {
    return [];
  }
}

function countLines(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8').split('\n').length;
  } catch {
    return 0;
  }
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// スキャナー
// ──────────────────────────────────────────────

function scanBackendDeps() {
  const pkg = readJSON(path.join(ROOT, 'backend', 'package.json'));
  if (!pkg) return { deps: {}, devDeps: {} };
  return {
    deps: pkg.dependencies || {},
    devDeps: pkg.devDependencies || {},
  };
}

function scanFrontendDeps() {
  const pkg = readJSON(path.join(ROOT, 'frontend', 'package.json'));
  if (!pkg) return { deps: {}, devDeps: {} };
  return {
    deps: pkg.dependencies || {},
    devDeps: pkg.devDependencies || {},
  };
}

function scanBackendModules() {
  const logicDir = path.join(ROOT, 'backend', 'src', 'logic');
  const files = listFiles(logicDir, '.js');
  return files.map(f => ({
    name: f,
    lines: countLines(path.join(logicDir, f)),
  }));
}

function scanFrontendComponents() {
  const compDir = path.join(ROOT, 'frontend', 'components');
  const result = [];

  // トップレベルファイル
  for (const f of listFiles(compDir, '.tsx')) {
    result.push({ name: f, lines: countLines(path.join(compDir, f)) });
  }
  // サブディレクトリ
  for (const sub of listDirs(compDir)) {
    for (const f of listFiles(path.join(compDir, sub), '.tsx')) {
      result.push({ name: `${sub}/${f}`, lines: countLines(path.join(compDir, sub, f)) });
    }
  }
  return result;
}

function scanFrontendHooks() {
  const dir = path.join(ROOT, 'frontend', 'hooks');
  return listFiles(dir, '.ts').concat(listFiles(dir, '.tsx')).map(f => ({
    name: f,
    lines: countLines(path.join(dir, f)),
  }));
}

function scanFrontendUtils() {
  const dir = path.join(ROOT, 'frontend', 'utils');
  return listFiles(dir, '.ts').concat(listFiles(dir, '.tsx')).map(f => ({
    name: f,
    lines: countLines(path.join(dir, f)),
  }));
}

function scanFrontendTypes() {
  const dir = path.join(ROOT, 'frontend', 'types');
  return listFiles(dir, '.ts').concat(listFiles(dir, '.tsx')).map(f => ({
    name: f,
    lines: countLines(path.join(dir, f)),
  }));
}

function scanTests() {
  const testDir = path.join(ROOT, 'backend', 'tests');
  return listFiles(testDir, '.js');
}

function scanServerLines() {
  return countLines(path.join(ROOT, 'backend', 'src', 'server.js'));
}

// ──────────────────────────────────────────────
// セクション生成
// ──────────────────────────────────────────────

function generateOverview(backendModules, frontendComponents, tests, serverLines) {
  const backendLines = backendModules.reduce((s, m) => s + m.lines, 0) + serverLines;
  const frontendLines = frontendComponents.reduce((s, c) => s + c.lines, 0);

  return [
    '二人麻雀のフルスタックリアルタイム対戦ゲーム。Next.js 14 フロントエンド + Express/WebSocket バックエンドのモノレポ構成。',
    '',
    `- **バックエンド**: \`backend/\` — Node.js (Express + ws), CommonJS, ビルドステップなし（約${backendLines.toLocaleString()}行）`,
    `- **フロントエンド**: \`frontend/\` — Next.js 14 + React 18 + TypeScript + Tailwind CSS 4（約${frontendLines.toLocaleString()}行）`,
    `- **テスト**: ${tests.length}ファイル`,
    '- **ポート**: バックエンド `http://localhost:3001`, フロントエンド `http://localhost:3000`',
  ].join('\n');
}

function generateBackendModulesTable(modules) {
  const lines = [
    '| ファイル | 行数 |',
    '|----------|------|',
  ];
  for (const m of modules.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| \`${m.name}\` | ${m.lines.toLocaleString()} |`);
  }
  return lines.join('\n');
}

function generateFrontendTable(components, hooks, utils, types) {
  const lines = [
    '| パス | 行数 |',
    '|------|------|',
  ];
  // Types
  for (const t of types) {
    lines.push(`| \`frontend/types/${t.name}\` | ${t.lines.toLocaleString()} |`);
  }
  // Hooks
  for (const h of hooks) {
    lines.push(`| \`frontend/hooks/${h.name}\` | ${h.lines.toLocaleString()} |`);
  }
  // Utils
  for (const u of utils) {
    lines.push(`| \`frontend/utils/${u.name}\` | ${u.lines.toLocaleString()} |`);
  }
  // Components
  for (const c of components.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| \`frontend/components/${c.name}\` | ${c.lines.toLocaleString()} |`);
  }
  return lines.join('\n');
}

function generateTechStack(backendDeps, frontendDeps) {
  const lines = [];

  lines.push('### バックエンド依存関係');
  lines.push('');
  lines.push('| パッケージ | バージョン | 種類 |');
  lines.push('|-----------|-----------|------|');
  for (const [name, ver] of Object.entries(backendDeps.deps).sort()) {
    lines.push(`| ${name} | ${ver} | dependencies |`);
  }
  for (const [name, ver] of Object.entries(backendDeps.devDeps).sort()) {
    lines.push(`| ${name} | ${ver} | devDependencies |`);
  }

  lines.push('');
  lines.push('### フロントエンド依存関係');
  lines.push('');
  lines.push('| パッケージ | バージョン | 種類 |');
  lines.push('|-----------|-----------|------|');
  for (const [name, ver] of Object.entries(frontendDeps.deps).sort()) {
    lines.push(`| ${name} | ${ver} | dependencies |`);
  }
  for (const [name, ver] of Object.entries(frontendDeps.devDeps).sort()) {
    lines.push(`| ${name} | ${ver} | devDependencies |`);
  }

  return lines.join('\n');
}

// ──────────────────────────────────────────────
// CLAUDE.md 更新
// ──────────────────────────────────────────────

/**
 * マーカーコメントで囲まれたセクションを置換する。
 * <!-- AUTO:key:START --> ... <!-- AUTO:key:END -->
 */
function replaceSection(content, key, newBody) {
  const startTag = `<!-- AUTO:${key}:START -->`;
  const endTag = `<!-- AUTO:${key}:END -->`;
  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) {
    return content; // マーカーがなければスキップ
  }

  return (
    content.slice(0, startIdx + startTag.length) +
    '\n' +
    newBody +
    '\n' +
    content.slice(endIdx)
  );
}

function main() {
  // CLAUDE.md が存在しなければ終了
  if (!fs.existsSync(CLAUDE_MD)) {
    console.log('⚠️  CLAUDE.md が見つかりません。スキップします。');
    process.exit(0);
  }

  console.log('🔍 プロジェクトをスキャン中...');

  // スキャン
  const backendDeps = scanBackendDeps();
  const frontendDeps = scanFrontendDeps();
  const backendModules = scanBackendModules();
  const frontendComponents = scanFrontendComponents();
  const frontendHooks = scanFrontendHooks();
  const frontendUtils = scanFrontendUtils();
  const frontendTypes = scanFrontendTypes();
  const tests = scanTests();
  const serverLines = scanServerLines();

  console.log(`  バックエンドモジュール: ${backendModules.length}`);
  console.log(`  フロントエンドコンポーネント: ${frontendComponents.length}`);
  console.log(`  フック: ${frontendHooks.length}`);
  console.log(`  テストファイル: ${tests.length}`);
  console.log(`  バックエンド依存: ${Object.keys(backendDeps.deps).length} + ${Object.keys(backendDeps.devDeps).length} dev`);
  console.log(`  フロントエンド依存: ${Object.keys(frontendDeps.deps).length} + ${Object.keys(frontendDeps.devDeps).length} dev`);

  // 現在のCLAUDE.mdを読み込み
  let content = fs.readFileSync(CLAUDE_MD, 'utf-8');
  const originalContent = content;

  // 各セクション更新
  content = replaceSection(content, 'OVERVIEW',
    generateOverview(backendModules, frontendComponents, tests, serverLines));

  content = replaceSection(content, 'BACKEND_MODULES',
    generateBackendModulesTable(backendModules));

  content = replaceSection(content, 'FRONTEND_STRUCTURE',
    generateFrontendTable(frontendComponents, frontendHooks, frontendUtils, frontendTypes));

  content = replaceSection(content, 'TECH_STACK',
    generateTechStack(backendDeps, frontendDeps));

  // 変更があった場合のみ書き込み
  if (content !== originalContent) {
    fs.writeFileSync(CLAUDE_MD, content, 'utf-8');
    console.log('✅ CLAUDE.md を更新しました');

    // git add（pre-commitフックから呼ばれた場合用）
    if (process.env.CLAUDE_MD_GIT_ADD === '1') {
      const { execSync } = require('child_process');
      try {
        execSync('git add CLAUDE.md', { cwd: ROOT, stdio: 'pipe' });
        console.log('  📎 git add CLAUDE.md');
      } catch {
        // git addが失敗しても続行
      }
    }
  } else {
    console.log('ℹ️  CLAUDE.md に変更はありません');
  }
}

main();
