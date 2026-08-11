import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import { projectsAPI, releasesAPI } from '../api';
import { Rocket, Plus, CheckCircle, Clock, Trash2, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReleasePage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Release Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchReleases(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedProjectId(res.data[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchReleases = async (pId) => {
    try {
      const res = await releasesAPI.getAll(pId);
      setReleases(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!name.trim() || !selectedProjectId) return;
    try {
      await releasesAPI.create({
        name,
        description,
        releaseDate: releaseDate || null,
        projectId: selectedProjectId,
      });
      toast.success(`Release '${name}' created!`);
      setName('');
      setDescription('');
      setReleaseDate('');
      setIsModalOpen(false);
      fetchReleases(selectedProjectId);
    } catch (err) {
      toast.error('Failed to create release');
    }
  };

  const handleMarkReleased = async (id) => {
    try {
      await releasesAPI.markReleased(id);
      toast.success('Release marked as Released! 🚀');
      fetchReleases(selectedProjectId);
    } catch (err) {
      toast.error('Failed to update release');
    }
  };

  const handleDeleteRelease = async (id) => {
    if (!window.confirm('Are you sure you want to delete this release?')) return;
    try {
      await releasesAPI.delete(id);
      toast.success('Release deleted');
      fetchReleases(selectedProjectId);
    } catch (err) {
      toast.error('Failed to delete release');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                <Rocket className="w-4 h-4" /> Fix Versions & Software Releases
              </div>
              <h1 className="text-2xl font-bold text-theme-text flex items-center gap-3">
                {selectedProject?.name || 'Project'} Releases
              </h1>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Create Version / Release
            </button>
          </div>

          {/* Releases List */}
          <div className="space-y-4">
            {releases.length > 0 ? (
              releases.map((rel) => {
                const progressPct = rel.totalPoints > 0 ? Math.round((rel.completedPoints / rel.totalPoints) * 100) : 0;
                const isReleased = rel.status === 'Released';

                return (
                  <div
                    key={rel._id}
                    className="bg-theme-card border border-theme-border rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-theme-border"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-100">{rel.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                            isReleased
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {rel.status}
                        </span>
                      </div>
                      {rel.description && <p className="text-xs text-slate-400">{rel.description}</p>}

                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 font-mono">
                        {rel.releaseDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Target: {new Date(rel.releaseDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>{rel.totalTasks} issues ({rel.completedTasks} done)</span>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="flex items-center gap-6 min-w-[280px]">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Release Readiness</span>
                          <span className="font-bold text-purple-400">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 text-right font-mono">
                          {rel.completedPoints} / {rel.totalPoints} story pts
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isReleased && (
                          <button
                            onClick={() => handleMarkReleased(rel._id)}
                            className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors text-xs font-semibold"
                            title="Mark as Released"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRelease(rel._id)}
                          className="p-2 rounded-xl bg-theme-surface hover:bg-red-500/20 text-theme-text-sub hover:text-red-300 border border-theme-border/50 hover:border-red-500/30 transition-colors"
                          title="Delete Release"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-theme-card rounded-lg border border-theme-border p-12 text-center text-theme-text-sub">
                No releases created yet. Create a release to track software delivery milestones.
              </div>
            )}
          </div>

          {/* Modal Form */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <form
                onSubmit={handleCreateRelease}
                className="bg-theme-surface border border-theme-border rounded-lg w-full max-w-md p-6 shadow-xl space-y-4"
              >
                <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-indigo-500" /> Create Fix Version / Release
                </h3>

                <div>
                  <label className="text-xs font-semibold text-theme-text-sub mb-1 block">Version Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. v1.0.0 or Sprint 24 Release"
                    className="w-full bg-theme-surface text-xs text-theme-text border border-theme-border rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-theme-text-sub mb-1 block">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief release goal..."
                    className="w-full bg-theme-surface text-xs text-theme-text border border-theme-border rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-theme-text-sub mb-1 block">Release Date</label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-theme-surface text-xs text-theme-text border border-theme-border rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded text-xs font-semibold text-theme-text-sub hover:bg-theme-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs"
                  >
                    Create Version
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
