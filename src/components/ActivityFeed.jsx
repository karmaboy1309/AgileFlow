import { useState, useEffect, useCallback } from 'react';

// ─── ActivityFeed ─────────────────────────────────────────────────────────────
// Displays a chronological feed of activity events for a specific entity
// (task, sprint, epic, project) with grouped-by-date timeline layout.

const ACTION_ICONS = {
  created:          { icon: '✨', color: '#10b981' },
  updated:          { icon: '✏️',  color: '#6366f1' },
  status_changed:   { icon: '🔄', color: '#3b82f6' },
  assigned:         { icon: '👤', color: '#8b5cf6' },
  unassigned:       { icon: '👤', color: '#64748b' },
  comment_added:    { icon: '💬', color: '#06b6d4' },
  comment_edited:   { icon: '📝', color: '#06b6d4' },
  comment_deleted:  { icon: '🗑️', color: '#ef4444' },
  worklog_added:    { icon: '⏱️', color: '#f59e0b' },
  worklog_deleted:  { icon: '⏱️', color: '#ef4444' },
  deleted:          { icon: '🗑️', color: '#ef4444' },
  archived:         { icon: '📦', color: '#64748b' },
  restored:         { icon: '♻️', color: '#10b981' },
  label_added:      { icon: '🏷️', color: '#ec4899' },
  label_removed:    { icon: '🏷️', color: '#64748b' },
  sprint_started:   { icon: '🚀', color: '#10b981' },
  sprint_completed: { icon: '🏁', color: '#6366f1' },
  priority_changed: { icon: '⚡', color: '#f59e0b' },
  linked:           { icon: '🔗', color: '#3b82f6' },
  attachment_added: { icon: '📎', color: '#8b5cf6' },
  default:          { icon: '📋', color: '#64748b' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function ActivityItem({ log }) {
  const meta = ACTION_ICONS[log.action] || ACTION_ICONS.default;
  const actor = log.actor;
  const initials = actor?.name ? actor.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="activity-item">
      {/* Avatar */}
      <div className="activity-avatar" style={{ background: actor?.avatarColor || '#6366f1' }}>
        {initials}
      </div>
      {/* Timeline dot */}
      <div className="activity-dot" style={{ background: meta.color }} />
      {/* Content */}
      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-actor">{actor?.name || 'Unknown'}</span>
          <span className="activity-action-icon">{meta.icon}</span>
          <span className="activity-action">{log.summary || log.action.replace(/_/g, ' ')}</span>
          <span className="activity-time">{timeAgo(log.createdAt)}</span>
        </div>
        {/* Diff changes */}
        {log.changes?.length > 0 && (
          <div className="activity-changes">
            {log.changes.map((ch, i) => (
              <div key={i} className="activity-change">
                <span className="activity-change-field">{ch.field}:</span>
                {ch.oldValue != null && (
                  <span className="activity-change-old">{String(ch.oldValue)}</span>
                )}
                <span className="activity-change-arrow">→</span>
                <span className="activity-change-new">{String(ch.newValue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityFeed({ entityType, entityId, limit = 50 }) {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('all');

  const FILTER_OPTIONS = [
    { value: 'all',            label: 'All Activity' },
    { value: 'status_changed', label: 'Status Changes' },
    { value: 'comment_added',  label: 'Comments' },
    { value: 'worklog_added',  label: 'Work Logs' },
    { value: 'assigned',       label: 'Assignments' },
  ];

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/activity/entity/${entityType}/${entityId}?limit=${limit}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('agileflow_token')}` } }
      );
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, limit]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter);

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const date = new Date(log.createdAt).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h3 className="activity-feed-title">Activity</h3>
        <div className="activity-filters">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`activity-filter-btn ${filter === opt.value ? 'active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button className="activity-refresh-btn" onClick={load} title="Refresh">⟳</button>
      </div>

      {loading && (
        <div className="activity-loading">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="activity-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="activity-error">⚠ {error} <button onClick={load}>Retry</button></div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="activity-empty">
          <div className="activity-empty-icon">📋</div>
          <p>No activity yet</p>
        </div>
      )}

      {!loading && sortedDates.map(date => (
        <div key={date} className="activity-group">
          <div className="activity-date-label">{formatDate(date)}</div>
          <div className="activity-timeline">
            {grouped[date].map(log => <ActivityItem key={log._id} log={log} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
