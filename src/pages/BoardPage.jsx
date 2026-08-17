import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { epicsAPI, tasksAPI } from '../api';
import Navbar from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';

// ─── Skeleton loader for the board ───────────────────────────────────────────
function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ minHeight: '520px', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="px-4 py-4 border-b border-white/[0.06] animate-shimmer h-14" />
          <div className="p-3 space-y-3 mt-2">
            {Array.from({ length: 3 - i }).map((_, j) => (
              <div key={j} className="rounded-xl animate-shimmer h-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardPage() {
  const { epicId } = useParams();
  const navigate   = useNavigate();
  const [epic,  setEpic]    = useState(null);
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [epicRes, tasksRes] = await Promise.all([
        epicsAPI.getById(epicId),
        tasksAPI.getByEpic(epicId, { limit: 50, skip: 0 }),
      ]);
      const epicData  = epicRes.data.epic  ?? epicRes.data;
      const tasksData = tasksRes.data.tasks ?? tasksRes.data;
      setEpic(epicData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setHasMore(Boolean(tasksRes.data.hasMore));
      setTotalCount(tasksRes.data.totalCount || (Array.isArray(tasksData) ? tasksData.length : 0));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load board.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [epicId]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const tasksRes = await tasksAPI.getByEpic(epicId, { limit: 50, skip: tasks.length });
      const newTasks = tasksRes.data.tasks || [];
      setTasks((prev) => [...prev, ...newTasks]);
      setHasMore(Boolean(tasksRes.data.hasMore));
    } catch {
      toast.error('Failed to load more tasks.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTasksChange = useCallback((updatedTasks) => {
    setTasks(updatedTasks);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <Layers size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-theme-text mb-2">Something went wrong</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">{error}</p>
          <div className="flex gap-3">
            <button
              id="board-retry-btn"
              onClick={fetchData}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
            <button
              id="board-back-btn"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm text-slate-400 border border-white/[0.08] px-4 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [focusMode, setFocusMode] = useState(false);

  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text ${focusMode ? 'focus-mode-active' : ''}`}>
      {!focusMode && <Navbar title={epic?.title || 'Board'} />}

      <main className={`max-w-screen-xl mx-auto px-6 ${focusMode ? 'py-4' : 'py-8'}`}>
        {/* Breadcrumb / header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            {!focusMode && (
              <button
                id="board-back-to-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3 group"
              >
                <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to Dashboard
              </button>
            )}

            {epic ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-1.5 h-10 rounded-full flex-shrink-0"
                  style={{ background: epic.color || '#6366f1' }}
                />
                <div>
                  <h1 className="text-xl font-bold text-theme-text">{epic.title}</h1>
                  {epic.description && (
                    <p className="text-slate-500 text-sm mt-0.5">{epic.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="animate-shimmer h-8 w-64 rounded-lg" />
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFocusMode(f => !f)}
              className={`flex items-center gap-2 text-xs border border-white/[0.07] px-3 py-2 rounded-xl transition-colors ${focusMode ? 'bg-[#6366f122] text-[#6366f1] border-[#6366f1]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
            >
              🔍 {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
            <button
              id="board-refresh-btn"
              onClick={fetchData}
              title="Refresh board"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 border border-white/[0.07] px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Board content */}
        {loading ? (
          <BoardSkeleton />
        ) : (
          <KanbanBoard
            tasks={tasks}
            epicId={epicId}
            onTasksChange={handleTasksChange}
            hasMore={hasMore}
            totalCount={totalCount}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
          />
        )}
      </main>
    </div>
  );
}
