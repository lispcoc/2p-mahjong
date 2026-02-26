#!/usr/bin/env node
/**
 * Server Manager for Mahjong Game — Standalone single-exe version.
 *
 * Runs a tiny HTTP server on port 3100 with embedded HTML/CSS/JS.
 * Uses Server-Sent Events (SSE) for real-time log streaming.
 * All UI assets are inlined — no external files needed.
 *
 * Build: npm run deploy   (uses @yao-pkg/pkg)
 * Run:   ServerManager.exe (or node standalone.js)
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

// ─── Paths ───
// When compiled with pkg, process.execPath is the exe location.
// When run with node, __dirname is the script dir → go up one level.
const ROOT = fs.existsSync(path.join(path.dirname(process.execPath), 'backend'))
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, '..');

const BACKEND_DIR  = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const LOGS_DIR     = path.join(ROOT, 'logs');
const MANAGER_PORT = 3100;

// ─── State ───
let backendProc  = null;
let frontendProc = null;
let isRunning    = false;

/** @type {{ ts: string, cat: string, msg: string }[]} */
const logBuffer = [];
const MAX_LOG = 2000;

/** @type {Set<http.ServerResponse>} */
const sseClients = new Set();

// ─── Log ───
function ts() { return new Date().toTimeString().slice(0, 8); }

function log(msg, cat = 'system') {
  const entry = { ts: ts(), cat, msg };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG) logBuffer.shift();
  for (const res of sseClients) {
    try { res.write(`data: ${JSON.stringify(entry)}\n\n`); } catch (_) {}
  }
}

// ─── Process helpers ───
function cleanupProcesses() {
  log('Cleaning up processes…');
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
  log('Cleanup completed');
}

