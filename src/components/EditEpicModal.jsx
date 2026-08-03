import { useState, useEffect } from 'react';
import { X, Layers, AlignLeft, Tag, Pencil, Calendar } from 'lucide-react';
import Spinner from './Spinner';

/**
 * components/EditEpicModal.jsx
 *
 * Pre-fills the form with the epic's current values so the user can
 * update the title, description, color accent, or target date.
 * Mirrors the structure of CreateEpicModal.
 */

const COLORS = [
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Sky',     value: '#0ea5e9' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Rose',    value: '#f43f5e' },
];

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

export default function EditEpicModal({ epic, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    title      : epic.title       || '',
    description: epic.description || '',
    color      : epic.color       || COLORS[0].value,
    targetDate : toDateInputValue(epic.targetDate),
  });

  // Keep form in sync if epic prop changes (e.g. stale data)
  useEffect(() => {
    setForm({
      title      : epic.title       || '',
      description: epic.description || '',
      color      : epic.color       || COLORS[0].value,
      targetDate : toDateInputValue(epic.targetDate),
    });
  }, [epic]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-fade-in-up w-full max-w-lg rounded-2xl border border-white/[0.09] shadow-2xl"
        style={{ background: '#16161f' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-epic-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Pencil size={14} className="text-indigo-400" />
            </div>
            <h2 id="edit-epic-modal-title" className="text-base font-semibold text-white">
              Edit Epic
            </h2>
          </div>
          <button
            id="edit-epic-close-btn"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors rounded-lg p-1 hover:bg-white/05"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="edit-epic-title" className="block text-sm font-medium text-slate-300 mb-2">
              Epic title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Layers size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="edit-epic-title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. User Authentication System"
                className="input-dark"
                style={{ paddingLeft: '2.75rem' }}
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-epic-description" className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <div className="relative">
              <AlignLeft size={15} className="absolute left-3.5 top-3.5 text-slate-500" style={{ pointerEvents: 'none' }} />
              <textarea
                id="edit-epic-description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="What is this epic about?"
                className="input-dark resize-none"
                style={{ paddingLeft: '2.75rem', lineHeight: '1.6' }}
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label htmlFor="edit-epic-targetDate" className="block text-sm font-medium text-slate-300 mb-2">
              Target Milestone Date
            </label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="edit-epic-targetDate"
                name="targetDate"
                type="date"
                value={form.targetDate}
                onChange={handleChange}
                className="input-dark"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <span className="flex items-center gap-2">
                <Tag size={13} />
                Color tag
              </span>
            </label>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setForm((prev) => ({ ...prev, color: c.value }))}
                  className="w-7 h-7 rounded-full transition-all duration-150"
                  style={{
                    background: c.value,
                    transform : form.color === c.value ? 'scale(1.25)' : 'scale(1)',
                    boxShadow : form.color === c.value ? '0 0 0 3px rgba(255,255,255,0.2)' : 'none',
                  }}
                  aria-pressed={form.color === c.value}
                  aria-label={`Select ${c.label} color`}
                />
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 pt-2">
            <button
              id="edit-epic-cancel-btn"
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl text-sm font-medium text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              id="edit-epic-submit-btn"
              type="submit"
              disabled={loading || !form.title.trim()}
              className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
