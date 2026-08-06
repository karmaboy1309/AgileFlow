import React from 'react';
import { Layers, ChevronRight, CheckCircle, Plus } from 'lucide-react';

export default function EpicPanel({ epics, selectedEpicId, onSelectEpic, onCreateEpicClick }) {
  return (
    <div className="w-64 bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Epics</h3>
        </div>
        <button
          onClick={onCreateEpicClick}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Create Epic"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1 overflow-y-auto max-h-[500px] pr-1">
        {/* All Epics Filter Option */}
        <button
          onClick={() => onSelectEpic(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
            selectedEpicId === null
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <span>All Epics</span>
          {selectedEpicId === null && <CheckCircle className="w-3.5 h-3.5 text-purple-400" />}
        </button>

        {epics && epics.length > 0 ? (
          epics.map((epic) => {
            const isSelected = selectedEpicId === epic._id;
            const colorHex = epic.color || '#8b5cf6';
            return (
              <button
                key={epic._id}
                onClick={() => onSelectEpic(epic._id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex flex-col gap-1 transition-all border ${
                  isSelected
                    ? 'bg-slate-800/90 text-white border-purple-500/60 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="font-semibold truncate">{epic.title}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </div>
                {epic.taskCount !== undefined && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>{epic.completedTaskCount || 0} / {epic.taskCount || 0} issues</span>
                    <span>{epic.taskCount > 0 ? Math.round(((epic.completedTaskCount || 0) / epic.taskCount) * 100) : 0}%</span>
                  </div>
                )}
              </button>
            );
          })
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 italic">
            No Epics created yet.
          </div>
        )}
      </div>
    </div>
  );
}
