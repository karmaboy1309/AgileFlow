import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Calendar, ArrowRight, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { epicsAPI } from '../api';
import Navbar from '../components/Navbar';
import CreateEpicModal from '../components/CreateEpicModal';

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function EpicSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden animate-shimmer h-44" />
  );
}

// ─── Epic Card ─────────────────────────────────────────────────────────────────
function EpicCard({ epic, onClick }) {
  const taskCount = epic.taskCount ?? 0;
  const doneCount = epic.doneCount ?? 0;
  const progress  = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const createdAt = epic.createdAt
    ? new Date(epic.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <article
      id={`epic-card-${epic._id}`}
      onClick={onClick}
      className="glass-card p-6 cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open board for epic: ${epic.title}`}
    >
      {/* Color accent + title row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-10 rounded-full flex-shrink-0"
            style={{ background: epic.color || '#6366f1' }}
          />
          <div>
            <h3 className="font-semibold text-white text-base leading-tight group-hover:text-indigo-300 transition-colors">
              {epic.title}
            </h3>
            {epic.description && (
              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{epic.description}</p>
            )}
          </div>
        </div>
        <ArrowRight
          size={16}
          className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
        />
      </div>

      {/* Progress bar */}
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
  const [epics, setEpics]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating]   = useState(false);

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

  const handleCreateEpic = async (formData) => {
    setCreating(true);
    try {
      const { data } = await epicsAPI.create(formData);
      setEpics((prev) => [data.epic ?? data, ...prev]);
      setShowModal(false);
      toast.success(`Epic "${formData.title}" created! 🎉`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create epic.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f0f17' }}>
      <Navbar title="Dashboard" />

      <main className="max-w-screen-xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Your Epics</h1>
            <p className="text-slate-500 text-sm">
              {loading ? '…' : `${epics.length} epic${epics.length !== 1 ? 's' : ''} in your workspace`}
            </p>
          </div>
          <button
            id="create-epic-btn"
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            <span>New Epic</span>
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
          <EmptyState onCreateClick={() => setShowModal(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {epics.map((epic) => (
              <EpicCard
                key={epic._id}
                epic={epic}
                onClick={() => navigate(`/board/${epic._id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Epic Modal */}
      {showModal && (
        <CreateEpicModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateEpic}
          loading={creating}
        />
      )}
    </div>
  );
}
