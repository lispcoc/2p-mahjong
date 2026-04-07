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

const MANAGER_DIR = __dirname;
const ROOT_DIR    = path.resolve(MANAGER_DIR, '..');
const DIST_DIR    = path.join(ROOT_DIR, 'dist-manager');
const UNPACKED    = path.join(DIST_DIR, 'win-unpacked');
const EXE_PATH    = path.join(UNPACKED, 'ServerManager.exe');
const LAUNCH_BAT  = path.join(ROOT_DIR, 'ServerManager.bat');

// Build
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
