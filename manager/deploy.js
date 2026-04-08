/**
 * deploy.js - Build ServerManager.exe using electron-builder.
 *
 * Usage:  node deploy.js  (or  npm run deploy)
 *
 * electron-builder で Windows Portable EXE を生成する。
 * 出力先: ../dist-manager/ServerManager*.exe
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const MANAGER_DIR = __dirname;
const ROOT_DIR    = path.resolve(MANAGER_DIR, '..');
const DIST_DIR    = path.join(ROOT_DIR, 'dist-manager');
const UNPACKED    = path.join(DIST_DIR, 'win-unpacked');
const EXE_PATH    = path.join(UNPACKED, 'ServerManager.exe');
const LAUNCH_BAT  = path.join(ROOT_DIR, 'ServerManager.bat');

// ─────────────────────────────────────────────────────────────────────────────
// winCodeSign の事前準備
//
// electron-builder は winCodeSign-2.6.0.7z をダウンロード後、7zip で展開する。
// このとき macOS 用シンボリックリンク（libcrypto.dylib 等）の作成を試みるが、
// Windows の SeCreateSymbolicLinkPrivilege がない環境ではエラーになりビルドが中断する。
//
// 対策: キャッシュが存在しない場合、7zip の -snl フラグ（シンボリックリンクをスキップ）
//       で手動展開してからビルドを開始する。
// ─────────────────────────────────────────────────────────────────────────────

const WIN_CODE_SIGN_VERSION = '2.6.0';
const WIN_CODE_SIGN_URL =
  `https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-${WIN_CODE_SIGN_VERSION}/winCodeSign-${WIN_CODE_SIGN_VERSION}.7z`;
const WIN_CODE_SIGN_CACHE = path.join(
  os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign',
  `winCodeSign-${WIN_CODE_SIGN_VERSION}`
);
const SEVEN_ZA = path.join(MANAGER_DIR, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const follow = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    follow(url);
  });
}

async function prepareWinCodeSign() {
  // macOS・Linux 環境では不要
  if (process.platform !== 'win32') return;
  // キャッシュが既に存在する場合はスキップ
  if (fs.existsSync(WIN_CODE_SIGN_CACHE)) return;

  console.log('[INFO] winCodeSign キャッシュが見つかりません。手動展開を行います...');
  console.log(`[INFO] (シンボリックリンク権限なしでも動作する方法で展開します)`);

  const cacheParent = path.dirname(WIN_CODE_SIGN_CACHE);
  fs.mkdirSync(cacheParent, { recursive: true });

  const zipPath = path.join(cacheParent, `winCodeSign-${WIN_CODE_SIGN_VERSION}.7z`);
  if (!fs.existsSync(zipPath)) {
    process.stdout.write(`[INFO] ダウンロード中: ${WIN_CODE_SIGN_URL} ... `);
    await downloadFile(WIN_CODE_SIGN_URL, zipPath);
    console.log('完了');
  }

  process.stdout.write(`[INFO] 展開中 (-snl でシンボリックリンクをスキップ) ... `);
  // -snl = シンボリックリンクを無視（Windowsでの権限エラー回避）
  // 終了コード 2 = 「警告あり（シンボリックリンクをスキップ）」で正常展開されているため許容する
  try {
    execSync(
      `"${SEVEN_ZA}" x -snl -bd "${zipPath}" "-o${WIN_CODE_SIGN_CACHE}" -y`,
      { cwd: cacheParent, stdio: 'pipe' }
    );
  } catch (err) {
    // status 2 はシンボリックリンクスキップの警告コード。ファイルは正常に展開済みなので続行する。
    if (err.status !== 2) throw err;
  }
  console.log('完了');
  console.log('');
}

// Build
async function main() {
  await prepareWinCodeSign();

  console.log('[INFO] Building ServerManager.exe with electron-builder …');
  console.log('[INFO] 初回は数分かかることがあります。');
  console.log('');

  execSync(
    'npx electron-builder --win dir --publish never',
    { cwd: MANAGER_DIR, stdio: 'inherit' }
  );

  console.log('');
  console.log('========================================');
  console.log('  Deploy complete!');
  if (fs.existsSync(EXE_PATH)) {
    const sizeMB = (fs.statSync(EXE_PATH).size / 1024 / 1024).toFixed(1);
    console.log(`  → ${EXE_PATH}  (${sizeMB} MB)`);
    console.log(`  フォルダごと配布してください: ${UNPACKED}`);

    // ルートフォルダに起動バッチを生成
    // %~dp0 = バッチ自身のフォルダ（= プロジェクトルート）を MAHJONG_ROOT として渡す
    const batContent = `@echo off
chcp 65001 >nul
set "MAHJONG_ROOT=%~dp0"
start "" "%~dp0dist-manager\\win-unpacked\\ServerManager.exe"
`;
    fs.writeFileSync(LAUNCH_BAT, batContent, 'utf-8');
    console.log(`  起動バッチ生成: ${LAUNCH_BAT}`);
  } else {
    console.log(`  → ${UNPACKED}`);
  }
  console.log('  ServerManager.exe をダブルクリックで起動。ブラウザ不要。');
  console.log('========================================');
}

main().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
