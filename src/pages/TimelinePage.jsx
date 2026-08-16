import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

// ─── TimelinePage ─────────────────────────────────────────────────────────────
// Roadmap-style Gantt timeline showing epics and their date ranges as
// horizontal bars, with zoom levels (week/month/quarter) and today marker.

const COLORS = ['#6366f1','#8b5cf6','#a855f7','#ec4899','#ef4444','#f97316','#f59e0b','#10b981','#14b8a6','#06b6d4','#3b82f6'];

function dateToPercent(date, start, totalMs) {
  return ((new Date(date) - new Date(start)) / totalMs) * 100;
}

function diffDays(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 86400000);
}

function GanttBar({ epic, idx, viewStart, totalMs, zoom }) {
  if (!epic.startDate && !epic.dueDate) return null;
  const start    = epic.startDate || epic.dueDate;
  const end      = epic.dueDate   || epic.startDate;
  const left     = Math.max(0, Math.min(100, dateToPercent(start, viewStart, totalMs)));
  const right    = Math.max(0, Math.min(100, dateToPercent(end, viewStart, totalMs)));
  const width    = Math.max(0.5, right - left);
  const duration = diffDays(start, end);
  const isOverdue = new Date(end) < Date.now() && epic.status !== 'done';
  const color = isOverdue ? '#ef4444' : COLORS[idx % COLORS.length];
  const progress = epic.completionPercent || 0;

  return (
    <div className="tl-bar-wrapper" title={`${epic.title}\n${start} → ${end}\n${duration} days`}>
      <div className="tl-bar" style={{ left: `${left}%`, width: `${width}%`, background: `${color}33`, border: `1.5px solid ${color}` }}>
        <div className="tl-bar-fill" style={{ width: `${progress}%`, background: color, opacity: 0.7 }} />
        <span className="tl-bar-label" style={{ color }}>{epic.title}</span>
      </div>
    </div>
  );
}

const ZOOM_CONFIGS = {
  week:    { days: 30,  label: 'Month' },
  month:   { days: 90,  label: 'Quarter' },
  quarter: { days: 365, label: 'Year' },
};

function generateDateHeaders(viewStart, totalDays, zoom) {
  const headers = [];
  const step = zoom === 'week' ? 7 : zoom === 'month' ? 14 : 30;
  for (let d = 0; d < totalDays; d += step) {
    const date = new Date(new Date(viewStart).getTime() + d * 86400000);
    headers.push({ date, pct: (d / totalDays) * 100 });
  }
  return headers;
}

export default function TimelinePage() {
  const [epics, setEpics]             = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom]               = useState('month');
  const [loading, setLoading]         = useState(true);
  const token = localStorage.getItem('agileflow_token');

  // View window
  const config     = ZOOM_CONFIGS[zoom];
  const viewStart  = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const totalMs    = config.days * 86400000;
  const dateHeaders = generateDateHeaders(viewStart, config.days, zoom);
  const todayPct   = dateToPercent(new Date(), viewStart, totalMs);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/epics?limit=100', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setEpics(data.epics || data || []);
      } catch { toast.error('Failed to load timeline'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Separate epics with and without dates
  const withDates = epics.filter(e => e.startDate || e.dueDate);
  const noDates   = epics.filter(e => !e.startDate && !e.dueDate);

  const STATUS_COLORS = { done: '#10b981', 'in-progress': '#6366f1', todo: '#64748b', blocked: '#ef4444' };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
          <div className="tl-page">
            {/* Header */}
            <div className="tl-header">
              <div>
                <h1 className="tl-title">Roadmap Timeline</h1>
                <p className="tl-subtitle">{withDates.length} epics scheduled · {noDates.length} unscheduled</p>
              </div>
              <div className="tl-zoom-btns">
                {Object.entries(ZOOM_CONFIGS).map(([z, cfg]) => (
                  <button key={z} className={`tl-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>{cfg.label}</button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="tl-legend">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <span key={status} className="tl-legend-item">
                  <span className="tl-legend-dot" style={{ background: color }} />{status}
                </span>
              ))}
              <span className="tl-legend-item"><span className="tl-legend-dot" style={{ background: '#ef4444' }} />overdue</span>
            </div>

            {loading ? <div className="tl-loading">Loading timeline…</div> : (
              <div className="tl-gantt">
                {/* Date header row */}
                <div className="tl-row-label" />
                <div className="tl-gantt-track tl-header-track">
                  {dateHeaders.map(({ date, pct }) => (
                    <div key={pct} className="tl-date-marker" style={{ left: `${pct}%` }}>
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  ))}
                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="tl-today-line" style={{ left: `${todayPct}%` }}>
                      <span className="tl-today-label">Today</span>
                    </div>
                  )}
                </div>

                {/* Epic rows */}
                {withDates.map((epic, i) => (
                  <div key={epic._id} className="tl-row">
                    <div className="tl-row-label">
                      <span className="tl-row-status" style={{ background: STATUS_COLORS[epic.status] || '#64748b' }} />
                      <span className="tl-row-name" title={epic.title}>{epic.title}</span>
                    </div>
                    <div className="tl-gantt-track">
                      {/* Today line in each row */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="tl-today-line-row" style={{ left: `${todayPct}%` }} />
                      )}
                      <GanttBar epic={epic} idx={i} viewStart={viewStart} totalMs={totalMs} zoom={zoom} />
                    </div>
                  </div>
                ))}

                {withDates.length === 0 && (
                  <div className="tl-empty">
                    <div className="tl-empty-icon">📅</div>
                    <p>No epics have start/due dates. Edit epics to add them to the timeline.</p>
                  </div>
                )}
              </div>
            )}

            {/* Unscheduled list */}
            {noDates.length > 0 && (
              <div className="tl-unscheduled">
                <div className="tl-unscheduled-title">Unscheduled ({noDates.length})</div>
                <div className="tl-unscheduled-list">
                  {noDates.map(e => (
                    <span key={e._id} className="tl-unscheduled-chip">{e.title}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
