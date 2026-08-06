import React from 'react';
import { CheckSquare, Trash2, ArrowRightLeft, Award, X } from 'lucide-react';

export default function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkMoveSprint,
  onBulkDelete,
  sprints = [],
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-blue-500/40 text-slate-200 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 border-r border-slate-700/80 pr-4">
        <CheckSquare className="w-5 h-5 text-blue-400" />
        <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
          {selectedCount} selected
        </span>
      </div>

      {/* Bulk Status Select */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Status:</span>
        <select
          onChange={(e) => {
            if (e.target.value) {
              onBulkStatusChange(e.target.value);
              e.target.value = '';
            }
          }}
          className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">Move status...</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Bulk Move Sprint */}
      {sprints.length > 0 && (
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
          <select
            onChange={(e) => {
              if (e.target.value !== undefined) {
                onBulkMoveSprint(e.target.value === 'backlog' ? null : e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="">Move to Sprint...</option>
            <option value="backlog">Backlog (No Sprint)</option>
            {sprints.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bulk Delete */}
      <button
        onClick={onBulkDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors text-xs font-semibold"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        Delete Selected
      </button>

      {/* Dismiss / Clear */}
      <button
        onClick={onClearSelection}
        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        title="Clear Selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
