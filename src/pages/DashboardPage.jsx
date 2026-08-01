import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, ArrowRight, Inbox, MoreHorizontal, Pencil, Trash2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { epicsAPI } from '../api';
import Navbar from '../components/Navbar';
import CreateEpicModal from '../components/CreateEpicModal';
import EditEpicModal from '../components/EditEpicModal';
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function EpicSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden animate-shimmer h-44" />
  );
}

// ─── Epic Card ─────────────────────────────────────────────────────────────────
function EpicCard({ epic, onClick, onEdit, onDelete }) {
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
            style={{ background: '#1e1e2d', minWidth: '150px' }}
          >
            <button
              id={`epic-edit-btn-${epic._id}`}
              onClick={() => { setMenuOpen(false); onEdit(epic); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-white/05 transition-colors"
            >
              <Pencil size={13} />
              Edit epic
            </button>
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

      {/* Footer meta */}
      {createdAt && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-4">
          <Calendar size={11} />
          <span>Created {createdAt}</span>
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
  const [deleting, setDeleting]       = useState(null);   // id being deleted

  const fetchEpics = useCallback(async () => {
    try {
      const { data } = await epicsAPI.getAll();
      setEpics(Array.isArray(data) ? data : data.epics ?? []);
    } catch {
      toast.error('Failed to load epics. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const [deletingEpic, setDeletingEpic] = useState(null); // epic object pending delete confirmation
  const [deleting, setDeleting]         = useState(false);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleConfirmDeleteEpic = async () => {
    if (!deletingEpic) return;
    setDeleting(true);
    try {
      await epicsAPI.delete(deletingEpic._id);
      setEpics((prev) => prev.filter((e) => e._id !== deletingEpic._id));
      toast.success(`Epic "${deletingEpic.title}" deleted.`);
      setDeletingEpic(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete epic.');
    } finally {
      setDeleting(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredEpics = epics.filter((epic) => {
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
        {/* Page header & Search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Your Epics</h1>
            <p className="text-slate-500 text-sm">
              {loading
                ? '…'
                : `${epics.length} epic${epics.length !== 1 ? 's' : ''} in your workspace`}
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
