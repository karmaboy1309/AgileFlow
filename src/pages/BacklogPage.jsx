import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Play, CheckCircle2, ChevronDown, ChevronRight, Calendar, User, MoreHorizontal, Layers, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, sprintsAPI, tasksAPI } from '../api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import IssueTypeIcon from '../components/IssueTypeIcon';
import IssueDetailDrawer from '../components/IssueDetailDrawer';

export default function BacklogPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backlog');

  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '' });
  const [creatingSprint, setCreatingSprint] = useState(false);

  const [quickTitle, setQuickTitle] = useState('');
  const [quickTargetSprint, setQuickTargetSprint] = useState(null); // null = backlog

  const [selectedIssue, setSelectedIssue] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // If no projectId param, fetch all projects and pick the first or default
      let projId = projectId;
      if (!projId) {
        const { data: pData } = await projectsAPI.getAll();
        const projs = pData.projects || [];
        if (projs.length > 0) {
          projId = projs[0]._id;
        }
      }

      if (projId) {
        const [projRes, sprintRes] = await Promise.all([
          projectsAPI.getById(projId),
          sprintsAPI.getAll(projId),
        ]);
        setProject(projRes.data.project);
        setSprints(sprintRes.data.sprints || []);
      }

      // Fetch all tasks
      const taskRes = await tasksAPI.getByEpic('all', { limit: 200 });
      setTasks(taskRes.data.tasks || []);
    } catch (err) {
      toast.error('Failed to load backlog data.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!project) return;
    setCreatingSprint(true);
    try {
      const { data } = await sprintsAPI.create({
        name: sprintForm.name || `Sprint ${sprints.length + 1}`,
        goal: sprintForm.goal,
        projectId: project._id,
      });
      setSprints([data.sprint, ...sprints]);
      setSprintForm({ name: '', goal: '' });
      setShowCreateSprintModal(false);
      toast.success('Sprint created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create sprint.');
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      const { data } = await sprintsAPI.start(sprintId, { durationDays: 14 });
      toast.success(data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start sprint.');
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      const { data } = await sprintsAPI.complete(sprintId);
      toast.success(data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete sprint.');
    }
  };

  const handleMoveIssueToSprint = async (taskId, sprintId) => {
    try {
      await tasksAPI.update(taskId, { sprintId });
      setTasks(tasks.map((t) => (t._id === taskId ? { ...t, sprintId } : t)));
      toast.success(sprintId ? 'Moved to Sprint' : 'Moved to Backlog');
    } catch {
      toast.error('Failed to move issue.');
    }
  };

  const backlogTasks = tasks.filter((t) => !t.sprintId);

  return (
    <div className="flex min-h-screen bg-theme-bg text-theme-text">
      <Sidebar project={project} activeTab="backlog" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={project ? `${project.name} (${project.key}) Backlog` : 'Backlog'} />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-theme-text flex items-center gap-2">
                <Layers className="text-indigo-400" size={24} />
                Sprint Backlog
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Plan sprints, estimate story points, and prioritize backlog issues.
              </p>
            </div>

            <button
              onClick={() => setShowCreateSprintModal(true)}
              className="btn-primary flex items-center gap-2 text-xs h-9 px-3"
            >
              <Plus size={14} />
              <span>Create Sprint</span>
            </button>
          </div>

          {/* Sprints Section */}
          <div className="space-y-6 mb-8">
            {sprints.map((sprint) => {
              const sprintTasks = tasks.filter((t) => t.sprintId === sprint._id);
              const totalPoints = sprintTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

              return (
                <div
                  key={sprint._id}
                  className="rounded-2xl border border-theme-border bg-theme-card overflow-hidden shadow-lg"
                >
                  {/* Sprint Header */}
                  <div className="p-4 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-theme-text text-sm">{sprint.name}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sprint.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : sprint.status === 'closed'
                            ? 'bg-slate-500/20 text-slate-400'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {sprint.status}
                      </span>
                      {sprint.goal && (
                        <span className="text-xs text-slate-400 italic">"{sprint.goal}"</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/20">
                        {totalPoints} pts
                      </span>
                      <span>{sprintTasks.length} issues</span>

                      {sprint.status === 'draft' && (
                        <button
                          onClick={() => handleStartSprint(sprint._id)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-lg text-xs transition-colors"
                        >
                          <Play size={12} /> Start Sprint
                        </button>
                      )}
                      {sprint.status === 'active' && (
                        <button
                          onClick={() => handleCompleteSprint(sprint._id)}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1 rounded-lg text-xs transition-colors"
                        >
                          <CheckCircle2 size={12} /> Complete Sprint
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sprint Tasks List */}
                  <div className="p-2 divide-y divide-white/[0.04]">
                    {sprintTasks.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">
                        Plan a sprint by dragging issues here or moving from backlog.
                      </p>
                    ) : (
                      sprintTasks.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => setSelectedIssue(t)}
                          className="p-3 hover:bg-white/[0.04] transition-colors flex items-center justify-between cursor-pointer rounded-xl group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <IssueTypeIcon type={t.issueType} />
                            <span className="text-xs font-mono font-semibold text-slate-400">
                              {t.issueKey || 'AGILE-?'}
                            </span>
                            <span className="text-xs font-medium text-slate-200 truncate">
                              {t.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            {t.storyPoints > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                                {t.storyPoints}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveIssueToSprint(t._id, null);
                              }}
                              className="text-[11px] text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
                            >
                              Move to Backlog
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Backlog Section */}
          <div className="rounded-2xl border border-theme-border bg-theme-card overflow-hidden shadow-lg">
            <div className="p-4 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-theme-text text-sm">Backlog</span>
                <span className="text-xs text-slate-500">({backlogTasks.length} issues)</span>
              </div>
            </div>

            <div className="p-2 divide-y divide-white/[0.04]">
              {backlogTasks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Your backlog is clear! ✨</p>
              ) : (
                backlogTasks.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedIssue(t)}
                    className="p-3 hover:bg-white/[0.04] transition-colors flex items-center justify-between cursor-pointer rounded-xl group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IssueTypeIcon type={t.issueType} />
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {t.issueKey || 'AGILE-?'}
                      </span>
                      <span className="text-xs font-medium text-slate-200 truncate">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {t.storyPoints > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                          {t.storyPoints}
                        </span>
                      )}
                      {sprints.length > 0 && (
                        <select
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleMoveIssueToSprint(t._id, e.target.value || null)}
                          defaultValue=""
                          className="text-[11px] bg-theme-surface border border-theme-border text-theme-text rounded px-2 py-0.5 focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>
                            Move to Sprint…
                          </option>
                          {sprints.map((s) => (
                            <option key={s._id} value={s._id} style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Sprint Modal */}
      {showCreateSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-2xl text-theme-text">
            <h3 className="text-lg font-semibold text-theme-text mb-4">Create Sprint</h3>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sprint Name</label>
                <input
                  type="text"
                  required
                  placeholder={`Sprint ${sprints.length + 1}`}
                  value={sprintForm.name}
                  onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                  className="input-dark text-xs h-9 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sprint Goal</label>
                <textarea
                  rows={3}
                  placeholder="What is the main objective for this sprint?"
                  value={sprintForm.goal}
                  onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                  className="input-dark text-xs w-full p-2.5"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSprintModal(false)}
                  className="flex-1 h-9 text-xs text-slate-400 border border-white/10 rounded-xl hover:bg-white/05"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSprint}
                  className="btn-primary flex-1 h-9 text-xs"
                >
                  {creatingSprint ? 'Creating…' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Detail Drawer */}
      {selectedIssue && (
        <IssueDetailDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={(updated) => {
            setTasks(tasks.map((t) => (t._id === updated._id ? updated : t)));
            setSelectedIssue(updated);
          }}
        />
      )}
    </div>
  );
}
