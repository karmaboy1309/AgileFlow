import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function OKRManager({ projectId }) {
  const [okrs, setOkrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [objective, setObjective] = useState('');
  const [quarter, setQuarter] = useState('Q3-2025');
  const token = localStorage.getItem('agileflow_token');

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/okrs?projectId=${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOkrs(data.okrs || []);
    } catch {
      toast.error('Failed to load OKRs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!objective.trim()) return;
    try {
      const res = await fetch('/api/okrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project: projectId, objective: objective.trim(), quarter, keyResults: [] }),
      });
      if (!res.ok) throw new Error('Create failed');
      toast.success('Objective created');
      setObjective('');
      setShowCreate(false);
      await load();
    } catch {
      toast.error('Failed to create OKR');
    }
  };

  return (
    <div className="okr-widget">
      <div className="okr-header">
        <h3 className="okr-title">Objectives & Key Results (OKRs)</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? 'Cancel' : '+ Add Objective'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="okr-form">
          <input className="okr-input" placeholder="Objective name..." value={objective} onChange={e => setObjective(e.target.value)} required />
          <input className="okr-input" placeholder="Quarter (e.g. Q3-2025)" value={quarter} onChange={e => setQuarter(e.target.value)} required />
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
        </form>
      )}

      <div className="okr-list">
        {loading ? <p>Loading OKRs...</p> : okrs.length === 0 ? <p className="okr-empty">No OKRs defined for this quarter.</p> : okrs.map(okr => (
          <div key={okr._id} className="okr-item">
            <div className="okr-objective-row">
              <span className="okr-obj-text">{okr.objective}</span>
              <span className="okr-obj-quarter">{okr.quarter}</span>
            </div>
            <div className="okr-progress-bar">
              <div className="okr-progress-fill" style={{ width: `${okr.progress}%` }} />
            </div>
            <span className="okr-progress-text">{okr.progress}% progress</span>
          </div>
        ))}
      </div>
    </div>
  );
}