function spawnServer(cmd, args, cwd, cat) {
  const proc = spawn(cmd, args, {
    cwd, shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const handle = d => d.toString('utf-8').trim().split('\n').forEach(l => { if (l.trim()) log(l.trim(), cat); });
  proc.stdout.on('data', handle);
  proc.stderr.on('data', handle);
  proc.on('error', e => log(`Process error: ${e.message}`, 'error'));
  proc.on('exit', (code, sig) => {
    const label = cat === 'backend' ? 'Backend' : 'Frontend';
    if (code !== null && code !== 0) log(`${label} exited with code ${code}`, 'error');
    else if (sig) log(`${label} killed (${sig})`, 'system');
    if (cat === 'backend') backendProc = null;
    else frontendProc = null;
    if (!backendProc && !frontendProc && isRunning) { isRunning = false; broadcastStatus(); }
  });
  return proc;
}

function broadcastStatus() {
  const s = { isRunning, backend: backendProc ? 'running' : 'stopped', frontend: frontendProc ? 'running' : 'stopped' };
  for (const res of sseClients) {
    try { res.write(`event: status\ndata: ${JSON.stringify(s)}\n\n`); } catch (_) {}
  }
}

// ─── Actions ───
async function startServers() {
  if (isRunning) { log('Servers are already running'); return; }
  if (!fs.existsSync(BACKEND_DIR))  { log('ERROR: backend/ not found', 'error'); return; }
  if (!fs.existsSync(FRONTEND_DIR)) { log('ERROR: frontend/ not found', 'error'); return; }
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

  log('===== Starting Servers =====');
  cleanupProcesses();

  log('Starting backend: npm start (port 3001)');
  backendProc = spawnServer('npm', ['start'], BACKEND_DIR, 'backend');
  broadcastStatus();
  await delay(3000);

  log('Starting frontend: npm run dev (port 3000)');
  frontendProc = spawnServer('npm', ['run', 'dev'], FRONTEND_DIR, 'frontend');
  await delay(3000);

  isRunning = true;
  broadcastStatus();
  log('Ready!', 'success');
  log('Browser: http://localhost:3000', 'success');
  log('Backend API: http://localhost:3001', 'success');
}

function stopServers() {
  if (!isRunning && !backendProc && !frontendProc) { log('Servers are not running'); return; }
  log('===== Stopping Servers =====');
  if (backendProc)  { try { process.kill(backendProc.pid, 'SIGTERM'); } catch (_) {} backendProc = null; }
  if (frontendProc) { try { process.kill(frontendProc.pid, 'SIGTERM'); } catch (_) {} frontendProc = null; }
  setTimeout(() => { cleanupProcesses(); isRunning = false; broadcastStatus(); log('Servers stopped'); }, 1000);
}

async function restartServers() {
  log('===== Restarting Servers =====');
  stopServers();
  await delay(3000);
  await startServers();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════ Embedded HTML ═══════════════════
const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>Server Manager - Mahjong Game</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','Meiryo',sans-serif;background:#1a1a2e;color:#e0e0e0;height:100vh;overflow:hidden;user-select:none}
.container{display:flex;flex-direction:column;height:100vh;padding:16px;gap:12px}
.header{text-align:center;padding:8px 0}
.header h1{font-size:20px;font-weight:700;color:#e0e0e0;letter-spacing:.5px}
.status-bar{display:flex;gap:12px;justify-content:center}
.status-item{display:flex;align-items:center;gap:8px;background:#16213e;padding:8px 16px;border-radius:8px;border:1px solid #0f3460}
.status-label{font-size:13px;color:#a0a0b0}
.status-badge{font-size:12px;font-weight:600;padding:2px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.5px}
.status-badge.stopped{background:#4a1525;color:#ff6b6b;border:1px solid #ff6b6b44}
.status-badge.starting{background:#3a3515;color:#ffd93d;border:1px solid #ffd93d44}
.status-badge.running{background:#153a25;color:#6bff8b;border:1px solid #6bff8b44}
.controls{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.btn{display:flex;align-items:center;gap:6px;padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;color:#fff}
.btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.15)}
.btn:active:not(:disabled){transform:translateY(0)}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-icon{font-size:14px}
.btn-start{background:#2d8a4e}.btn-stop{background:#c0392b}.btn-restart{background:#2980b9}.btn-clear{background:#555}
.btn-browser{background:#16213e;border:1px solid #0f3460;font-size:12px;padding:6px 14px}
.btn-browser:hover:not(:disabled){background:#1a2a50}
.log-section{flex:1;display:flex;flex-direction:column;min-height:0}
.log-header{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;font-size:13px;font-weight:600;color:#a0a0b0}
.log-filters{display:flex;gap:12px;font-size:11px;font-weight:400}
.log-filters label{display:flex;align-items:center;gap:4px;cursor:pointer;color:#808090}
.log-filters input[type=checkbox]{accent-color:#2980b9}
.log-box{flex:1;background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:10px;overflow-y:auto;font-family:'Cascadia Code','Consolas','Courier New',monospace;font-size:12px;line-height:1.6;min-height:0}
.log-box::-webkit-scrollbar{width:8px}.log-box::-webkit-scrollbar-track{background:#0d1117}.log-box::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}
.log-entry{padding:1px 0;word-break:break-all}
.log-entry .timestamp{color:#484f58;margin-right:6px}
.log-entry.system{color:#8b949e}.log-entry.system .prefix{color:#58a6ff}
.log-entry.backend{color:#c9d1d9}.log-entry.backend .prefix{color:#3fb950}
.log-entry.frontend{color:#c9d1d9}.log-entry.frontend .prefix{color:#d2a8ff}
.log-entry.error{color:#f85149}.log-entry.error .prefix{color:#f85149}
.log-entry.success{color:#3fb950}
.footer{display:flex;align-items:center;gap:12px;padding-top:4px}
.api-info{font-size:12px;color:#606070}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>🀄 Mahjong Game — Server Manager</h1></div>
  <div class="status-bar">
    <div class="status-item"><span class="status-label">Backend (port 3001)</span><span id="backend-status" class="status-badge stopped">Stopped</span></div>
    <div class="status-item"><span class="status-label">Frontend (port 3000)</span><span id="frontend-status" class="status-badge stopped">Stopped</span></div>
  </div>
  <div class="controls">
    <button id="btn-start" class="btn btn-start"><span class="btn-icon">▶</span> Start</button>
    <button id="btn-stop" class="btn btn-stop" disabled><span class="btn-icon">■</span> Stop</button>
    <button id="btn-restart" class="btn btn-restart" disabled><span class="btn-icon">↻</span> Restart</button>
    <button id="btn-clear" class="btn btn-clear"><span class="btn-icon">🗑</span> Clear</button>
  </div>
  <div class="log-section">
    <div class="log-header"><span>Log</span>
      <div class="log-filters">
        <label><input type="checkbox" id="filter-backend" checked> Backend</label>
        <label><input type="checkbox" id="filter-frontend" checked> Frontend</label>
        <label><input type="checkbox" id="filter-system" checked> System</label>
      </div>
    </div>
    <div id="log-box" class="log-box"></div>
  </div>
  <div class="footer">
    <button id="btn-browser" class="btn btn-browser">🌐 Open http://localhost:3000</button>
    <span class="api-info">API: http://localhost:3001</span>
  </div>
</div>
<script>
const logBox=document.getElementById('log-box'),
  beStatus=document.getElementById('backend-status'),
  feStatus=document.getElementById('frontend-status'),
  btnStart=document.getElementById('btn-start'),
  btnStop=document.getElementById('btn-stop'),
  btnRestart=document.getElementById('btn-restart'),
  btnClear=document.getElementById('btn-clear'),
  btnBrowser=document.getElementById('btn-browser'),
  fBe=document.getElementById('filter-backend'),
  fFe=document.getElementById('filter-frontend'),
  fSys=document.getElementById('filter-system');
let autoScroll=true;

const prefixMap={system:'SYS',backend:'BE',frontend:'FE',error:'ERR',success:'OK'};
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function addLog(ts,cat,msg){
  const el=document.createElement('div');
  el.className='log-entry '+(cat||'system');
  el.dataset.category=(cat==='error'||cat==='success')?'system':cat;
  el.innerHTML='<span class="timestamp">'+ts+'</span><span class="prefix">['+prefixMap[cat]+']</span> '+escapeHtml(msg);
  logBox.appendChild(el);applyFilters();
  if(autoScroll)logBox.scrollTop=logBox.scrollHeight;
}
function applyFilters(){
  const show={backend:fBe.checked,frontend:fFe.checked,system:fSys.checked};
  logBox.querySelectorAll('.log-entry').forEach(el=>{el.style.display=show[el.dataset.category||'system']?'':'none'});
}
function setStatus(el,state){
  el.className='status-badge '+state;
  el.textContent={stopped:'Stopped',starting:'Starting…',running:'Running'}[state]||state;
}
function updateUI(s){
  setStatus(beStatus,s.backend);setStatus(feStatus,s.frontend);
  btnStart.disabled=s.isRunning;btnStop.disabled=!s.isRunning;btnRestart.disabled=!s.isRunning;
}
logBox.addEventListener('scroll',()=>{autoScroll=logBox.scrollHeight-logBox.scrollTop-logBox.clientHeight<40});
fBe.addEventListener('change',applyFilters);fFe.addEventListener('change',applyFilters);fSys.addEventListener('change',applyFilters);

async function api(action){
  try{const r=await fetch('/api/'+action,{method:'POST'});return r.json()}catch(e){addLog(new Date().toTimeString().slice(0,8),'error','API error: '+e.message)}
}
btnStart.addEventListener('click',()=>api('start'));
btnStop.addEventListener('click',()=>api('stop'));
btnRestart.addEventListener('click',()=>api('restart'));
btnClear.addEventListener('click',()=>{logBox.innerHTML='';addLog(new Date().toTimeString().slice(0,8),'system','Log cleared')});
btnBrowser.addEventListener('click',()=>window.open('http://localhost:3000','_blank'));

document.addEventListener('keydown',e=>{
  if(e.key==='F5'){e.preventDefault();api(btnStart.disabled?'restart':'start')}
  if(e.ctrlKey&&e.key==='q'){e.preventDefault();window.close()}
});

// SSE connection
function connectSSE(){
  const es=new EventSource('/api/events');
  es.onmessage=e=>{const d=JSON.parse(e.data);addLog(d.ts,d.cat,d.msg)};
  es.addEventListener('status',e=>updateUI(JSON.parse(e.data)));
  es.addEventListener('init',e=>{const logs=JSON.parse(e.data);logs.forEach(d=>addLog(d.ts,d.cat,d.msg))});
  es.onerror=()=>{es.close();setTimeout(connectSSE,2000)};
}
connectSSE();

// Get initial status
fetch('/api/status').then(r=>r.json()).then(updateUI).catch(()=>{});
</script>
</body>
</html>`;

// ═══════════════════ HTTP Server ═══════════════════
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${MANAGER_PORT}`);

  // Serve UI
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  // SSE endpoint
  if (req.method === 'GET' && url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    // Send buffered logs
    res.write(`event: init\ndata: ${JSON.stringify(logBuffer)}\n\n`);
    // Send current status
    const s = { isRunning, backend: backendProc ? 'running' : 'stopped', frontend: frontendProc ? 'running' : 'stopped' };
    res.write(`event: status\ndata: ${JSON.stringify(s)}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Status endpoint
  if (req.method === 'GET' && url.pathname === '/api/status') {
    const s = { isRunning, backend: backendProc ? 'running' : 'stopped', frontend: frontendProc ? 'running' : 'stopped' };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(s));
    return;
  }

  // Action endpoints
  if (req.method === 'POST') {
    const action = url.pathname.replace('/api/', '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (action === 'start')        { startServers(); res.end('{"ok":true}'); }
    else if (action === 'stop')    { stopServers();  res.end('{"ok":true}'); }
    else if (action === 'restart') { restartServers(); res.end('{"ok":true}'); }
    else { res.writeHead(404); res.end('{"error":"not found"}'); }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// ─── Start ───
server.listen(MANAGER_PORT, '127.0.0.1', () => {
  const url = `http://localhost:${MANAGER_PORT}`;
  console.log(`Server Manager running at ${url}`);
  log('Server Manager started');
  log(`Management UI: ${url}`);
  log('Press Start to begin, or F5');

  // Auto-open browser
  try {
    const { exec } = require('child_process');
    exec(`start "" "${url}"`);
  } catch (_) {}
});

// ─── Graceful shutdown ───
function shutdown() {
  console.log('Shutting down…');
  if (backendProc)  { try { process.kill(backendProc.pid, 'SIGTERM'); } catch (_) {} }
  if (frontendProc) { try { process.kill(frontendProc.pid, 'SIGTERM'); } catch (_) {} }
  try { execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' }); } catch (_) {}
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
