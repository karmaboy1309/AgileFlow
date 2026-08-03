import { useState, useEffect } from 'react';
import { X, CheckSquare, AlignLeft, Flag, User, Calendar, Pencil, Plus, Trash2, Tag, MessageSquare, Send, Link } from 'lucide-react';
import Spinner from './Spinner';
import { tasksAPI } from '../api';
import toast from 'react-hot-toast';

/**
 * components/EditTaskModal.jsx
 *
 * Pre-fills all task fields for in-place editing.
 * Calls onSubmit({ title, description, status, priority, assignee, dueDate, subtasks, tags, attachments }).
 */

const PRIORITIES = ['low', 'medium', 'high'];
const PRESET_TAGS = ['Feature', 'Bug', 'Design', 'DevOps', 'Refactor'];

const PRIORITY_COLORS = {
  low:    { bg: 'rgba(16,185,129,0.15)',  text: '#10b981', border: 'rgba(16,185,129,0.3)'  },
  medium: { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
  high:   { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
};

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

export default function EditTaskModal({ task, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    title      : task.title       || '',
    description: task.description || '',
    status     : task.status      || 'todo',
    priority   : task.priority    || 'medium',
    assignee   : task.assignee    || '',
    dueDate    : toDateInputValue(task.dueDate),
  });
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [tags, setTags] = useState(task.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [comments, setComments] = useState(task.comments || []);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [newAttachTitle, setNewAttachTitle] = useState('');
  const [newAttachUrl, setNewAttachUrl] = useState('');

  useEffect(() => {
    setForm({
      title      : task.title       || '',
      description: task.description || '',
      status     : task.status      || 'todo',
      priority   : task.priority    || 'medium',
      assignee   : task.assignee    || '',
      dueDate    : toDateInputValue(task.dueDate),
    });
    setSubtasks(task.subtasks || []);
    setTags(task.tags || []);
    setComments(task.comments || []);
    setAttachments(task.attachments || []);
  }, [task]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setPostingComment(true);
    try {
      const { data } = await tasksAPI.addComment(task._id, newCommentText);
      const updatedTask = data.task ?? data;
      setComments(updatedTask.comments || []);
      setNewCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const { data } = await tasksAPI.deleteComment(task._id, commentId);
      const updatedTask = data.task ?? data;
      setComments(updatedTask.comments || []);
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

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

  const handleToggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e) => {
    e.preventDefault();
    const t = customTag.trim();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setCustomTag('');
  };

  const handleAddAttachment = (e) => {
    e.preventDefault();
    if (!newAttachTitle.trim() || !newAttachUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { title: newAttachTitle.trim(), url: newAttachUrl.trim() },
    ]);
    setNewAttachTitle('');
    setNewAttachUrl('');
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, subtasks, tags, attachments });
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
        aria-labelledby="edit-task-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Pencil size={14} className="text-indigo-400" />
            </div>
            <h2 id="edit-task-modal-title" className="text-base font-semibold text-white">
              Edit Task
            </h2>
          </div>
          <button
            id="edit-task-close-btn"
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
            <label htmlFor="edit-task-title" className="block text-sm font-medium text-slate-300 mb-2">
              Task title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <CheckSquare size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="edit-task-title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="Task title"
                className="input-dark"
                style={{ paddingLeft: '2.75rem' }}
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-task-description" className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <div className="relative">
              <AlignLeft size={15} className="absolute left-3.5 top-3.5 text-slate-500" style={{ pointerEvents: 'none' }} />
              <textarea
                id="edit-task-description"
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

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label htmlFor="edit-task-status" className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                id="edit-task-status"
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
                  const c = PRIORITY_COLORS[p];
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
            <label htmlFor="edit-task-assignee" className="block text-sm font-medium text-slate-300 mb-2">
              Assignee
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="edit-task-assignee"
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
            <label htmlFor="edit-task-due-date" className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Due date</span>
            </label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
              <input
                id="edit-task-due-date"
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

          {/* Category Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-1.5"><Tag size={12} /> Category Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRESET_TAGS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                  >
                    + {t}
                  </button>
                );
              })}
            </div>
            {tags.filter((t) => !PRESET_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.filter((t) => !PRESET_TAGS.includes(t)).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className="hover:text-red-400"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag(e))}
                placeholder="Or type custom tag…"
                className="input-dark text-xs h-9 flex-1"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-medium rounded-xl border border-white/[0.08] transition-colors flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Tag</span>
              </button>
            </div>
          </div>

          {/* Link Attachments */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-1.5"><Link size={12} /> Link Resources & Attachments</span>
            </label>
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs">
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-300 hover:underline truncate">
                      <Link size={12} />
                      <span className="font-medium">{att.title}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-1">
              <input
                type="text"
                value={newAttachTitle}
                onChange={(e) => setNewAttachTitle(e.target.value)}
                placeholder="Link title (e.g. Figma)"
                className="input-dark text-xs h-9"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newAttachUrl}
                  onChange={(e) => setNewAttachUrl(e.target.value)}
                  placeholder="https://..."
                  className="input-dark text-xs h-9 flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-medium rounded-xl border border-white/[0.08] transition-colors flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* Comments & Discussion */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-1.5"><MessageSquare size={12} /> Discussion Stream ({comments.length})</span>
            </label>
            {comments.length > 0 && (
              <div className="space-y-2 mb-3 max-h-36 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div key={c._id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1 text-[11px]">
                      <span className="font-semibold text-indigo-300">{c.author}</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c._id)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddComment(e))}
                placeholder="Write a comment…"
                className="input-dark text-xs h-9 flex-1"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={postingComment || !newCommentText.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={12} />
                <span>{postingComment ? 'Posting…' : 'Post'}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              id="edit-task-cancel-btn"
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl text-sm font-medium text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              id="edit-task-submit-btn"
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
