import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

// ─── LabelManager ─────────────────────────────────────────────────────────────
// Manage workspace labels: create with hex color picker, search, edit, delete.

const PRESET_COLORS = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16',
  '#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6',
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#64748b',
];

function ColorPicker({ value, onChange }) {
  const [custom, setCustom] = useState(value || '#6366f1');
  return (
    <div className="lm-color-picker">
      <div className="lm-color-presets">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            className={`lm-color-dot ${value === c ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => { onChange(c); setCustom(c); }}
            title={c}
          />
        ))}
      </div>
      <div className="lm-color-custom-row">
        <input
          type="color"
          className="lm-color-input"
          value={custom}
          onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
        />
        <input
          type="text"
          className="lm-color-hex"
          value={custom}
          onChange={e => {
            const v = e.target.value;
            setCustom(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          placeholder="#6366f1"
        />
      </div>
    </div>
  );
}

export default function LabelManager({ isOpen, onClose, onLabelsChange }) {
  const [labels, setLabels]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState({ name: '', description: '', color: '#6366f1' });
  const [saving, setSaving]       = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const token = localStorage.getItem('agileflow_token');

  const loadLabels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/labels', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLabels(data.labels || []);
    } catch { toast.error('Failed to load labels'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) loadLabels(); }, [isOpen]);

  if (!isOpen) return null;

  const filtered = search ? labels.filter(l => l.name.toLowerCase().includes(search.toLowerCase())) : labels;

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Label name required');
    setSaving(true);
    try {
      const res = await fetch('/api/labels', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast.success('Label created');
      setForm({ name: '', description: '', color: '#6366f1' });
      setShowCreate(false);
      await loadLabels();
      onLabelsChange?.();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this label? It will be removed from all tasks.')) return;
    try {
      await fetch(`/api/labels/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Label deleted');
      await loadLabels();
      onLabelsChange?.();
    } catch { toast.error('Failed to delete label'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal">
        <div className="lm-header">
          <h2 className="lm-title">Label Manager</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="lm-toolbar">
          <input className="lm-search" placeholder="Search labels…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? 'Cancel' : '+ New Label'}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="lm-create-form">
            <input className="lm-input" placeholder="Label name…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="lm-input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <ColorPicker value={form.color} onChange={color => setForm(f => ({ ...f, color }))} />
            <div className="lm-create-preview">
              <span className="lm-tag-preview" style={{ background: `${form.color}22`, color: form.color, border: `1px solid ${form.color}55` }}>
                {form.name || 'Preview'}
              </span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? 'Creating…' : 'Create Label'}
            </button>
          </div>
        )}

        {/* Labels list */}
        <div className="lm-list">
          {loading && <div className="lm-loading">Loading labels…</div>}
          {!loading && filtered.length === 0 && <div className="lm-empty">No labels found. Create one above!</div>}
          {filtered.map(label => (
            <div key={label._id} className="lm-row">
              <div className="lm-dot" style={{ background: label.color }} />
              <div className="lm-info">
                <span className="lm-name" style={{ color: label.color }}>{label.name}</span>
                {label.description && <span className="lm-desc">{label.description}</span>}
              </div>
              <span className="lm-count">{label.taskCount} tasks</span>
              <button className="lm-delete-btn" onClick={() => handleDelete(label._id)} title="Delete label">🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
