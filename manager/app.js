/**
 * Server Manager for Mahjong Game
 * nw.js application - manages backend and frontend processes.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ──────────── Paths ────────────
const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const LOGS_DIR = path.join(ROOT, 'logs');

// ──────────── State ────────────
let backendProc = null;
let frontendProc = null;
let isRunning = false;
let autoScroll = true;
let serverMode = localStorage.getItem('serverMode') || 'dev'; // 'dev' or 'start'

// ──────────── DOM refs ────────────
const logBox = document.getElementById('log-box');
const backendStatus = document.getElementById('backend-status');
const frontendStatus = document.getElementById('frontend-status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnRestart = document.getElementById('btn-restart');
const btnClear = document.getElementById('btn-clear');
const btnBrowser = document.getElementById('btn-browser');
const filterBackend = document.getElementById('filter-backend');
const filterFrontend = document.getElementById('filter-frontend');
const filterSystem = document.getElementById('filter-system');
const modeDevBtn = document.getElementById('mode-dev');
const modeStartBtn = document.getElementById('mode-start');
const modeDescription = document.getElementById('mode-description');

// ──────────── Mode Toggle ────────────
const MODE_INFO = {
  dev: {
    label: 'Dev',
    description: 'Hot reload enabled (nodemon + next dev)',
    backend: { cmd: 'npm', args: ['run', 'dev'], display: 'npm run dev' },
    frontend: { cmd: 'npm', args: ['run', 'dev'], display: 'npm run dev' },
  },
  start: {
    label: 'Start',
    description: 'Production mode (node + next start)',
    backend: { cmd: 'npm', args: ['start'], display: 'npm start' },
    frontend: { cmd: 'npm', args: ['run', 'start'], display: 'npm run start' },
  },
};

function setMode(mode) {
  serverMode = mode;
  localStorage.setItem('serverMode', mode);
  modeDevBtn.classList.toggle('active', mode === 'dev');
  modeStartBtn.classList.toggle('active', mode === 'start');
  modeDescription.textContent = MODE_INFO[mode].description;
}

modeDevBtn.addEventListener('click', () => {
  if (isRunning) {
    log('Cannot switch mode while servers are running', 'error');
    return;
  }
  setMode('dev');
  log('Switched to Dev mode', 'system');
});

modeStartBtn.addEventListener('click', () => {
  if (isRunning) {
    log('Cannot switch mode while servers are running', 'error');
    return;
  }
  setMode('start');
  log('Switched to Start mode', 'system');
});

// Initialize mode from saved preference
setMode(serverMode);

// ──────────── Log Utilities ────────────
function timestamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

/**
 * Append a log entry.
 * @param {string} message
 * @param {'system'|'backend'|'frontend'|'error'|'success'} category
 */
