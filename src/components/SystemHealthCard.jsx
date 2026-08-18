import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function SystemHealthCard() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('agileflow_token');

  useEffect(() => {
    fetch('/api/maintenance/system-health', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => toast.error('Failed to load system health stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="sh-card" style={{ background: 'var(--theme-card)', border: '1px solid var(--theme-border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
      <h3 className="sh-title" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>⚙️ Workspace Health & Statistics</h3>
      {loading ? <p>Loading stats...</p> : health && (
        <div className="sh-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div><strong>Database Status:</strong> <span style={{ color: health.database.status === 'connected' ? '#10b981' : '#ef4444' }}>{health.database.status}</span></div>
          <div><strong>Heap Memory:</strong> {health.memory.heapUsed} MB / {health.memory.heapTotal} MB</div>
          <div><strong>CPUs:</strong> {health.system.cpus} cores ({health.system.platform})</div>
          <div><strong>Uptime:</strong> {Math.floor(health.uptime / 60)} minutes</div>
        </div>
      )}
    </div>
  );
}
