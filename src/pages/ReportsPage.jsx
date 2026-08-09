import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import { projectsAPI, sprintsAPI, reportsAPI } from '../api';
import { BarChart3, TrendingDown, Zap, ArrowLeft, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [activeTab, setActiveTab] = useState('burndown'); // 'burndown' | 'velocity'

  const [burndownData, setBurndownData] = useState(null);
  const [velocityData, setVelocityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSprints(selectedProjectId);
      fetchVelocity(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSprintId) {
      fetchBurndown(selectedSprintId);
    }
  }, [selectedSprintId]);

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

  const fetchSprints = async (pId) => {
    try {
      const res = await sprintsAPI.getAll(pId);
      setSprints(res.data || []);
      if (res.data && res.data.length > 0) {
        const activeSprint = res.data.find((s) => s.status === 'active') || res.data[0];
        setSelectedSprintId(activeSprint._id);
      } else {
        setSelectedSprintId(null);
        setBurndownData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBurndown = async (sId) => {
    try {
      const res = await reportsAPI.getBurndown(sId);
      setBurndownData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVelocity = async (pId) => {
    try {
      const res = await reportsAPI.getVelocity(pId);
      setVelocityData(res.data);
    } catch (err) {
      console.error(err);
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
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                <BarChart3 className="w-4 h-4" /> Agile Analytics & Reports
              </div>
              <h1 className="text-2xl font-bold text-theme-text flex items-center gap-3">
                {selectedProject?.name || 'Project'} Reports
              </h1>
            </div>

            {/* Tab Controls */}
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('burndown')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'burndown'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <TrendingDown className="w-4 h-4" /> Sprint Burndown
              </button>
              <button
                onClick={() => setActiveTab('velocity')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'velocity'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Zap className="w-4 h-4" /> Sprint Velocity
              </button>
            </div>
          </div>

          {/* TAB 1: BURNDOWN REPORT */}
          {activeTab === 'burndown' && (
            <div className="space-y-6">
              {/* Sprint Selector Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-theme-card p-4 rounded-2xl border border-theme-border text-theme-text">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-semibold text-theme-text-sub">Select Sprint:</span>
                  <select
                    value={selectedSprintId || ''}
                    onChange={(e) => setSelectedSprintId(e.target.value)}
                    className="bg-theme-surface text-theme-text border border-theme-border text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
                  >
                    {sprints.map((s) => (
                      <option key={s._id} value={s._id} style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                {burndownData && (
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="bg-theme-surface px-3 py-1.5 rounded-lg border border-theme-border">
                      Total: <strong className="text-blue-400">{burndownData.totalPoints} pts</strong>
                    </span>
                    <span className="bg-theme-surface px-3 py-1.5 rounded-lg border border-theme-border">
                      Completed: <strong className="text-emerald-400">{burndownData.completedPoints} pts</strong>
                    </span>
                    <span className="bg-theme-surface px-3 py-1.5 rounded-lg border border-theme-border">
                      Remaining: <strong className="text-amber-400">{burndownData.remainingPoints} pts</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Burndown Chart Box */}
              {burndownData && burndownData.dataPoints?.length > 0 ? (
                <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl text-theme-text">
                  <h3 className="text-sm font-bold text-theme-text mb-6 flex items-center justify-between">
                    <span>Story Points Burndown Slope</span>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-purple-400">
                        <span className="w-3 h-0.5 bg-purple-400 border border-dashed border-purple-400 inline-block" /> Ideal Burndown
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-3 h-1 bg-emerald-400 rounded inline-block" /> Actual Remaining
                      </span>
                    </div>
                  </h3>

                  {/* SVG Chart */}
                  <div className="h-64 w-full relative pt-4 pb-8">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="0" x2="500" y2="0" stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1="200" x2="500" y2="200" stroke="#334155" strokeWidth="1" />

                      {/* Ideal Line (Purple Dashed) */}
                      <line
                        x1="0"
                        y1="10"
                        x2="500"
                        y2="190"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        strokeDasharray="6,4"
                      />

                      {/* Actual Line (Emerald Solid) */}
                      {(() => {
                        const points = burndownData.dataPoints;
                        const maxP = Math.max(1, burndownData.totalPoints);
                        const pathString = points
                          .map((dp, i) => {
                            const x = (i / (points.length - 1)) * 500;
                            const y = 190 - (dp.actual / maxP) * 180;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ');
                        return (
                          <path
                            d={pathString}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Day breakdown cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-6">
                    {burndownData.dataPoints.map((dp, idx) => (
                      <div key={idx} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">{dp.day}</span>
                        <div className="text-xs font-mono font-bold text-emerald-400 mt-1">{dp.actual} pts</div>
                        <div className="text-[10px] text-slate-500 font-mono">Ideal: {dp.ideal}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-theme-card border border-theme-border rounded-2xl p-12 text-center text-theme-text-sub">
                  Select a sprint to view the burndown chart.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VELOCITY REPORT */}
          {activeTab === 'velocity' && (
            <div className="space-y-6">
              {velocityData && velocityData.velocityData?.length > 0 ? (
                <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl text-theme-text">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-theme-text">Historical Sprint Velocity</h3>
                      <p className="text-xs text-theme-text-sub">Committed vs Completed Story Points across sprints</p>
                    </div>
                    {(() => {
                      const completedSum = velocityData.velocityData.reduce((s, v) => s + v.completedPoints, 0);
                      const avgVelocity = Math.round((completedSum / (velocityData.velocityData.length || 1)) * 10) / 10;
                      return (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          Avg Velocity: {avgVelocity} pts / sprint
                        </div>
                      );
                    })()}
                  </div>

                  {/* Velocity Bar Chart Visualization */}
                  <div className="space-y-4">
                    {velocityData.velocityData.map((item) => {
                      const maxBar = Math.max(1, item.committedPoints, item.completedPoints);
                      const committedPct = (item.committedPoints / maxBar) * 100;
                      const completedPct = (item.completedPoints / maxBar) * 100;

                      return (
                        <div key={item.sprintId} className="bg-theme-surface p-4 rounded-xl border border-theme-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-theme-text">{item.sprintName}</span>
                            <span className="text-xs font-mono text-theme-text-sub">
                              {item.completedPoints} / {item.committedPoints} pts completed
                            </span>
                          </div>

                          {/* Progress Bars */}
                          <div className="space-y-1.5">
                            {/* Committed */}
                            <div className="w-full bg-theme-hover h-2.5 rounded-full overflow-hidden flex">
                              <div
                                className="bg-slate-500 h-full rounded-full transition-all"
                                style={{ width: `${committedPct}%` }}
                                title={`Committed: ${item.committedPoints} pts`}
                              />
                            </div>
                            {/* Completed */}
                            <div className="w-full bg-theme-hover h-2.5 rounded-full overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${completedPct}%` }}
                                title={`Completed: ${item.completedPoints} pts`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-theme-card border border-theme-border rounded-2xl p-12 text-center text-theme-text-sub">
                  No sprint data available to calculate velocity. Create and start sprints to track team throughput.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
