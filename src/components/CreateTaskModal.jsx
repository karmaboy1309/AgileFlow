import { useState } from 'react';
import { X, CheckSquare, AlignLeft, Flag, User, Calendar, Plus, Trash2 } from 'lucide-react';
import Spinner from './Spinner';

const PRIORITIES = ['low', 'medium', 'high'];

export default function CreateTaskModal({ onClose, onSubmit, loading, defaultStatus = 'todo' }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'medium',
    assignee: '',
    dueDate: '',
  });
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (index) => {
    setSubtasks((prev) =>
      prev.map((sub, i) => (i === index ? { ...sub, completed: !sub.completed } : sub))
    );
  };

  const handleRemoveSubtask = (index) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, subtasks });
  };

  const priorityColors = {
    low:    { bg: 'rgba(16,185,129,0.15)',  text: '#10b981', border: 'rgba(16,185,129,0.3)'  },
    medium: { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
    high:   { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
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
        aria-labelledby="create-task-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckSquare size={15} className="text-emerald-400" />
            </div>
            <h2 id="create-task-modal-title" className="text-base font-semibold text-white">
              Add New Task
            </h2>
          </div>
          <button
            id="create-task-close-btn"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors rounded-lg p-1"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-300 mb-2">
              Task title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <CheckSquare size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="task-title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Design login screen wireframes"
                className="input-dark"
                style={{ paddingLeft: '2.75rem' }}
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <div className="relative">
              <AlignLeft size={15} className="absolute left-3.5 top-3.5 text-slate-500" style={{ pointerEvents: 'none' }} />
              <textarea
                id="task-description"
                name="description"
                rows={2}
                value={form.description}
                onChange={handleChange}
                placeholder="Add any notes or details…"
                className="input-dark resize-none"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          {/* Status & Priority row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                id="task-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="input-dark"
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <span className="flex items-center gap-1.5"><Flag size={12} /> Priority</span>
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => {
                  const c = priorityColors[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                      className="flex-1 h-9 rounded-lg text-xs font-medium capitalize border transition-all duration-150"
                      style={
                        form.priority === p
                          ? { background: c.bg, color: c.text, borderColor: c.border }
                          : { background: 'transparent', color: '#64748b', borderColor: 'rgba(255,255,255,0.08)' }
                      }
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor="task-assignee" className="block text-sm font-medium text-slate-300 mb-2">
              Assignee
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="task-assignee"
                name="assignee"
                type="text"
                value={form.assignee}
                onChange={handleChange}
                placeholder="Name or email (optional)"
                className="input-dark"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="task-due-date" className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Due date</span>
            </label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="task-due-date"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                className="input-dark"
                style={{ paddingLeft: '2.75rem', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-1.5"><CheckSquare size={12} /> Subtasks / Checklist</span>
            </label>
            {subtasks.length > 0 && (
              <div className="space-y-2 mb-2 max-h-36 overflow-y-auto pr-1">
                {subtasks.map((sub, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer truncate">
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(idx)}
                        className="rounded border-slate-600 text-indigo-500 focus:ring-0"
                      />
                      <span className={sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                        {sub.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask(e))}
                placeholder="Add checklist item…"
                className="input-dark text-xs h-9 flex-1"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-medium rounded-xl border border-white/[0.08] transition-colors flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              id="create-task-cancel-btn"
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl text-sm font-medium text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              id="create-task-submit-btn"
              type="submit"
              disabled={loading || !form.title.trim()}
              className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Adding…</span>
                </>
              ) : (
                <span>Add Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
