import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, ArrowRight, Inbox, MoreHorizontal, Pencil, Trash2, Search, X, BarChart3, ChevronDown, ChevronUp, Download, Upload, Copy, Archive, ArchiveRestore } from 'lucide-react';
import toast from 'react-hot-toast';
import { epicsAPI } from '../api';
import Navbar from '../components/Navbar';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import CreateEpicModal from '../components/CreateEpicModal';
import EditEpicModal from '../components/EditEpicModal';
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Status Badge ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active    : { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  'on-hold' : { label: 'On Hold',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  completed : { label: 'Done',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)'  },
  archived  : { label: 'Archived', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
};

// ─── Global keyboard shortcuts ───────────────────────────────────────────────────

// ─── Export & Import Backup ──────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function EpicSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden animate-shimmer h-44" />
  );
}

// ─── Epic Card ─────────────────────────────────────────────────────────────────
function EpicCard({ epic, onClick, onEdit, onDelete, onDuplicate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const taskCount = epic.taskCount ?? 0;
  const doneCount = epic.doneCount ?? 0;
  const progress  = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const createdAt = epic.createdAt
    ? new Date(epic.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <article
      id={`epic-card-${epic._id}`}
      className="glass-card p-6 cursor-pointer group relative"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open board for epic: ${epic.title}`}
    >
      {/* Status badge */}
      {epic.status && epic.status !== 'active' && (
        <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={epic.status} />
        </div>
      )}
      {/* ⋯ menu */}
      <div
        ref={menuRef}
        className="absolute top-4 right-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id={`epic-menu-btn-${epic._id}`}
          onClick={() => setMenuOpen((v) => !v)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-300 transition-all rounded-md p-1 hover:bg-white/05"
          aria-label="Epic options"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-7 z-20 rounded-xl border border-white/[0.08] shadow-xl overflow-hidden"
            style={{ background: '#1e1e2d', minWidth: '160px' }}
          >
            <button
              id={`epic-edit-btn-${epic._id}`}
              onClick={() => { setMenuOpen(false); onEdit(epic); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-white/05 transition-colors border-b border-white/[0.06]"
            >
              <Pencil size={13} />
              Edit epic
            </button>
            {onDuplicate && (
              <button
                id={`epic-duplicate-btn-${epic._id}`}
                onClick={() => { setMenuOpen(false); onDuplicate(epic); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-indigo-300 hover:bg-white/05 transition-colors border-b border-white/[0.06]"
              >
                <Copy size={13} />
                Duplicate epic
              </button>
            )}
            {onArchive && epic.status !== 'archived' && (
              <button
                id={`epic-archive-btn-${epic._id}`}
                onClick={() => { setMenuOpen(false); onArchive(epic, 'archived'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors border-b border-white/[0.06]"
              >
                <Archive size={13} />
                Archive epic
              </button>
            )}
            {onArchive && epic.status === 'archived' && (
              <button
                id={`epic-restore-btn-${epic._id}`}
                onClick={() => { setMenuOpen(false); onArchive(epic, 'active'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors border-b border-white/[0.06]"
              >
                <ArchiveRestore size={13} />
                Restore epic
              </button>
            )}
            <button
              id={`epic-delete-btn-${epic._id}`}
              onClick={() => { setMenuOpen(false); onDelete(epic); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={13} />
              Delete epic
            </button>
          </div>
        )}
      </div>

      {/* Color accent + title row */}
      <div className="flex items-start justify-between mb-4 pr-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-3 h-10 rounded-full flex-shrink-0"
            style={{ background: epic.color || '#6366f1' }}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-base leading-tight group-hover:text-indigo-300 transition-colors truncate">
              {epic.title}
            </h3>
            {epic.description && (
              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{epic.description}</p>
            )}
          </div>
        </div>
        <ArrowRight
          size={16}
          className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1 ml-2"
        />
      </div>

      {/* Task count badge + progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{doneCount} / {taskCount} tasks done</span>
          <span style={{ color: epic.color || '#6366f1' }}>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: epic.color || '#6366f1' }}
          />
        </div>
      </div>

      {/* Target Milestone Date Indicator */}
      {epic.targetDate && (() => {
        const target = new Date(epic.targetDate);
        const now = new Date();
        const overdue = target < now && progress < 100;
        const targetLabel = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return (
          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-white/[0.06]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar size={12} className={overdue ? 'text-red-400' : 'text-indigo-400'} />
              <span>Target: <strong className={overdue ? 'text-red-400' : 'text-slate-200'}>{targetLabel}</strong></span>
            </span>
            {overdue && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                Overdue
              </span>
            )}
          </div>
        );
      })()}

      {/* Footer meta */}
      {createdAt && (
        <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} />
            <span>Created {createdAt}</span>
          </span>
        </div>
      )}
    </article>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
        <Inbox size={32} className="text-indigo-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No epics yet</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-8">
        Epics help you organise large bodies of work. Create your first one to get started.
      </p>
      <button id="empty-create-epic-btn" onClick={onCreateClick} className="btn-primary flex items-center gap-2">
        <Plus size={16} />
        <span>Create your first Epic</span>
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [epics, setEpics]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEpic, setEditingEpic] = useState(null);   // epic being edited
  const [creating, setCreating]       = useState(false);
  const [updating, setUpdating]       = useState(false);
  const [deletingEpic, setDeletingEpic] = useState(null); // epic object pending delete confirmation
  const [deleting, setDeleting]         = useState(false);

  const [analytics, setAnalytics]         = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showArchived, setShowArchived]   = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await epicsAPI.getAnalytics();
      setAnalytics(data.analytics);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  }, []);

  const fetchEpics = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        epicsAPI.getAll(),
        epicsAPI.getAll('archived'),
      ]);
      const active   = Array.isArray(activeRes.data) ? activeRes.data : activeRes.data.epics ?? [];
      const archived = Array.isArray(archivedRes.data) ? archivedRes.data : archivedRes.data.epics ?? [];
      setEpics([...active, ...archived]);
      fetchAnalytics();
    } catch {
      toast.error('Failed to load epics. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics]);

  useEffect(() => { fetchEpics(); }, [fetchEpics]);

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreateEpic = async (formData) => {
    setCreating(true);
    try {
      const { data } = await epicsAPI.create(formData);
      setEpics((prev) => [data.epic ?? data, ...prev]);
      setShowCreateModal(false);
      toast.success(`Epic "${formData.title}" created! 🎉`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create epic.');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleUpdateEpic = async (formData) => {
    if (!editingEpic) return;
    setUpdating(true);
    try {
      const { data } = await epicsAPI.update(editingEpic._id, formData);
      const updated = data.epic ?? data;
      setEpics((prev) => prev.map((e) => (e._id === updated._id ? { ...e, ...updated } : e)));
      setEditingEpic(null);
      toast.success(`Epic "${updated.title}" updated.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update epic.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDuplicateEpic = async (epicToDuplicate) => {
    try {
      const { data } = await epicsAPI.duplicate(epicToDuplicate._id);
      const newEpic = data.epic ?? data;
      setEpics((prev) => [newEpic, ...prev]);
      toast.success(`Duplicated "${epicToDuplicate.title}" ✨`);
      fetchAnalytics();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate epic.');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleConfirmDeleteEpic = async () => {
    if (!deletingEpic) return;
    setDeleting(true);
    try {
      await epicsAPI.delete(deletingEpic._id);
      setEpics((prev) => prev.filter((e) => e._id !== deletingEpic._id));
      toast.success(`Epic "${deletingEpic.title}" deleted.`);
      setDeletingEpic(null);
      fetchAnalytics();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete epic.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Archive / Restore epic ────────────────────────────────────────────────────────
  const handleArchiveEpic = async (epic, newStatus) => {
    try {
      const { data } = await epicsAPI.update(epic._id, { status: newStatus });
      const updated = data.epic ?? data;
      setEpics((prev) => prev.map((e) => (e._id === updated._id ? { ...e, ...updated } : e)));
      const msg = newStatus === 'archived' ? `Epic "${epic.title}" archived.` : `Epic "${epic.title}" restored.`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update epic status.');
    }
  };

  // Global keyboard shortcuts
  useKeyboardShortcut('e', () => setShowCreateModal(true));
  useKeyboardShortcut('/', () => document.getElementById('search-epics-input')?.focus());

  // ── Export & Import Backup ───────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);

  const handleExportWorkspace = async () => {
    try {
      const { data } = await epicsAPI.exportWorkspace();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agileflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Workspace backup exported successfully! 📦');
    } catch {
      toast.error('Failed to export workspace backup.');
    }
  };

  const handleImportWorkspace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const { data } = await epicsAPI.importWorkspace(json);
        toast.success(data.message || 'Workspace backup imported! 🎉');
        fetchEpics();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to import backup JSON file.');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const activeEpics   = epics.filter((e) => e.status !== 'archived');
  const archivedEpics = epics.filter((e) => e.status === 'archived');
  const currentEpics  = showArchived ? archivedEpics : activeEpics;

  const filteredEpics = currentEpics.filter((epic) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      epic.title.toLowerCase().includes(q) ||
      (epic.description && epic.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen" style={{ background: '#0f0f17' }}>
      <Navbar title="Dashboard" />

      <main className="max-w-screen-xl mx-auto px-6 py-10">
        {/* Workspace Analytics Panel */}
        {analytics && (
          <div className="glass rounded-2xl p-6 mb-8 border border-white/[0.08] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Workspace Analytics & Velocity</h2>
                  <p className="text-xs text-slate-500">Real-time aggregate performance metrics across all epics</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalytics((v) => !v)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-xl border border-white/[0.06] transition-colors"
              >
                <span>{showAnalytics ? 'Hide' : 'Show'} details</span>
                {showAnalytics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
                {/* Total Epics */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-bold text-white">{analytics.totalEpics}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Total Epics</p>
                </div>

                {/* Total Tasks */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-bold text-indigo-400">{analytics.totalTasks}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Total Tasks</p>
                </div>

                {/* Completion Rate */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{analytics.overallProgress}%</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Completion Rate</p>
                </div>

                {/* In Progress */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-bold text-amber-400">{analytics.inProgressTasks}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">In Progress</p>
                </div>

                {/* High Priority */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-bold text-rose-400">{analytics.highPriorityTasks}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">High Priority</p>
                </div>

                {/* Overdue Tasks */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                  <p className={`text-2xl font-bold ${analytics.overdueTasks > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {analytics.overdueTasks}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Overdue Tasks</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Page header & Search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {showArchived ? 'Archived Epics' : 'Your Epics'}
            </h1>
            <p className="text-slate-500 text-sm">
              {loading
                ? '…'
                : `${currentEpics.length} epic${currentEpics.length !== 1 ? 's' : ''} ${showArchived ? 'archived' : 'in your workspace'}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            {epics.length > 0 && (
              <div className="relative flex-1 sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="search-epics-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search epics…"
                  className="input-dark text-xs h-10 w-full"
                  style={{ paddingLeft: '2.5rem', paddingRight: searchQuery ? '2.25rem' : '1rem' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Backup Export & Import */}
            <button
              id="export-workspace-btn"
              onClick={handleExportWorkspace}
              title="Export workspace data as JSON"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 border border-white/[0.08] px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors flex-shrink-0"
            >
              <Download size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <label
              id="import-workspace-label"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 border border-white/[0.08] px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors flex-shrink-0 cursor-pointer"
              title="Import workspace backup JSON file"
            >
              <Upload size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">{importing ? 'Importing…' : 'Import'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportWorkspace}
                disabled={importing}
                className="hidden"
              />
            </label>

            <button
              id="create-epic-btn"
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
            >
              <Plus size={16} />
              <span>New Epic</span>
            </button>
          </div>
        </div>

        {/* Active / Archived tabs */}
        <div className="flex items-center gap-2 mb-6 mt-2">
          <button
            id="tab-active-epics-btn"
            onClick={() => setShowArchived(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !showArchived ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-400 bg-white/[0.04] hover:bg-white/[0.08]'
            }`}
          >
            Active ({activeEpics.length})
          </button>
          <button
            id="tab-archived-epics-btn"
            onClick={() => setShowArchived(true)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showArchived ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'text-slate-400 bg-white/[0.04] hover:bg-white/[0.08]'
            }`}
          >
            <Archive size={11} className="inline mr-1" />
            Archived ({archivedEpics.length})
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <EpicSkeleton key={i} />
            ))}
          </div>
        ) : epics.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : filteredEpics.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 text-slate-500">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No matching epics</h3>
            <p className="text-slate-500 text-sm mb-6">
              No epics match &quot;{searchQuery}&quot;. Try adjusting your search query.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredEpics.map((epic) => (
              <EpicCard
                key={epic._id}
                epic={epic}
                onClick={() => navigate(`/board/${epic._id}`)}
                onEdit={(e) => setEditingEpic(e)}
                onDelete={(e) => setDeletingEpic(e)}
                onDuplicate={handleDuplicateEpic}
                onArchive={handleArchiveEpic}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Epic Modal */}
      {showCreateModal && (
        <CreateEpicModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEpic}
          loading={creating}
        />
      )}

      {/* Edit Epic Modal */}
      {editingEpic && (
        <EditEpicModal
          epic={editingEpic}
          onClose={() => setEditingEpic(null)}
          onSubmit={handleUpdateEpic}
          loading={updating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingEpic}
        title="Delete Epic"
        message={`Are you sure you want to delete "${deletingEpic?.title}"? This will permanently delete the epic and all associated tasks.`}
        confirmLabel="Delete Epic"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleConfirmDeleteEpic}
        onClose={() => setDeletingEpic(null)}
      />
    </div>
  );
}
