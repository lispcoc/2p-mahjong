/**
 * Server Manager for Mahjong Game — Renderer (Electron)
 *
 * UI のみ。サーバープロセス管理はすべてメインプロセス (electron-main.js) が担当。
 * window.electronAPI (contextBridge) 経由で IPC 通信する。
 */

// ──────────── State (UI のみ) ────────────
let autoScroll = true;
let isRunning  = false;

// ──────────── DOM refs ────────────
const logBox        = document.getElementById('log-box');
const backendStatus = document.getElementById('backend-status');
const frontendStatus= document.getElementById('frontend-status');
const btnStart      = document.getElementById('btn-start');
const btnStop       = document.getElementById('btn-stop');
const btnRestart    = document.getElementById('btn-restart');
const btnClear      = document.getElementById('btn-clear');
const btnBrowser    = document.getElementById('btn-browser');
const filterBackend = document.getElementById('filter-backend');
const filterFrontend= document.getElementById('filter-frontend');
const filterSystem  = document.getElementById('filter-system');
const modeDevBtn    = document.getElementById('mode-dev');
const modeStartBtn  = document.getElementById('mode-start');
const modeDescription = document.getElementById('mode-description');

// ──────────── Mode Toggle ────────────
const MODE_DESCRIPTIONS = {
  dev:   'Hot reload enabled (nodemon + next dev)',
  start: 'Production mode (node + next start)',
};

function setModeUI(mode) {
  modeDevBtn.classList.toggle('active', mode === 'dev');
  modeStartBtn.classList.toggle('active', mode === 'start');
  modeDescription.textContent = MODE_DESCRIPTIONS[mode] || '';
}

modeDevBtn.addEventListener('click', () => {
  if (isRunning) { log('Cannot switch mode while servers are running', 'error'); return; }
  window.electronAPI.setMode('dev');
});
modeStartBtn.addEventListener('click', () => {
  if (isRunning) { log('Cannot switch mode while servers are running', 'error'); return; }
  window.electronAPI.setMode('start');
});

// ──────────── Log Utilities ────────────
const prefixMap = { system: 'SYS', backend: 'BE', frontend: 'FE', error: 'ERR', success: 'OK' };

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function log(message, category = 'system') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${category}`;
  entry.dataset.category = (category === 'error' || category === 'success') ? 'system' : category;
  const ts = new Date().toTimeString().slice(0, 8);
  entry.innerHTML =
    `<span class="timestamp">${ts}</span>` +
    `<span class="prefix">[${prefixMap[category] || 'SYS'}]</span> ` +
    escapeHtml(message);
  logBox.appendChild(entry);
  applyFilters();
  if (autoScroll) logBox.scrollTop = logBox.scrollHeight;
}

function applyFilters() {
  const show = {
    backend:  filterBackend.checked,
    frontend: filterFrontend.checked,
    system:   filterSystem.checked,
  };
  logBox.querySelectorAll('.log-entry').forEach((el) => {
    const cat = el.dataset.category || 'system';
    el.style.display = show[cat] ? '' : 'none';
  });
}

logBox.addEventListener('scroll', () => {
  autoScroll = logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight < 40;
});
filterBackend.addEventListener('change', applyFilters);
filterFrontend.addEventListener('change', applyFilters);
filterSystem.addEventListener('change', applyFilters);

// ──────────── Status / Button helpers ────────────
function setStatus(el, state) {
  el.className = `status-badge ${state}`;
  el.textContent = { stopped: 'Stopped', starting: 'Starting…', running: 'Running' }[state] || state;
}

function updateUI(s) {
  isRunning = s.isRunning;
  setStatus(backendStatus,  s.backend);
  setStatus(frontendStatus, s.frontend);
  btnStart.disabled   =  s.isRunning;
  btnStop.disabled    = !s.isRunning;
  btnRestart.disabled = !s.isRunning;
  if (s.serverMode) setModeUI(s.serverMode);
}

// ──────────── IPC イベント受信 ────────────
window.electronAPI.onLog((entry) => {
  log(entry.msg, entry.cat);
});

window.electronAPI.onStatus((s) => {
  updateUI(s);
});

// ──────────── ボタン操作 ────────────
btnStart.addEventListener('click',   () => window.electronAPI.start());
btnStop.addEventListener('click',    () => window.electronAPI.stop());
btnRestart.addEventListener('click', () => window.electronAPI.restart());
btnClear.addEventListener('click',   () => { logBox.innerHTML = ''; log('Log cleared', 'system'); });
btnBrowser.addEventListener('click', () => window.electronAPI.openUrl('http://localhost:3000'));

function openAdmin() {
  window.electronAPI.openUrl('http://localhost:3001/mjadmin/');
}

function switchTabLog() {
  // ログタブのみ（将来の拡張用プレースホルダー）
}

// ──────────── キーボードショートカット ────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') {
    e.preventDefault();
    if (isRunning) window.electronAPI.restart();
    else window.electronAPI.start();
  }
  if (e.ctrlKey && e.key === 'q') {
    e.preventDefault();
    window.close();
  }
});

// ──────────── 初期化 ────────────
window.electronAPI.getStatus().then(updateUI).catch(() => {});
log('Server Manager started', 'system');
log('Press Start to begin, or F5', 'system');
