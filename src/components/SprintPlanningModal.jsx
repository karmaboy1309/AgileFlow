import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

// ─── SprintPlanningModal ──────────────────────────────────────────────────────
// Allows users to assign backlog tasks to a sprint with a visual story point
// budget indicator and team capacity overlay.

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function SprintPlanningModal({ isOpen, onClose, backlogs = [], sprints = [], onAssign }) {
  const [selectedSprint, setSelectedSprint] = useState(sprints[0]?._id || '');
  const [selectedTasks, setSelectedTasks]   = useState(new Set());
  const [search, setSearch]                 = useState('');
  const [capacityLimit, setCapacityLimit]   = useState(40);
  const [assigning, setAssigning]           = useState(false);

  if (!isOpen) return null;

  const sprint = sprints.find(s => s._id === selectedSprint);

  const filtered = backlogs
    .filter(t => !t.sprintId && t.status !== 'done')
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));

  const selectedPoints = filtered
    .filter(t => selectedTasks.has(t._id))
    .reduce((s, t) => s + (t.storyPoints || 0), 0);

  const budgetPercent = capacityLimit > 0 ? Math.min(100, Math.round((selectedPoints / capacityLimit) * 100)) : 0;
  const overBudget = selectedPoints > capacityLimit;

  const toggleTask = (id) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selectedSprint || selectedTasks.size === 0) return;
    setAssigning(true);
    try {
      await onAssign?.(selectedSprint, [...selectedTasks]);
      toast.success(`${selectedTasks.size} tasks moved to sprint`);
      setSelectedTasks(new Set());
      onClose();
    } catch {
      toast.error('Failed to assign tasks to sprint');
    } finally {
      setAssigning(false);
    }
  };

  const PRIORITY_COLORS = { critical: '#a855f7', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="spm-modal">
        {/* Header */}
        <div className="spm-header">
          <h2 className="spm-title">Sprint Planning</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Sprint selector */}
        <div className="spm-sprint-row">
          <label className="spm-label">Target Sprint</label>
          <select className="spm-select" value={selectedSprint} onChange={e => setSelectedSprint(e.target.value)}>
            {sprints.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <div className="spm-capacity-row">
            <label className="spm-label">Point Budget</label>
            <input
              type="number" min="0" max="500" step="5"
              className="spm-capacity-input"
              value={capacityLimit}
              onChange={e => setCapacityLimit(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Budget bar */}
        <div className="spm-budget">
          <div className="spm-budget-bar-track">
            <div
              className="spm-budget-bar-fill"
              style={{
                width: `${budgetPercent}%`,
                background: overBudget
                  ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                  : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
              }}
            />
          </div>
          <span className={`spm-budget-label ${overBudget ? 'over' : ''}`}>
            {selectedPoints} / {capacityLimit} pts ({budgetPercent}%)
            {overBudget && ' ⚠ Over budget'}
          </span>
        </div>

        {/* Search */}
        <div className="spm-search-row">
          <input
            className="spm-search"
            placeholder="Search backlog tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="spm-select-all" onClick={() => {
            if (selectedTasks.size === filtered.length) setSelectedTasks(new Set());
            else setSelectedTasks(new Set(filtered.map(t => t._id)));
          }}>
            {selectedTasks.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Task list */}
        <div className="spm-task-list">
          {filtered.length === 0 && (
            <div className="spm-empty">No unassigned backlog tasks</div>
          )}
          {filtered.map(task => (
            <div
              key={task._id}
              className={`spm-task-row ${selectedTasks.has(task._id) ? 'selected' : ''}`}
              onClick={() => toggleTask(task._id)}
            >
              <input type="checkbox" checked={selectedTasks.has(task._id)} onChange={() => toggleTask(task._id)} onClick={e => e.stopPropagation()} />
              <div className="spm-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] || '#64748b' }} />
              <div className="spm-task-info">
                <span className="spm-task-title">{task.title}</span>
                <span className="spm-task-key">{task.issueKey}</span>
              </div>
              <span className="spm-task-pts">{task.storyPoints ?? '—'} pts</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="spm-footer">
          <span className="spm-selection-info">{selectedTasks.size} selected · {selectedPoints} pts</span>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={selectedTasks.size === 0 || !selectedSprint || assigning}
          >
            {assigning ? 'Moving…' : `Move to Sprint`}
          </button>
        </div>
      </div>
    </div>
  );
}
