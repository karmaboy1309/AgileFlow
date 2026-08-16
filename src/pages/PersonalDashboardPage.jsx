import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MyWorkQueueGadget from '../components/MyWorkQueueGadget';
import toast from 'react-hot-toast';

// ─── PersonalDashboardPage ─────────────────────────────────────────────────────
// Personalized workspace for individual contributors showing their own
// tasks, productivity stats, recent activity, and upcoming deadlines.

function StatCard({ label, value, trend, icon, color }) {
  const isPositive = trend?.startsWith('+');
  return (
    <div className="pd-stat-card" style={{ borderLeftColor: color }}>
      <div className="pd-stat-icon" style={{ color }}>{icon}</div>
      <div className="pd-stat-value">{value}</div>
      <div className="pd-stat-label">{label}</div>
      {trend && <div className={`pd-stat-trend ${isPositive ? 'up' : 'down'}`}>{trend} this week</div>}
    </div>
  );
}

function UpcomingDeadlines({ tasks }) {
  const sorted = [...tasks]
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  return (
    <div className="pd-card">
      <div className="pd-card-title">⏰ Upcoming Deadlines</div>
      {sorted.length === 0 ? (
        <div className="pd-empty-msg">No upcoming deadlines 🎉</div>
      ) : (
        sorted.map(task => {
          const diff   = new Date(task.dueDate) - Date.now();
          const days   = Math.ceil(diff / 86400000);
          const urgent = days <= 1;
          const overdue = days < 0;
          return (
            <div key={task._id} className={`pd-deadline-item ${overdue ? 'overdue' : urgent ? 'urgent' : ''}`}>
              <div className="pd-deadline-title">{task.title}</div>
              <div className="pd-deadline-meta">
                <span className="pd-deadline-key">{task.issueKey}</span>
                <span className={`pd-deadline-days ${overdue ? 'overdue' : urgent ? 'urgent' : ''}`}>
                  {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function RecentActivity({ activities }) {
  const ICONS = { created: '✨', updated: '✏️', completed: '✅', commented: '💬', assigned: '👤', moved: '↗️' };
  return (
    <div className="pd-card">
      <div className="pd-card-title">📋 Your Recent Activity</div>
      {activities.length === 0 && <div className="pd-empty-msg">No recent activity</div>}
      {activities.slice(0, 10).map((a, i) => (
        <div key={i} className="pd-activity-item">
          <span className="pd-activity-icon">{ICONS[a.action] || '📌'}</span>
          <div className="pd-activity-body">
            <span className="pd-activity-action">{a.action}</span>
            {' '}<span className="pd-activity-entity">{a.entityTitle || a.entityId}</span>
          </div>
          <span className="pd-activity-time">{new Date(a.timestamp || a.createdAt).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function PersonalDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [myTasks, setMyTasks]         = useState([]);
  const [activities, setActivities]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const token = localStorage.getItem('agileflow_token');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, actRes] = await Promise.all([
        fetch('/api/tasks?assignedToMe=true&limit=50', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/activity?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const tasksData = await tasksRes.json();
      const actData   = await actRes.json();
      setMyTasks(tasksData.tasks || []);
      setActivities(actData.activities || actData || []);
    } catch { toast.error('Failed to load personal dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setMyTasks(ts => ts.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      toast.success(`Task ${newStatus === 'done' ? 'completed!' : 'updated'}`);
    } catch { toast.error('Failed to update task'); }
  };

  const completedThisWeek = myTasks.filter(t => {
    if (t.status !== 'done') return false;
    const diff = Date.now() - new Date(t.updatedAt);
    return diff < 7 * 86400000;
  }).length;

  const overdueCount = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < Date.now() && t.status !== 'done').length;
  const inProgress   = myTasks.filter(t => t.status === 'in-progress').length;
  const totalPts     = myTasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
          <div className="pd-page">
            <div className="pd-page-header">
              <h1 className="pd-title">My Dashboard</h1>
              <p className="pd-subtitle">Your personal workspace and task overview</p>
            </div>

            {/* Stats */}
            <div className="pd-stats-row">
              <StatCard label="Completed This Week" value={completedThisWeek} trend={`+${completedThisWeek}`} icon="✅" color="#10b981" />
              <StatCard label="In Progress" value={inProgress} icon="🔄" color="#6366f1" />
              <StatCard label="Overdue" value={overdueCount} icon="⚠️" color="#ef4444" />
              <StatCard label="Pending Points" value={`${totalPts} pts`} icon="⭐" color="#f59e0b" />
            </div>

            {/* Main layout */}
            <div className="pd-layout">
              <div className="pd-main-col">
                <MyWorkQueueGadget tasks={myTasks} onStatusChange={handleStatusChange} loading={loading} />
              </div>
              <div className="pd-side-col">
                <UpcomingDeadlines tasks={myTasks} />
                <RecentActivity activities={activities} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
