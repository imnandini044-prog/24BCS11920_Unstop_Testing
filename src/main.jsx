import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = 'http://127.0.0.1:4174/api';
function App() {
  const [data, setData] = useState({ active: null, latest: null, history: [], totals: { total: 12, passed: 0, failed: 0, pending: 12, passRate: 0 } });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = () => fetch(`${API}/status`).then((r) => r.json()).then(setData).catch(() => setMessage('API unavailable. Start the project with npm run dev.'));
  useEffect(() => { refresh(); const timer = setInterval(refresh, 900); return () => clearInterval(timer); }, []);
  async function launch(headed) {
    setMessage(''); setBusy(true);
    try {
      const response = await fetch(`${API}/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ headed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not launch Cypress');
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const active = data.active;
  const current = active || data.latest;
  const totals = active ? data.totals : (data.latest?.totals || data.totals);
  const tests = active?.tests || data.latest?.tests || [];
  const known = new Map(tests.map((t) => [t.fullTitle || t.title, t]));
  const scenarios = [
    'Loads Unstop homepage and public visitor content', 'Shows Unstop branding and primary navigation', 'Navigates from homepage to Hackathons',
    'Shows hackathon listings and search/filter controls', 'Reads a hackathon card and opens an opportunity', 'Checks public hackathon details and eligibility',
    'Presents registration without submitting', 'Navigates to the public Internships section', 'Shows internship listings and controls',
    'Opens an internship and presents Quick Apply without submitting', 'Explores public Mentorship and mentor discovery', 'Loads another public section with job listings'
  ];
  return <main className="shell">
    <header className="topbar"><a className="wordmark" href="#"><span className="mark">U</span> UNSTOP <i>/</i> TEST LAB</a><div className="top-right"><span className="live-dot"/> PUBLIC E2E WORKSPACE <span className="version">v1.0</span></div></header>
    <section className="hero"><div><div className="eyebrow">QUALITY CONTROL / PUBLIC WEB FLOWS</div><h1>Unstop E2E<br/><em>Test Lab</em></h1><p>Launch the full browser suite and watch each public journey resolve in real time.</p><div className="actions"><button className="primary" disabled={busy || !!active} onClick={() => launch(true)}><span>▶</span> Launch Cypress</button><button className="secondary" disabled={busy || !!active} onClick={() => launch(false)}>Run headless <span>↗</span></button></div>{message && <div className="error">{message}</div>}<div className="privacy"><span>◈</span> Public pages only. No sign-in, applications, or registrations are submitted.</div></div>
      <div className="hero-graphic"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="core"><strong>12</strong><span>CASES</span></div><div className="orb orb1">✓</div><div className="orb orb2">⌁</div><div className="orb orb3">◎</div><div className="graphic-tag">{active ? 'RUN IN PROGRESS' : 'SUITE READY'}<b>{active ? '●' : '◉'}</b></div></div>
    </section>
    <section className="metrics"><Metric label="PASSED" value={totals.passed || 0} tone="green"/><Metric label="FAILED" value={totals.failed || 0} tone="red"/><Metric label="PENDING" value={totals.pending ?? 12} tone="muted"/><Metric label="PASS RATE" value={`${totals.passRate || 0}%`} tone="blue"/><div className="metric total"><span>SUITE SIZE</span><b>12 <small>E2E TESTS</small></b></div></section>
    <div className="section-head"><div><div className="eyebrow">EXECUTION MONITOR</div><h2>Live case results</h2></div><div className={`run-state ${active ? 'running' : ''}`}><span/> {active ? 'RUNNING' : current ? current.status.toUpperCase() : 'IDLE'} {active && <small>· {tests.length}/12 completed</small>}</div></div>
    <section className="results"><div className="result-head"><span>CASE</span><span>STATUS</span><span>DURATION</span></div>{scenarios.map((name, i) => { const test = [...known.entries()].find(([title]) => title.endsWith(name) || title.includes(`${i + 1}.`))?.[1]; const state = test?.state || 'pending'; return <div className="case" key={name}><span className="num">{String(i + 1).padStart(2, '0')}</span><span className="case-name">{name}</span><span className={`badge ${state}`}>{state}</span><span className="duration">{test?.duration ? `${(test.duration / 1000).toFixed(1)}s` : '—'}</span>{test?.error?.message && <div className="case-error">{test.error.message}</div>}</div>; })}</section>
    <section className="lower"><div className="history panel"><div className="panel-title"><div><div className="eyebrow">SAVED REPORTS / LAST 10 RUNS</div><h2>Run history</h2></div><span className="count">{data.history.length} / 10</span></div>{data.history.length ? data.history.map((run) => <div className="history-row" key={run.id}><span className={`history-icon ${run.status}`}>{run.status === 'passed' ? '✓' : '!'}</span><span><b>{new Date(run.startedAt).toLocaleString()}</b><small>{run.id}</small></span><span className="history-total">{run.totals?.passed || 0}<small> / 12 passed</small></span><span className="report-links"><a href={run.reportUrl} target="_blank" rel="noreferrer">HTML ↗</a><a href={run.reportUrl?.replace(/report\.html$/, 'report.json')} target="_blank" rel="noreferrer">JSON ↗</a></span></div>) : <div className="empty">No runs yet. Launch Cypress to begin.</div>}</div><div className="report panel"><div className="eyebrow">ARTIFACTS</div><h2>Detailed report</h2><p>Each execution saves a readable HTML report and structured JSON with failure details.</p>{data.history[0]?.reportUrl ? <a className="report-link" href={data.history[0].reportUrl} target="_blank" rel="noreferrer">Open latest report <span>↗</span></a> : <span className="disabled-link">Available after the first run</span>}<div className="report-footer">SCREENSHOTS + VIDEO · CYPRESS ARTIFACTS</div></div></section>
    <footer>UNSTOP E2E TEST LAB <span>BUILT FOR PUBLIC JOURNEYS <i>·</i> API :4174 <i>·</i> DASHBOARD :5173</span></footer>
  </main>;
}
function Metric({ label, value, tone }) { return <div className="metric"><span>{label}</span><b className={tone}>{value}</b></div>; }
createRoot(document.getElementById('root')).render(<App/>);
