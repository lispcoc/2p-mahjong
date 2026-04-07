/**
 * Electron Main Process — Server Manager for Mahjong Game
 *
 * Manages backend and frontend child processes, streams logs to the
 * renderer window via IPC. No browser window, no HTTP server needed.
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Paths ───
// 起動バッチが MAHJONG_ROOT 環境変数にプロジェクトルートをセットして底から刑起する。
// dev 実行時は __dirname/../ にフォールバック。
const ROOT = process.env.MAHJONG_ROOT
  ? path.resolve(process.env.MAHJONG_ROOT)
  : path.resolve(__dirname, '..');

const BACKEND_DIR  = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const LOGS_DIR     = path.join(ROOT, 'logs');

// ─── State ───
let win          = null;
let backendProc  = null;
let frontendProc = null;
let isRunning    = false;
let serverMode   = 'dev'; // 'dev' | 'start'

// ─── Log helpers ───
function ts() { return new Date().toTimeString().slice(0, 8); }

function sendLog(msg, cat = 'system') {
  if (win && !win.isDestroyed()) {
    win.webContents.send('log', { ts: ts(), cat, msg });
  }
}

function sendStatus() {
  const s = {
    isRunning,
    backend:    backendProc  ? 'running' : 'stopped',
    frontend:   frontendProc ? 'running' : 'stopped',
    serverMode,
  };
  if (win && !win.isDestroyed()) {
    win.webContents.send('status', s);
  }
}

// ─── Process management ───
function cleanupProcesses() {
  sendLog('Cleaning up processes…');
  try { execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' }); } catch (_) {}
  for (let port = 3000; port <= 3010; port++) {
    try {
      const out = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, {
        encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'],
      });
      const pids = new Set();
      out.trim().split('\n').forEach(line => {
        const p = line.trim().split(/\s+/).pop();
        if (/^\d+$/.test(p) && p !== '0') pids.add(p);
      });
      pids.forEach(pid => {
        try { execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: 'ignore' }); } catch (_) {}
      });
    } catch (_) {}
  }
  sendLog('Cleanup completed');
}

function spawnServer(cmd, args, cwd, cat) {
  const proc = spawn(cmd, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,      // ← コマンドプロンプトウィンドウを非表示
  });
  const handle = d => d.toString('utf-8').trim().split('\n')
    .forEach(l => { if (l.trim()) sendLog(l.trim(), cat); });
  proc.stdout.on('data', handle);
  proc.stderr.on('data', handle);
  proc.on('error', e => sendLog(`Process error: ${e.message}`, 'error'));
  proc.on('exit', (code, sig) => {
    const label = cat === 'backend' ? 'Backend' : 'Frontend';
    if (code !== null && code !== 0) sendLog(`${label} exited with code ${code}`, 'error');
    else if (sig) sendLog(`${label} killed (${sig})`, 'system');
    if (cat === 'backend') backendProc = null;
    else frontendProc = null;
    if (!backendProc && !frontendProc && isRunning) { isRunning = false; }
    sendStatus();
  });
  return proc;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Actions ───
async function startServers() {
  if (isRunning) { sendLog('Servers are already running'); return; }
  if (!fs.existsSync(BACKEND_DIR))  { sendLog('ERROR: backend/ not found', 'error'); return; }
  if (!fs.existsSync(FRONTEND_DIR)) { sendLog('ERROR: frontend/ not found', 'error'); return; }
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

  sendLog('===== Starting Servers =====');
  cleanupProcesses();

  const modeInfo = {
    dev:   { be: ['run', 'dev'],   beLabel: 'npm run dev',   fe: ['run', 'dev'],   feLabel: 'npm run dev'   },
    start: { be: ['start'],        beLabel: 'npm start',     fe: ['run', 'start'], feLabel: 'npm run start' },
  }[serverMode];

  sendLog(`Starting backend: ${modeInfo.beLabel} (port 3001)`);
  backendProc = spawnServer('npm', modeInfo.be, BACKEND_DIR, 'backend');
  sendStatus();
  await delay(3000);

  sendLog(`Starting frontend: ${modeInfo.feLabel} (port 3000)`);
  frontendProc = spawnServer('npm', modeInfo.fe, FRONTEND_DIR, 'frontend');
  await delay(3000);

  isRunning = true;
  sendStatus();
  sendLog('Ready!', 'success');
  sendLog('Browser: http://localhost:3000', 'success');
  sendLog('Backend API: http://localhost:3001', 'success');
}

function stopServers() {
  if (!isRunning && !backendProc && !frontendProc) { sendLog('Servers are not running'); return; }
  sendLog('===== Stopping Servers =====');
  if (backendProc)  { try { process.kill(backendProc.pid,  'SIGTERM'); } catch (_) {} backendProc  = null; }
  if (frontendProc) { try { process.kill(frontendProc.pid, 'SIGTERM'); } catch (_) {} frontendProc = null; }
  setTimeout(() => {
    cleanupProcesses();
    isRunning = false;
    sendStatus();
    sendLog('Servers stopped');
  }, 1000);
}

async function restartServers() {
  sendLog('===== Restarting Servers =====');
  stopServers();
  await delay(3000);
  await startServers();
}

function killAll() {
  if (backendProc)  { try { process.kill(backendProc.pid,  'SIGTERM'); } catch (_) {} }
  if (frontendProc) { try { process.kill(frontendProc.pid, 'SIGTERM'); } catch (_) {} }
  try { execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' }); } catch (_) {}
}

// ─── IPC Handlers ───
ipcMain.handle('start',    () => startServers());
ipcMain.handle('stop',     () => stopServers());
ipcMain.handle('restart',  () => restartServers());
ipcMain.handle('set-mode', (_, mode) => {
  serverMode = mode;
  sendLog(`Switched to ${mode === 'dev' ? 'Dev' : 'Start'} mode`);
  sendStatus();
});
ipcMain.handle('get-status', () => ({
  isRunning,
  backend:    backendProc  ? 'running' : 'stopped',
  frontend:   frontendProc ? 'running' : 'stopped',
  serverMode,
}));
ipcMain.handle('open-url', (_, url) => shell.openExternal(url));

// ウィンドウ閉じる確認後の処理
ipcMain.handle('force-quit', () => {
  killAll();
  win.destroy();
  app.quit();
});

// ─── Window ───
function createWindow() {
  win = new BrowserWindow({
    width: 640,
    height: 720,
    minWidth: 500,
    minHeight: 500,
    title: 'Server Manager - Mahjong Game',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setMenuBarVisibility(false);

  // ウィンドウを閉じる前にサーバー稼働中か確認
  win.on('close', async (e) => {
    if (isRunning) {
      e.preventDefault();
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['終了する', 'キャンセル'],
        defaultId: 1,
        cancelId: 1,
        title: 'Server Manager',
        message: 'サーバーが稼働中です。終了してもよろしいですか？',
      });
      if (response === 0) {
        killAll();
        win.destroy();
        app.quit();
      }
    } else {
      killAll();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  killAll();
  app.quit();
});
