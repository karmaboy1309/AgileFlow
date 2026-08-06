import React, { useState } from 'react';
import { X, User, Calendar, Clock, MessageSquare, Tag, Shield, History, Save, Trash2, CheckSquare, Link as LinkIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksAPI } from '../api';
import IssueTypeIcon from './IssueTypeIcon';

export default function IssueDetailDrawer({ issue, onClose, onUpdate }) {
  const [form, setForm] = useState({
    title: issue.title || '',
    description: issue.description || '',
    issueType: issue.issueType || 'task',
    status: issue.status || 'todo',
    priority: issue.priority || 'medium',
    assignee: issue.assignee || '',
    storyPoints: issue.storyPoints || 0,
    estimatedHours: issue.estimatedHours || 0,
    loggedHours: issue.loggedHours || 0,
  });

  const [subtasks, setSubtasks] = useState(issue.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [issueLinks, setIssueLinks] = useState(issue.issueLinks || []);
  const [newLinkRel, setNewLinkRel] = useState('blocks');
  const [newLinkTargetKey, setNewLinkTargetKey] = useState('');

  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        subtasks,
        issueLinks,
      };
      const { data } = await tasksAPI.update(issue._id, payload);
      const updated = data.task ?? data;
      toast.success('Issue updated! ✨');
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update issue.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].completed = !updated[index].completed;
    setSubtasks(updated);
  };

  const handleDeleteSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      const { data } = await tasksAPI.addComment(issue._id, newComment.trim());
      const updated = data.task ?? data;
      setNewComment('');
      toast.success('Comment added!');
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      toast.error('Failed to add comment.');
    } finally {
      setAddingComment(false);
    }
  };

  const completedSubtaskCount = subtasks.filter((s) => s.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#161622] border-l border-white/10 h-full flex flex-col shadow-2xl animate-fade-in-right overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <IssueTypeIcon type={form.issueType} size={16} />
            <span className="font-mono font-bold text-sm text-indigo-400">
              {issue.issueKey || 'AGILE-?'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-1.5 text-xs h-8 px-3"
            >
              <Save size={13} />
              <span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/05"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Title / Summary</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-dark text-sm font-semibold text-white h-10 w-full"
            />
          </div>

          {/* Key Fields Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Issue Type</label>
              <select
                value={form.issueType}
                onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                className="input-dark text-xs h-8 w-full bg-[#1e1e2d] text-slate-200"
              >
                <option value="story">Story</option>
                <option value="bug">Bug</option>
                <option value="task">Task</option>
                <option value="epic">Epic</option>
                <option value="subtask">Sub-task</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-dark text-xs h-8 w-full bg-[#1e1e2d] text-slate-200"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="input-dark text-xs h-8 w-full bg-[#1e1e2d] text-slate-200 capitalize"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Assignee</label>
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="Unassigned"
                className="input-dark text-xs h-8 w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Story Points</label>
              <input
                type="number"
                min="0"
                value={form.storyPoints}
                onChange={(e) => setForm({ ...form, storyPoints: Number(e.target.value) || 0 })}
                className="input-dark text-xs h-8 w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Estimated Hours</label>
              <input
                type="number"
                min="0"
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) || 0 })}
                className="input-dark text-xs h-8 w-full"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add description or acceptance criteria…"
              className="input-dark text-xs w-full p-3 leading-relaxed"
            />
          </div>

          {/* Subtasks Checklist (Feature 6) */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <CheckSquare size={14} className="text-emerald-400" /> Subtask Checklist ({completedSubtaskCount}/{subtasks.length})
              </h4>
              {subtasks.length > 0 && (
                <span className="text-[11px] font-mono text-emerald-400">
                  {Math.round((completedSubtaskCount / subtasks.length) * 100)}%
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {subtasks.map((st, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(idx)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className={st.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {st.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteSubtask(idx)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a subtask item..."
                className="input-dark text-xs h-8 flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="btn-primary text-xs h-8 px-3 flex items-center gap-1"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Activity Log / History */}
          {issue.activityLog && issue.activityLog.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <History size={13} className="text-indigo-400" /> Activity History
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                {issue.activityLog.map((log, i) => (
                  <div key={i} className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="font-semibold text-slate-300">{log.actor}</span>
                    <span>{log.action}</span>
                    {log.from && log.to && (
                      <span className="text-slate-500 font-mono text-[10px]">
                        ({log.from} → {log.to})
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-slate-600">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-indigo-400" /> Comments ({issue.comments?.length || 0})
            </h4>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="mb-4">
              <textarea
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className="input-dark text-xs w-full p-2.5 mb-2"
              />
              <button
                type="submit"
                disabled={addingComment || !newComment.trim()}
                className="btn-primary text-xs h-7 px-3 flex items-center gap-1 ml-auto"
              >
                Comment
              </button>
            </form>

            {/* Comment Stream */}
            <div className="space-y-3">
              {issue.comments?.map((c) => (
                <div key={c._id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">{c.author}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