function log(message, category = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${category}`;
  entry.dataset.category = category === 'error' || category === 'success' ? 'system' : category;

  const prefixMap = {
    system: 'SYS',
    backend: 'BE',
    frontend: 'FE',
    error: 'ERR',
    success: 'OK',
  };

  entry.innerHTML =
    `<span class="timestamp">${timestamp()}</span>` +
    `<span class="prefix">[${prefixMap[category]}]</span> ` +
    escapeHtml(message);

  logBox.appendChild(entry);
  applyFilters();

  if (autoScroll) {
    logBox.scrollTop = logBox.scrollHeight;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function applyFilters() {
  const show = {
    backend: filterBackend.checked,
    frontend: filterFrontend.checked,
    system: filterSystem.checked,
  };
  logBox.querySelectorAll('.log-entry').forEach((el) => {
    const cat = el.dataset.category || 'system';
    el.style.display = show[cat] ? '' : 'none';
  });
}

// Track scroll to disable auto-scroll when user scrolls up
logBox.addEventListener('scroll', () => {
  const atBottom = logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight < 40;
  autoScroll = atBottom;
});

filterBackend.addEventListener('change', applyFilters);
filterFrontend.addEventListener('change', applyFilters);
filterSystem.addEventListener('change', applyFilters);

// ──────────── Process helpers ────────────

function setStatus(el, state) {
  el.className = `status-badge ${state}`;
  const map = { stopped: 'Stopped', starting: 'Starting…', running: 'Running' };
  el.textContent = map[state] || state;
}

function updateButtons() {
  btnStart.disabled = isRunning;
  btnStop.disabled = !isRunning;
  btnRestart.disabled = !isRunning;
}

/** Kill all node processes and free ports 3000-3010 */
function cleanupProcesses() {
  log('Cleaning up processes…');
  try {
    // Kill node processes (Windows)
    execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' });
  } catch (_) { /* no node processes */ }

  // Kill processes on ports 3000-3010
  for (let port = 3000; port <= 3010; port++) {
    try {
      const out = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = out.trim().split('\n');
      const pids = new Set();
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      });
      pids.forEach((pid) => {
        try { execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: 'ignore' }); } catch (_) {}
      });
    } catch (_) {}
  }
  log('Cleanup completed');
}

/**
 * Spawn a child process and pipe output to log.
 * Returns the child process.
 */
function spawnServer(command, args, cwd, category) {
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const handleData = (data) => {
    const text = data.toString('utf-8').trim();
    if (text) {
      text.split('\n').forEach((line) => {
        if (line.trim()) log(line.trim(), category);
      });
    }
  };

  proc.stdout.on('data', handleData);
  proc.stderr.on('data', handleData);

  proc.on('error', (err) => {
    log(`Process error: ${err.message}`, 'error');
  });

  proc.on('exit', (code, signal) => {
    const label = category === 'backend' ? 'Backend' : 'Frontend';
    if (code !== null && code !== 0) {
      log(`${label} exited with code ${code}`, 'error');
    } else if (signal) {
      log(`${label} killed (${signal})`, 'system');
    }
    if (category === 'backend') {
      setStatus(backendStatus, 'stopped');
      backendProc = null;
    } else {
      setStatus(frontendStatus, 'stopped');
      frontendProc = null;
    }
    // If both are down, update state
    if (!backendProc && !frontendProc && isRunning) {
      isRunning = false;
      updateButtons();
    }
  });

  return proc;
}

// ──────────── Actions ────────────

async function startServers() {
  if (isRunning) {
    log('Servers are already running', 'system');
    return;
  }

  // Validate directories
  if (!fs.existsSync(BACKEND_DIR)) {
    log('ERROR: backend/ folder not found', 'error');
    return;
  }
  if (!fs.existsSync(FRONTEND_DIR)) {
    log('ERROR: frontend/ folder not found', 'error');
    return;
  }

  // Ensure logs directory
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  log('===== Starting Servers =====', 'system');
  cleanupProcesses();

  const modeInfo = MODE_INFO[serverMode];

  // Start backend
  setStatus(backendStatus, 'starting');
  log(`Starting backend: ${modeInfo.backend.display} (port 3001)`, 'system');
  backendProc = spawnServer(modeInfo.backend.cmd, modeInfo.backend.args, BACKEND_DIR, 'backend');

  // Wait a bit for backend
  await delay(3000);

  // Start frontend
  setStatus(frontendStatus, 'starting');
  log(`Starting frontend: ${modeInfo.frontend.display} (port 3000)`, 'system');
  frontendProc = spawnServer(modeInfo.frontend.cmd, modeInfo.frontend.args, FRONTEND_DIR, 'frontend');

  // Wait a bit then mark running
  await delay(3000);

  if (backendProc) setStatus(backendStatus, 'running');
  if (frontendProc) setStatus(frontendStatus, 'running');

  isRunning = true;
  updateButtons();

  log('Ready!', 'success');
  log('Browser: http://localhost:3000', 'success');
  log('Backend API: http://localhost:3001', 'success');
}

function stopServers() {
  if (!isRunning && !backendProc && !frontendProc) {
    log('Servers are not running', 'system');
    return;
  }

  log('===== Stopping Servers =====', 'system');

  if (backendProc) {
    try { process.kill(backendProc.pid, 'SIGTERM'); } catch (_) {}
    backendProc = null;
  }
  if (frontendProc) {
    try { process.kill(frontendProc.pid, 'SIGTERM'); } catch (_) {}
    frontendProc = null;
  }

  // Give SIGTERM a moment, then force cleanup
  setTimeout(() => {
    cleanupProcesses();
    setStatus(backendStatus, 'stopped');
    setStatus(frontendStatus, 'stopped');
    isRunning = false;
    updateButtons();
    log('Servers stopped', 'system');
  }, 1000);
}

async function restartServers() {
  log('===== Restarting Servers =====', 'system');
  stopServers();
  await delay(3000);
  await startServers();
}

function clearLog() {
  logBox.innerHTML = '';
  log('Log cleared', 'system');
}

function openBrowser() {
  nw.Shell.openExternal('http://localhost:3000');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────── Tab Switching (log only) ────────────
function switchTabLog() {
  // ログタブのみ（BAN管理はバックエンド管理パネルへ移行）
}

function openAdmin() {
  nw.Shell.openExternal('http://localhost:3001/admin/');
}

// ──────────── Event Bindings ────────────
btnStart.addEventListener('click', () => startServers());
btnStop.addEventListener('click', () => stopServers());
btnRestart.addEventListener('click', () => restartServers());
btnClear.addEventListener('click', () => clearLog());
btnBrowser.addEventListener('click', () => openBrowser());

// ──────────── Window Close ────────────
const win = nw.Window.get();

win.on('close', function () {
  if (isRunning) {
    const confirmed = confirm('サーバーが稼働中です。終了してもよろしいですか？');
    if (!confirmed) return;
  }

  // Clean up child processes before exit
  if (backendProc) {
    try { process.kill(backendProc.pid, 'SIGTERM'); } catch (_) {}
  }
  if (frontendProc) {
    try { process.kill(frontendProc.pid, 'SIGTERM'); } catch (_) {}
  }

  // Force cleanup
  try {
    execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' });
  } catch (_) {}

  // Close the window
  this.close(true);
});

// ──────────── Keyboard shortcuts ────────────
document.addEventListener('keydown', (e) => {
  // F5 = Start/Restart
  if (e.key === 'F5') {
    e.preventDefault();
    if (isRunning) restartServers();
    else startServers();
  }
  // Ctrl+Q = Quit
  if (e.ctrlKey && e.key === 'q') {
    e.preventDefault();
    win.close();
  }
});

// ──────────── Init ────────────
updateButtons();
log('Server Manager started', 'system');
log('Press Start to begin, or F5', 'system');
