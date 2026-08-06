import React from 'react';
import { Filter, Search, User, AlertCircle, Bug, Clock, CheckCircle2 } from 'lucide-react';

const QUICK_FILTERS = [
  { id: 'all', label: 'All Issues', icon: Filter },
  { id: 'my-issues', label: 'Only My Issues', icon: User },
  { id: 'high-priority', label: 'High Priority', icon: AlertCircle },
  { id: 'bugs', label: 'Bugs Only', icon: Bug },
  { id: 'unassigned', label: 'Unassigned', icon: Clock },
];

export default function QuickFiltersBar({ activeFilter, onSelectFilter, searchQuery, onSearchChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-md mb-4">
      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-blue-400" /> Quick Filters:
        </span>
        {QUICK_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm shadow-blue-900/30'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Global Search Input */}
      <div className="relative min-w-[220px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search issues (JQL / key / text)..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/90 text-slate-200 placeholder-slate-500 border border-slate-700/70 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
    </div>
  );
}
