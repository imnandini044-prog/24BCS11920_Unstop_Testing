import express from 'express';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';

try { process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')); } catch { /* optional local configuration */ }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
const apiPort = Number(process.env.API_PORT || 4174);
const dashboardPort = Number(process.env.DASHBOARD_PORT || 5173);
const reportRoot = path.join(root, 'reports', 'runs');
const history = [];
let active = null;
const dashboardOrigins = new Set([`http://localhost:${dashboardPort}`, `http://127.0.0.1:${dashboardPort}`]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (dashboardOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '256kb' }));
await mkdir(reportRoot, { recursive: true });
for (const entry of (await readdir(reportRoot, { withFileTypes: true })).filter((item) => item.isDirectory()).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 10)) {
  try {
    const saved = JSON.parse(await readFile(path.join(reportRoot, entry.name, 'report.json'), 'utf8'));
    saved.reportUrl = `http://127.0.0.1:${apiPort}/reports/runs/${entry.name}/report.html`;
    history.push(saved);
  } catch { /* Ignore incomplete report folders. */ }
}

function totals(tests = []) {
  const passed = tests.filter((t) => t.state === 'passed').length;
  const failed = tests.filter((t) => t.state === 'failed').length;
  const pending = Math.max(0, 12 - passed - failed);
  return { total: 12, passed, failed, pending, passRate: passed + failed ? Math.round(passed / (passed + failed) * 100) : 0 };
}
function safeError(error) {
  const msg = String(error?.message || error);
  return msg.replace(/(https?:\/\/[^\s?]+)\?[^\s]*/g, '$1?[redacted]');
}
async function persist(run) {
  const dir = path.join(reportRoot, run.id);
  await mkdir(dir, { recursive: true });
  run.reportUrl = `http://127.0.0.1:${apiPort}/reports/runs/${run.id}/report.html`;
  const result = { ...run, totals: totals(run.tests) };
  await writeFile(path.join(dir, 'report.json'), JSON.stringify(result, null, 2));
  const rows = run.tests.map((t) => `<tr><td>${escapeHtml(t.fullTitle || t.title)}</td><td>${escapeHtml(t.state)}</td><td>${escapeHtml(t.duration || 0)} ms</td><td><pre>${escapeHtml(t.error?.message || '')}</pre></td></tr>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>Unstop E2E report ${run.id}</title><style>body{font:15px system-ui;max-width:1100px;margin:40px auto;padding:0 20px;color:#182534}table{width:100%;border-collapse:collapse}td,th{padding:12px;border-bottom:1px solid #dce4ec;text-align:left}pre{white-space:pre-wrap;color:#a23b45}h1{color:#126b64}</style><h1>Unstop E2E Test Lab</h1><p>Run ${escapeHtml(run.id)} · ${escapeHtml(run.status)} · ${run.tests.length}/12 events received</p><p>Passed ${result.totals.passed} · Failed ${result.totals.failed} · Pending ${result.totals.pending} · Pass rate ${result.totals.passRate}%</p><table><thead><tr><th>Test</th><th>Result</th><th>Duration</th><th>Failure details</th></tr></thead><tbody>${rows}</tbody></table>`;
  await writeFile(path.join(dir, 'report.html'), html);
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

app.get('/api/health', (_req, res) => res.json({ ok: true, apiPort, dashboardPort, activeRun: active?.id || null }));
app.get('/api/status', (_req, res) => res.json({ active, latest: history[0] || null, history, totals: totals(active?.tests || []) }));
app.post('/api/runs', async (req, res) => {
  if (active) return res.status(409).json({ error: `Run ${active.id} is already active. Wait for it to finish before launching another.` });
  const headed = req.body?.headed !== false;
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  active = { id, status: 'starting', headed, startedAt: new Date().toISOString(), finishedAt: null, tests: [], output: '', error: null, reportUrl: null };
  await persist(active);
  res.status(202).json(active);
  launch(active, headed);
});
app.post('/api/runs/:id/tests', async (req, res) => {
  if (!active || active.id !== req.params.id) return res.status(404).json({ error: 'Run not found or no longer active' });
  const test = req.body;
  const prior = active.tests.findIndex((t) => t.fullTitle === test.fullTitle);
  if (prior >= 0) active.tests[prior] = test; else active.tests.push(test);
  active.status = 'running';
  await persist(active);
  res.json({ ok: true, totals: totals(active.tests) });
});
async function launch(run, headed) {
  const cypressCli = path.join(root, 'node_modules', 'cypress', 'bin', 'cypress');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.API_PORT = String(apiPort);
  const args = [cypressCli, 'run', '--e2e', '--browser', 'chrome', ...(headed ? ['--headed'] : []), '--env', `runId=${run.id}`];
  try {
    const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: false, stdio: ['ignore', 'pipe', 'pipe'] });
    run.status = 'running';
    const collect = (buf) => { run.output = (run.output + buf.toString()).slice(-16000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', async (error) => { run.status = 'failed'; run.error = safeError(error); await finish(run); });
    child.on('close', async (code) => {
      run.status = code === 0 ? 'passed' : 'failed';
      if (code !== 0) run.error = `Cypress exited with code ${code}. Check Chrome installation, site availability, or the report details.`;
      await finish(run);
    });
  } catch (error) { run.status = 'failed'; run.error = safeError(error); await finish(run); }
}
async function finish(run) {
  run.finishedAt = new Date().toISOString();
  await persist(run);
  history.unshift({ id: run.id, status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, tests: run.tests, totals: totals(run.tests), reportUrl: run.reportUrl, error: run.error });
  history.splice(10);
  active = null;
  const directories = (await readdir(reportRoot, { withFileTypes: true })).filter((e) => e.isDirectory()).sort((a, b) => b.name.localeCompare(a.name));
  for (const dir of directories.slice(10)) {
    await rm(path.join(reportRoot, dir.name), { recursive: true, force: true });
  }
}

app.use('/reports', express.static(path.join(root, 'reports')));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
async function canBind(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}
const ports = [
  ['API', apiPort],
  ['Dashboard', dashboardPort]
];
const portChecks = await Promise.all(ports.map(async ([label, port]) => ({ label, port, available: await canBind(port) })));
const unavailable = portChecks.filter((item) => !item.available);
if (unavailable.length) {
  for (const item of unavailable) console.error(`${item.label} port ${item.port} is already in use.`);
  console.error(`The Unstop E2E Test Lab may already be running. Open http://localhost:${dashboardPort} or stop its existing server with Ctrl+C before starting another.`);
  process.exit(1);
}
const apiServer = app.listen(apiPort, '127.0.0.1', () => {
  console.log(`Dashboard API listening at http://127.0.0.1:${apiPort}`);
  createViteServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true, strictPort: true, port: dashboardPort }, appType: 'spa' }).then((vite) => {
    const uiServer = createServer((req, res) => vite.middlewares(req, res, (err) => {
      if (err) { res.statusCode = 500; res.end(safeError(err)); }
      else { res.statusCode = 404; res.end('Not found'); }
    }));
    uiServer.listen(dashboardPort, '127.0.0.1', () => console.log(`Dashboard available at http://localhost:${dashboardPort}`));
    uiServer.on('error', (e) => console.error(`Dashboard port ${dashboardPort} is unavailable. Stop the process using that port or change DASHBOARD_PORT in .env. ${e.message}`));
  }).catch((e) => console.error('Unable to start Vite dashboard:', e.message));
});
apiServer.on('error', (e) => { console.error(`API port ${apiPort} is unavailable. Stop the process using that port or set API_PORT in .env. ${e.message}`); process.exitCode = 1; });
