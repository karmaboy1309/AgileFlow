import React, { useState, useEffect } from 'react';
import { Calendar, Layers, Plus, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { epicsAPI, projectsAPI } from '../api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function RoadmapPage() {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        const { data } = await epicsAPI.getAll();
        setEpics(data.epics || []);
      } catch (err) {
        toast.error('Failed to load roadmap.');
      } finally {
        setLoading(false);
      }
    }
    loadRoadmap();
  }, []);

  return (
    <div className="flex min-h-screen bg-theme-bg text-theme-text">
      <Sidebar activeTab="reports" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Product Roadmap & Timeline" />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar className="text-indigo-400" size={24} />
                Product Roadmap
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Visualize epic milestones, target releases, and team execution timelines.
              </p>
            </div>
          </div>

          {/* Timeline Table */}
          <div className="rounded-2xl border border-theme-border bg-theme-card overflow-hidden shadow-2xl text-theme-text">
            {/* Timeline Header Months */}
            <div className="p-4 bg-white/[0.03] border-b border-white/[0.06] grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 text-center">
              <div className="col-span-4 text-left pl-2">Epic Name</div>
              <div className="col-span-2">Q1 Jan-Mar</div>
              <div className="col-span-2">Q2 Apr-Jun</div>
              <div className="col-span-2">Q3 Jul-Sep</div>
              <div className="col-span-2">Q4 Oct-Dec</div>
            </div>

            {/* Epic Timeline Rows */}
            <div className="divide-y divide-white/[0.04]">
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-10">Loading roadmap milestones…</p>
              ) : epics.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No epics created yet.</p>
              ) : (
                epics.map((epic) => {
                  const total = epic.taskCount || 0;
                  const done = epic.completedTaskCount || 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <div
                      key={epic._id}
                      className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Epic Info */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: epic.color || '#a855f7' }}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-white block truncate">
                            {epic.title}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {done}/{total} tasks completed ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Timeline Bar across quarters */}
                      <div className="col-span-8 bg-white/[0.02] rounded-xl p-2 border border-white/[0.04] relative flex items-center">
                        <div
                          className="h-6 rounded-lg flex items-center justify-between px-3 text-[11px] font-bold text-white shadow-lg transition-all"
                          style={{
                            width: `${Math.max(25, pct)}%`,
                            background: `linear-gradient(90deg, ${epic.color || '#6366f1'}, #8b5cf6)`,
                          }}
                        >
                          <span className="truncate">{epic.title}</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
