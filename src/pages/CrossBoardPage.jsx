import React, { useState, useEffect } from 'react';
import { Layers, Globe, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksAPI } from '../api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import KanbanBoard from '../components/KanbanBoard';

export default function CrossBoardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllTasks() {
      try {
        const { data } = await tasksAPI.getByEpic('all', { limit: 150 });
        setTasks(data.tasks || []);
      } catch (err) {
        toast.error('Failed to load master board.');
      } finally {
        setLoading(false);
      }
    }
    loadAllTasks();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0f0f17] text-slate-100">
      <Sidebar activeTab="board" />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Multi-Project Master Board" />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="text-indigo-400" size={24} />
                Multi-Project Cross Board
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Unified workspace board aggregating active issues across all software projects.
              </p>
            </div>
          </div>

          {/* Master Board */}
          {loading ? (
            <p className="text-xs text-slate-500 text-center py-20">Loading master board issues…</p>
          ) : (
            <KanbanBoard tasks={tasks} onTasksChange={setTasks} />
          )}
        </main>
      </div>
    </div>
  );
}
