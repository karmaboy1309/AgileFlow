import React, { useState, useEffect } from 'react';
import { Filter, Search, User, AlertCircle, Bug, Clock, Bookmark, BookmarkCheck, Plus, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { filtersAPI, componentsAPI } from '../api';

const QUICK_FILTERS = [
  { id: 'all', label: 'All Issues', icon: Filter },
  { id: 'my-issues', label: 'Only My Issues', icon: User },
  { id: 'high-priority', label: 'High Priority', icon: AlertCircle },
  { id: 'bugs', label: 'Bugs Only', icon: Bug },
  { id: 'unassigned', label: 'Unassigned', icon: Clock },
];

export default function QuickFiltersBar({
  activeFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  projectId,
  selectedComponent,
  onSelectComponent,
}) {
  const [savedFilters, setSavedFilters] = useState([]);
  const [components, setComponents] = useState([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    fetchSavedFilters();
    if (projectId) {
      fetchComponents();
    }
  }, [projectId]);

  const fetchSavedFilters = async () => {
    try {
      const res = await filtersAPI.getAll(projectId);
      setSavedFilters(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComponents = async () => {
    try {
      const res = await componentsAPI.getAll(projectId);
      setComponents(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFilterPreset = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a name for the saved filter preset.');
      return;
    }
    try {
      await filtersAPI.create({
        name: presetName.trim(),
        projectId,
        filterState: {
          activeFilter,
          searchQuery,
          selectedComponent,
        },
      });
      toast.success('Filter preset saved! 🔖');
      setPresetName('');
      setSavingPreset(false);
      fetchSavedFilters();
    } catch (err) {
      toast.error('Failed to save filter preset');
    }
  };

  const handleLoadPreset = (preset) => {
    if (preset.filterState) {
      if (preset.filterState.activeFilter) onSelectFilter(preset.filterState.activeFilter);
      if (preset.filterState.searchQuery !== undefined) onSearchChange(preset.filterState.searchQuery);
      if (preset.filterState.selectedComponent !== undefined && onSelectComponent) {
        onSelectComponent(preset.filterState.selectedComponent);
      }
      toast.success(`Loaded saved filter: ${preset.name}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-md mb-4">
      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-blue-400" /> Filters:
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

        {/* Component Filter Selector */}
        {components.length > 0 && onSelectComponent && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <Layers className="w-3.5 h-3.5 text-amber-400 ml-1" />
            <select
              value={selectedComponent || ''}
              onChange={(e) => onSelectComponent(e.target.value)}
              className="bg-slate-800 text-xs text-amber-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="">All Components</option>
              {components.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <BookmarkCheck className="w-3.5 h-3.5 text-purple-400 ml-1" />
            <select
              onChange={(e) => {
                const found = savedFilters.find((f) => f._id === e.target.value);
                if (found) handleLoadPreset(found);
              }}
              defaultValue=""
              className="bg-slate-800 text-xs text-purple-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="" disabled>
                Saved Presets ({savedFilters.length})
              </option>
              {savedFilters.map((sf) => (
                <option key={sf._id} value={sf._id}>
                  🔖 {sf.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right Controls: Search & Save Preset */}
      <div className="flex items-center gap-2">
        {savingPreset ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Preset Name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none w-32"
            />
            <button
              onClick={handleSaveFilterPreset}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => setSavingPreset(false)}
              className="px-1.5 py-1 text-slate-400 hover:text-slate-200 text-xs"
            >
              &times;
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSavingPreset(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-300 bg-slate-800/80 px-2.5 py-1.5 border border-slate-700/50 rounded-lg transition-colors"
            title="Save current filter configuration"
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-400" /> Save Filter
          </button>
        )}

        {/* Global Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues (JQL / text)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/90 text-slate-200 placeholder-slate-500 border border-slate-700/70 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
