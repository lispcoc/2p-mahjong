/**
 * deploy.js - Build a single ServerManager.exe using @yao-pkg/pkg.
 *
 * Usage:  node deploy.js  (or  npm run deploy)
 *
 * Compiles standalone.js into a single Windows exe via pkg.
 * No DLLs, no runtime files — just one exe.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MANAGER_DIR = __dirname;
const ROOT_DIR = path.resolve(MANAGER_DIR, '..');
const OUTPUT = path.join(ROOT_DIR, 'ServerManager.exe');

// Build
console.log('[INFO] Building ServerManager.exe …');
const target = 'node18-win-x64';

execSync(
  `npx pkg standalone.js --target ${target} --output "${OUTPUT}" --compress GZip`,
  { cwd: MANAGER_DIR, stdio: 'inherit' }
);

const size = fs.statSync(OUTPUT).size;
const sizeMB = (size / 1024 / 1024).toFixed(1);

console.log('');
console.log('========================================');
console.log('  Deploy complete!');
console.log(`  → ${OUTPUT}  (${sizeMB} MB)`);
console.log('  Double-click to run. Opens browser automatically.');
console.log('========================================');
