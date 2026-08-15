import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import ActivityFeed from '../components/ActivityFeed';
import TeamCapacityPanel from '../components/TeamCapacityPanel';
import { sprintsAPI, tasksAPI } from '../api';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// ─── Radial Progress Arc ─────────────────────────────────────────────────────
function RadialProgress({ percent, size = 80, color = '#6366f1' }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle"
        fill="#e2e8f0" fontSize="13" fontWeight="700" fontFamily="Inter,sans-serif">
        {percent}%
      </text>
    </svg>
  );
}

// ─── Velocity Stat Card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#6366f1', icon }) {
  return (
    <div className="sprint-stat-card">
      <div className="sprint-stat-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      <div>
        <div className="sprint-stat-value" style={{ color }}>{value}</div>
        <div className="sprint-stat-label">{label}</div>
        {sub && <div className="sprint-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Task Row ────────────────────────────────────────────────────────────────
function TaskRow({ task }) {
  const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981', critical: '#a855f7' };
  const statusColors   = { todo: '#64748b', 'in-progress': '#3b82f6', done: '#10b981', blocked: '#ef4444' };
  return (
    <div className="sprint-task-row">
      <span className="sprint-task-key">{task.issueKey || '—'}</span>
      <span className="sprint-task-title">{task.title}</span>
      <span className="sprint-task-badge" style={{ background: `${priorityColors[task.priority] || '#64748b'}22`, color: priorityColors[task.priority] || '#64748b' }}>
        {task.priority}
      </span>
      <span className="sprint-task-badge" style={{ background: `${statusColors[task.status] || '#64748b'}22`, color: statusColors[task.status] || '#64748b' }}>
        {task.status}
      </span>
      <span className="sprint-task-points">{task.storyPoints ?? '—'} pts</span>
    </div>
  );
}

// ─── SprintPage ───────────────────────────────────────────────────────────────
export default function SprintPage() {
  const { sprintId } = useParams();
  const [sprint, setSprint]       = useState(null);
  const [velocity, setVelocity]   = useState(null);
  const [capacity, setCapacity]   = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | tasks | team | activity

  const load = useCallback(async () => {
    if (!sprintId) return;
    setLoading(true);
    try {
      const [sprintRes, velRes, capRes] = await Promise.all([
        sprintsAPI.getById ? sprintsAPI.getById(sprintId) : Promise.resolve({ data: null }),
        fetch(`/api/sprints/${sprintId}/velocity`, { headers: { Authorization: `Bearer ${localStorage.getItem('agileflow_token')}` } }).then(r => r.json()),
        fetch(`/api/sprints/${sprintId}/team-capacity`, { headers: { Authorization: `Bearer ${localStorage.getItem('agileflow_token')}` } }).then(r => r.json()),
      ]);
      setSprint(sprintRes?.data || velRes?.sprint);
      setVelocity(velRes?.velocity);
      setCapacity(capRes);
    } catch (err) {
      toast.error('Failed to load sprint data');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className="page-main"><Spinner /></main>
      </div>
    </div>
  );

  const v = velocity || {};
  const isOnTrack = v.isOnTrack;

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main sprint-page ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>

          {/* ── Header ── */}
          <div className="sprint-header">
            <div>
              <div className="sprint-header-meta">
                <Link to="/backlog" className="sprint-breadcrumb">← Backlogs</Link>
                <span className={`sprint-status-badge sprint-status-${sprint?.status || 'active'}`}>
                  {sprint?.status || 'active'}
                </span>
                {isOnTrack != null && (
                  <span className={`sprint-track-badge ${isOnTrack ? 'on-track' : 'off-track'}`}>
                    {isOnTrack ? '✓ On Track' : '⚠ Behind'}
                  </span>
                )}
              </div>
              <h1 className="sprint-title">{sprint?.name || 'Current Sprint'}</h1>
              {sprint?.goal && <p className="sprint-goal">Goal: {sprint.goal}</p>}
            </div>
            <div className="sprint-header-actions">
              <button className="btn btn-secondary" onClick={load}>Refresh</button>
            </div>
          </div>

          {/* ── Velocity Cards ── */}
          {velocity && (
            <div className="sprint-stats-grid">
              <div className="sprint-radial-card">
                <RadialProgress
                  percent={v.completionRate || 0}
                  color={isOnTrack ? '#10b981' : '#f59e0b'}
                />
                <div>
                  <div className="sprint-radial-label">Completion</div>
                  <div className="sprint-radial-sub">{v.donePoints}/{v.totalPoints} pts</div>
                </div>
              </div>
              <StatCard label="Daily Burn Rate" value={`${v.dailyBurnRate} pts/day`} sub={`Ideal: ${v.idealBurnPerDay}`} color="#6366f1" icon="🔥" />
              <StatCard label="Days Remaining" value={v.daysRemaining ?? '—'} sub={`${v.daysElapsed} elapsed`} color="#3b82f6" icon="📅" />
              <StatCard label="Projected Finish" value={v.projectedDaysToComplete ? `${v.projectedDaysToComplete}d` : 'N/A'} sub="days needed" color="#8b5cf6" icon="🎯" />
              <StatCard label="Tasks Done" value={`${v.completionRate}%`} sub={`${tasks.filter(t => t.status === 'done').length} / ${tasks.length}`} color="#10b981" icon="✅" />
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="sprint-tabs">
            {['overview', 'tasks', 'team', 'activity'].map(tab => (
              <button key={tab} className={`sprint-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === 'team' && capacity && (
            <TeamCapacityPanel members={capacity.members} />
          )}
          {activeTab === 'activity' && sprintId && (
            <ActivityFeed entityType="sprint" entityId={sprintId} />
          )}
          {activeTab === 'tasks' && (
            <div className="sprint-tasks-list">
              <div className="sprint-tasks-header">
                <span>Key</span><span>Title</span><span>Priority</span><span>Status</span><span>Points</span>
              </div>
              {tasks.length === 0 && (
                <div className="sprint-empty">No tasks in this sprint yet.</div>
              )}
              {tasks.map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          )}
          {activeTab === 'overview' && (
            <div className="sprint-overview-grid">
              <div className="sprint-overview-card">
                <h3>Sprint Summary</h3>
                <table className="sprint-summary-table">
                  <tbody>
                    <tr><td>Total Story Points</td><td><strong>{v.totalPoints}</strong></td></tr>
                    <tr><td>Done</td><td><strong style={{color:'#10b981'}}>{v.donePoints}</strong></td></tr>
                    <tr><td>In Progress</td><td><strong style={{color:'#3b82f6'}}>{v.inProgressPoints}</strong></td></tr>
                    <tr><td>To Do</td><td><strong style={{color:'#64748b'}}>{v.todoPoints}</strong></td></tr>
                    <tr><td>Tasks Total</td><td><strong>{v.taskBreakdown?.total}</strong></td></tr>
                  </tbody>
                </table>
              </div>
              {capacity && <TeamCapacityPanel members={capacity.members} compact />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
