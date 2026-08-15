import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { sprintsAPI, tasksAPI } from '../api';

// ─── QuickCreateBar ───────────────────────────────────────────────────────────
// Floating global quick-create bar. Press "C" anywhere to open it and
// create a task in the current epic without navigating away.

export default function QuickCreateBar({ epics = [], defaultEpicId, onCreated }) {
  const [open, setOpen]         = useState(false);
  const [title, setTitle]       = useState('');
  const [epicId, setEpicId]     = useState(defaultEpicId || '');
  const [priority, setPriority] = useState('medium');
  const [points, setPoints]     = useState('');
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef(null);

  // Open with keyboard shortcut "C"
  useCallback(() => {
    const handler = (e) => {
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName === 'BODY') {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [])();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !epicId) {
      toast.error('Title and Epic are required');
      return;
    }
    setSaving(true);
    try {
      const res = await tasksAPI.create({
        title: title.trim(),
        epicId,
        priority,
        storyPoints: points ? parseInt(points) : undefined,
        status: 'todo',
      });
      toast.success('Task created');
      onCreated?.(res.data);
      setTitle('');
      setPoints('');
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const PRIORITIES = ['low', 'medium', 'high', 'critical'];
  const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#a855f7' };

  if (!open) {
    return (
      <button
        className="qcb-trigger"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        title="Quick Create Task (C)"
      >
        <span className="qcb-trigger-icon">+</span>
        <span className="qcb-trigger-label">Create Task</span>
        <kbd className="qcb-kbd">C</kbd>
      </button>
    );
  }

  return (
    <div className="qcb-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <form className="qcb-form" onSubmit={handleCreate}>
        <div className="qcb-header">
          <span className="qcb-form-title">Quick Create Task</span>
          <button type="button" className="qcb-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        <input
          ref={inputRef}
          className="qcb-input"
          placeholder="Task title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />

        <div className="qcb-row">
          <select className="qcb-select" value={epicId} onChange={e => setEpicId(e.target.value)} required>
            <option value="">Select Epic…</option>
            {epics.map(ep => <option key={ep._id} value={ep._id}>{ep.title}</option>)}
          </select>

          <select className="qcb-select priority-select" value={priority} onChange={e => setPriority(e.target.value)}
            style={{ borderColor: `${PRIORITY_COLORS[priority]}55`, color: PRIORITY_COLORS[priority] }}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>

          <input
            type="number" min="0" max="100"
            className="qcb-points"
            placeholder="Points"
            value={points}
            onChange={e => setPoints(e.target.value)}
          />
        </div>

        <div className="qcb-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim() || !epicId}>
            {saving ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
