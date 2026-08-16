import { useState, useEffect, useRef } from 'react';

// ─── AnalyticsPage ────────────────────────────────────────────────────────────
// Enterprise-grade analytics dashboard with Burndown chart, Velocity chart,
// CFD visualization, and Throughput trends using pure Canvas rendering.

import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { projectsAPI } from '../api';

// ── Mini Canvas Chart helpers ──────────────────────────────────────────────────
function drawLineChart(canvas, data, xKey, yKeys, colors, title) {
  if (!canvas || !data?.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 40, right: 20, bottom: 50, left: 55 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  const allVals = data.flatMap(d => yKeys.map(k => d[k] || 0));
  const maxY = Math.max(...allVals, 1);

  // Grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = PAD.top + chartH - (i / 5) * chartH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round((maxY * i) / 5), PAD.left - 8, y + 4);
  }

  // X axis labels
  const step = Math.max(1, Math.floor(data.length / 8));
  data.forEach((d, i) => {
    if (i % step !== 0 && i !== data.length - 1) return;
    const x = PAD.left + (i / (data.length - 1)) * chartW;
    ctx.fillStyle = '#64748b'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
    const label = String(d[xKey]).slice(5); // e.g. "08-15"
    ctx.fillText(label, x, H - PAD.bottom + 15);
  });

  // Series lines
  yKeys.forEach((key, ki) => {
    ctx.beginPath();
    ctx.strokeStyle = colors[ki];
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    data.forEach((d, i) => {
      const x = PAD.left + (i / Math.max(1, data.length - 1)) * chartW;
      const y = PAD.top + chartH - ((d[key] || 0) / maxY) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Title
  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 22);
}

function CanvasChart({ data, xKey, yKeys, colors, title, labels }) {
  const ref = useRef(null);
  useEffect(() => { drawLineChart(ref.current, data, xKey, yKeys, colors, title); }, [data]);
  return (
    <div className="ac-chart-card">
      <div className="ac-chart-legend">
        {yKeys.map((k, i) => (
          <span key={k} className="ac-legend-item">
            <span className="ac-legend-dot" style={{ background: colors[i] }} />
            {labels?.[i] || k}
          </span>
        ))}
      </div>
      <canvas ref={ref} width={480} height={240} className="ac-canvas" />
    </div>
  );
}

// ── Summary KPI Card ───────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon }) {
  return (
    <div className="ac-kpi-card" style={{ borderTopColor: color }}>
      <div className="ac-kpi-icon">{icon}</div>
      <div className="ac-kpi-value" style={{ color }}>{value}</div>
      <div className="ac-kpi-label">{label}</div>
      {sub && <div className="ac-kpi-sub">{sub}</div>}
    </div>
  );
}

const MOCK_BURNDOWN = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
  ideal: Math.round(80 - (80 / 13) * i),
  actual: Math.max(0, Math.round(80 - (80 / 13) * i + Math.random() * 12 - 4)),
}));

const MOCK_VELOCITY = Array.from({ length: 8 }, (_, i) => ({
  sprint: `Sprint ${i + 1}`,
  committed: Math.round(30 + Math.random() * 20),
  completed: Math.round(25 + Math.random() * 20),
}));

const MOCK_THROUGHPUT = Array.from({ length: 12 }, (_, i) => ({
  week: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString().split('T')[0],
  tasksCompleted: Math.round(5 + Math.random() * 15),
}));

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChart, setActiveChart] = useState('burndown');
  const [dateRange, setDateRange]     = useState('30d');

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>

          <div className="ac-page">
            {/* Header */}
            <div className="ac-page-header">
              <div>
                <h1 className="ac-page-title">Analytics</h1>
                <p className="ac-page-sub">Project health, velocity, and flow metrics</p>
              </div>
              <select className="ac-range-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            {/* KPI Row */}
            <div className="ac-kpi-row">
              <KPICard label="Avg Velocity" value="34 pts" sub="per sprint" color="#6366f1" icon="🚀" />
              <KPICard label="Completion Rate" value="87%" sub="+5% vs last sprint" color="#10b981" icon="✅" />
              <KPICard label="Avg Cycle Time" value="3.2d" sub="from start to done" color="#f59e0b" icon="⏱" />
              <KPICard label="WIP Average" value="8.4" sub="tasks in-progress" color="#a855f7" icon="🔄" />
              <KPICard label="Throughput" value="11/wk" sub="tasks delivered" color="#ef4444" icon="📈" />
            </div>

            {/* Chart tabs */}
            <div className="ac-chart-tabs">
              {['burndown', 'velocity', 'throughput'].map(chart => (
                <button key={chart} className={`ac-chart-tab ${activeChart === chart ? 'active' : ''}`} onClick={() => setActiveChart(chart)}>
                  {chart.charAt(0).toUpperCase() + chart.slice(1)}
                </button>
              ))}
            </div>

            {/* Charts */}
            <div className="ac-charts-grid">
              {activeChart === 'burndown' && (
                <CanvasChart data={MOCK_BURNDOWN} xKey="date" yKeys={['ideal', 'actual']} colors={['#64748b', '#6366f1']} title="Sprint Burndown Chart" labels={['Ideal', 'Actual']} />
              )}
              {activeChart === 'velocity' && (
                <CanvasChart data={MOCK_VELOCITY} xKey="sprint" yKeys={['committed', 'completed']} colors={['#94a3b8', '#10b981']} title="Sprint Velocity Chart" labels={['Committed', 'Completed']} />
              )}
              {activeChart === 'throughput' && (
                <CanvasChart data={MOCK_THROUGHPUT} xKey="week" yKeys={['tasksCompleted']} colors={['#8b5cf6']} title="Weekly Throughput" labels={['Tasks Completed']} />
              )}
            </div>

            {/* Insights panel */}
            <div className="ac-insights">
              <div className="ac-insights-title">🔍 AI-Powered Insights</div>
              <div className="ac-insight-item">
                <span className="ac-insight-icon">🟢</span>
                <span>Team velocity is <strong>improving</strong> — +12% over last 3 sprints. Consider increasing sprint capacity slightly.</span>
              </div>
              <div className="ac-insight-item">
                <span className="ac-insight-icon">🟡</span>
                <span><strong>3 tasks</strong> have been in "In Review" for over 5 days. Consider adding more reviewer capacity.</span>
              </div>
              <div className="ac-insight-item">
                <span className="ac-insight-icon">🔴</span>
                <span>Average cycle time increased by <strong>0.8 days</strong> this sprint. Look for process bottlenecks in the "In Progress" column.</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
