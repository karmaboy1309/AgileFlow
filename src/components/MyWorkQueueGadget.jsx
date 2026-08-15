import { useState, useEffect, useCallback } from 'react';
import { activityAPI } from '../api';

// ─── MyWorkQueue ─────────────────────────────────────────────────────────────
// Dashboard gadget: shows the current user's assigned tasks sorted by
// due date, with overdue highlighting and quick status toggle.

const PRIORITY_COLORS = {
  critical: '#a855f7', high: '#ef4444', medium: '#f59e0b', low: '#10b981',
};
const STATUS_NEXT = {
  todo: 'in-progress', 'in-progress': 'done', done: 'todo',
};

function timeLeft(dueDate) {
  if (!dueDate) return null;
  const diff = new Date(dueDate) - Date.now();
  if (diff < 0) return { label: 'Overdue', overdue: true };
  const days = Math.floor(diff / 86400000);
  if (days === 0) return { label: 'Due today', urgent: true };
  if (days === 1) return { label: 'Due tomorrow', urgent: true };
  return { label: `Due in ${days}d` };
}

export default function MyWorkQueueGadget({ tasks = [], onStatusChange, loading = false }) {
  const [filter, setFilter] = useState('all'); // all | overdue | today | high

  const filtered = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (filter === 'all') return true;
    if (filter === 'high') return t.priority === 'high' || t.priority === 'critical';
    if (filter === 'overdue') {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < Date.now();
    }
    if (filter === 'today') {
      if (!t.dueDate) return false;
      const diff = new Date(t.dueDate) - Date.now();
      return diff >= 0 && diff < 86400000;
    }
    return true;
  }).sort((a, b) => {
    // Sort: overdue first, then by priority, then by due date
    const aOverdue = a.dueDate && new Date(a.dueDate) < Date.now();
    const bOverdue = b.dueDate && new Date(b.dueDate) < Date.now();
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
  });

  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < Date.now() && t.status !== 'done').length;

  return (
    <div className="wq-gadget">
      <div className="wq-header">
        <div className="wq-title-row">
          <span className="wq-title">My Work Queue</span>
          {overdueCount > 0 && (
            <span className="wq-overdue-badge">{overdueCount} overdue</span>
          )}
        </div>
        <div className="wq-filters">
          {['all', 'overdue', 'today', 'high'].map(f => (
            <button key={f} className={`wq-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="wq-loading">
          {[...Array(3)].map((_, i) => <div key={i} className="wq-skeleton" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="wq-empty">
          <div className="wq-empty-icon">🎉</div>
          <p>{filter === 'all' ? 'You\'re all caught up!' : `No ${filter} tasks`}</p>
        </div>
      )}

      {!loading && (
        <div className="wq-list">
          {filtered.map(task => {
            const due = timeLeft(task.dueDate);
            const pColor = PRIORITY_COLORS[task.priority] || '#64748b';
            return (
              <div key={task._id} className={`wq-item ${due?.overdue ? 'overdue' : due?.urgent ? 'urgent' : ''}`}>
                {/* Priority indicator */}
                <div className="wq-priority-dot" style={{ background: pColor }} title={task.priority} />
                {/* Task info */}
                <div className="wq-item-body">
                  <div className="wq-item-title">{task.title}</div>
                  <div className="wq-item-meta">
                    <span className="wq-item-key">{task.issueKey || ''}</span>
                    {task.epicTitle && <span className="wq-item-epic">· {task.epicTitle}</span>}
                    {due && (
                      <span className={`wq-due-label ${due.overdue ? 'overdue' : due.urgent ? 'urgent' : ''}`}>
                        · {due.label}
                      </span>
                    )}
                  </div>
                </div>
                {/* Status toggle button */}
                <button
                  className={`wq-status-btn wq-status-${task.status?.replace(' ', '-')}`}
                  onClick={() => onStatusChange?.(task._id, STATUS_NEXT[task.status] || 'in-progress')}
                  title={`Mark as ${STATUS_NEXT[task.status] || 'in-progress'}`}
                >
                  {task.status === 'done' ? '✓' : task.status === 'in-progress' ? '⟳' : '○'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="wq-footer">
        <span className="wq-count">{filtered.length} tasks</span>
        {tasks.filter(t => t.status === 'done').length > 0 && (
          <span className="wq-done-count">{tasks.filter(t => t.status === 'done').length} completed today</span>
        )}
      </div>
    </div>
  );
}
