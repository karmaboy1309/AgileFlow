import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { projectsAPI } from '../api';
import CustomField from './CustomFieldEditor';

// ─── IntegrationPanel ─────────────────────────────────────────────────────────
// Manage webhook integrations: create, test, enable/disable, delete.

const INTEGRATION_TYPES = [
  { value: 'webhook',   label: '🔗 Generic Webhook',  desc: 'POST JSON to any URL' },
  { value: 'slack',     label: '💬 Slack',             desc: 'Send messages to Slack channels' },
  { value: 'github',    label: '🐙 GitHub',            desc: 'Sync with GitHub issues/PRs' },
  { value: 'gitlab',    label: '🦊 GitLab',            desc: 'Sync with GitLab issues' },
  { value: 'pagerduty', label: '🚨 PagerDuty',        desc: 'Create incidents from blocked tasks' },
  { value: 'custom',    label: '⚙️ Custom',            desc: 'Custom integration' },
];

const ALL_EVENTS = [
  'task.created', 'task.updated', 'task.deleted', 'task.status_changed', 'task.assigned',
  'sprint.started', 'sprint.completed', 'epic.created', 'epic.completed',
  'comment.added', 'worklog.added', 'release.published',
];

export default function IntegrationPanel({ projectId }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [testing, setTesting]           = useState({});
  const [form, setForm] = useState({ name: '', type: 'webhook', url: '', secret: '', events: ['task.status_changed'] });
  const token = localStorage.getItem('agileflow_token');

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations?projectId=${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch { toast.error('Failed to load integrations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, project: projectId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast.success('Integration created');
      setShowCreate(false);
      setForm({ name: '', type: 'webhook', url: '', secret: '', events: ['task.status_changed'] });
      await load();
    } catch (err) { toast.error(err.message || 'Failed to create integration'); }
  };

  const handleTest = async (id) => {
    setTesting(t => ({ ...t, [id]: true }));
    try {
      const res = await fetch(`/api/integrations/${id}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.result?.success) toast.success(`Webhook delivered (${data.result.statusCode} · ${data.result.responseMs}ms)`);
      else toast.error(`Delivery failed: ${data.result?.error || data.result?.statusCode}`);
      await load();
    } catch { toast.error('Test request failed'); }
    finally { setTesting(t => ({ ...t, [id]: false })); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this integration?')) return;
    await fetch(`/api/integrations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Integration deleted');
    await load();
  };

  const toggleEvent = (event) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  return (
    <div className="ip-panel">
      <div className="ip-header">
        <div>
          <h3 className="ip-title">Integrations</h3>
          <p className="ip-subtitle">Connect AgileFlow to external services via webhooks and APIs</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? 'Cancel' : '+ Add Integration'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form className="ip-create-form" onSubmit={handleCreate}>
          <div className="ip-type-grid">
            {INTEGRATION_TYPES.map(t => (
              <div
                key={t.value}
                className={`ip-type-card ${form.type === t.value ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
              >
                <div className="ip-type-label">{t.label}</div>
                <div className="ip-type-desc">{t.desc}</div>
              </div>
            ))}
          </div>
          <input className="ip-input" placeholder="Integration name…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input className="ip-input" placeholder="Webhook URL (https://…)" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} type="url" />
          <input className="ip-input" placeholder="Secret (optional, for HMAC signing)" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} />
          <div className="ip-events-section">
            <div className="ip-events-label">Trigger Events</div>
            <div className="ip-events-grid">
              {ALL_EVENTS.map(ev => (
                <label key={ev} className="ip-event-checkbox">
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  <span>{ev.replace('.', ' · ')}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Create Integration</button>
        </form>
      )}

      {/* Integration list */}
      <div className="ip-list">
        {loading && <div className="ip-loading">Loading integrations…</div>}
        {!loading && integrations.length === 0 && !showCreate && (
          <div className="ip-empty">
            <div className="ip-empty-icon">🔗</div>
            <p>No integrations yet. Add one to connect external services.</p>
          </div>
        )}
        {integrations.map(intg => {
          const lastDel = intg.lastDelivery;
          const typeInfo = INTEGRATION_TYPES.find(t => t.value === intg.type);
          return (
            <div key={intg._id} className={`ip-item ${intg.isActive ? 'active' : 'inactive'}`}>
              <div className="ip-item-header">
                <span className="ip-item-icon">{typeInfo?.label.split(' ')[0] || '🔗'}</span>
                <div className="ip-item-info">
                  <div className="ip-item-name">{intg.name}</div>
                  <div className="ip-item-url">{intg.url || '—'}</div>
                </div>
                <div className="ip-item-actions">
                  {intg.url && (
                    <button className="btn btn-secondary btn-xs" onClick={() => handleTest(intg._id)} disabled={testing[intg._id]}>
                      {testing[intg._id] ? 'Sending…' : '⚡ Test'}
                    </button>
                  )}
                  <button className="btn btn-danger-ghost btn-xs" onClick={() => handleDelete(intg._id)}>Delete</button>
                </div>
              </div>
              <div className="ip-item-meta">
                <span className="ip-event-count">{intg.events?.length || 0} events</span>
                {lastDel && (
                  <span className={`ip-last-delivery ${lastDel.success ? 'success' : 'failed'}`}>
                    Last: {lastDel.success ? `✓ ${lastDel.statusCode}` : `✗ ${lastDel.statusCode || 'Error'}`} · {lastDel.responseMs}ms
                  </span>
                )}
                <span className="ip-stats">Delivered: {intg.deliveryCount} · Failed: {intg.failureCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
