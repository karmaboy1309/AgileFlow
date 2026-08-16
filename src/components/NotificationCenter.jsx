import { useState, useEffect } from 'react';

// ─── NotificationCenter ───────────────────────────────────────────────────────
// Slide-in notification panel with categories, read/unread management,
// action buttons, and real-time-ready architecture.

const TYPE_ICONS = {
  mention:     { icon: '@', color: '#6366f1', label: 'Mention' },
  assignment:  { icon: '👤', color: '#10b981', label: 'Assignment' },
  deadline:    { icon: '⏰', color: '#ef4444', label: 'Deadline' },
  status:      { icon: '🔄', color: '#f59e0b', label: 'Status Change' },
  comment:     { icon: '💬', color: '#06b6d4', label: 'Comment' },
  sprint:      { icon: '🚀', color: '#8b5cf6', label: 'Sprint' },
  release:     { icon: '🎉', color: '#10b981', label: 'Release' },
  system:      { icon: '⚙️', color: '#64748b', label: 'System' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function NotificationItem({ notif, onRead, onAction }) {
  const meta = TYPE_ICONS[notif.type] || TYPE_ICONS.system;
  return (
    <div className={`nc-item ${notif.isRead ? 'read' : 'unread'}`} onClick={() => !notif.isRead && onRead(notif._id)}>
      <div className="nc-item-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
        {meta.icon}
      </div>
      <div className="nc-item-body">
        <div className="nc-item-title">{notif.title}</div>
        <div className="nc-item-message">{notif.message}</div>
        <div className="nc-item-time">{timeAgo(notif.createdAt)}</div>
      </div>
      {!notif.isRead && <div className="nc-unread-dot" style={{ background: meta.color }} />}
    </div>
  );
}

export default function NotificationCenter({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const token = localStorage.getItem('agileflow_token');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=50', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setNotifications(data.notifications || data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  const categories = [...new Set(notifications.map(n => n.type))];

  return (
    <>
      <div className="nc-backdrop" onClick={onClose} />
      <div className="nc-panel">
        <div className="nc-header">
          <div className="nc-header-title">
            <h2 className="nc-title">Notifications</h2>
            {unreadCount > 0 && <span className="nc-unread-badge">{unreadCount} new</span>}
          </div>
          <div className="nc-header-actions">
            {unreadCount > 0 && (
              <button className="nc-mark-all-btn" onClick={markAllRead}>Mark all read</button>
            )}
            <button className="nc-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Filters */}
        <div className="nc-filters">
          {['all', 'unread'].map(f => (
            <button key={f} className={`nc-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="nc-list">
          {loading && (
            <div className="nc-loading">
              {[...Array(5)].map((_, i) => <div key={i} className="nc-skeleton" />)}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="nc-empty">
              <div className="nc-empty-icon">🔔</div>
              <p>{filter === 'unread' ? "You're all caught up!" : 'No notifications yet'}</p>
            </div>
          )}
          {filtered.map(n => (
            <NotificationItem key={n._id} notif={n} onRead={markRead} />
          ))}
        </div>

        {/* Footer */}
        <div className="nc-footer">
          <button className="nc-footer-btn" onClick={onClose}>Notification Settings →</button>
        </div>
      </div>
    </>
  );
}
