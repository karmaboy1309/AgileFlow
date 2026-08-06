import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import { projectsAPI } from '../api';
import { Settings, Save, Trash2, Plus, Sliders, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectSettingsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [newStatusName, setNewStatusName] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const p = projects.find((item) => item._id === selectedProjectId);
      if (p) {
        setName(p.name || '');
        setKey(p.key || '');
        setDescription(p.description || '');
        setStatuses(p.statuses || ['todo', 'in-progress', 'done']);
      }
    }
  }, [selectedProjectId, projects]);

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

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    try {
      await projectsAPI.update(selectedProjectId, {
        name,
        key: key.toUpperCase(),
        description,
        statuses,
      });
      toast.success('Project settings saved successfully!');
      fetchProjects();
    } catch (err) {
      toast.error('Failed to update project settings');
    }
  };

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;
    const formatted = newStatusName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!statuses.includes(formatted)) {
      setStatuses([...statuses, formatted]);
    }
    setNewStatusName('');
  };

  const handleRemoveStatus = (statusToRemove) => {
    if (statuses.length <= 1) {
      toast.error('Project must have at least 1 status column.');
      return;
    }
    setStatuses(statuses.filter((s) => s !== statusToRemove));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f17] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f17] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />

        <main className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" /> Project Configuration
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-8">Project Details & Custom Workflow</h1>

          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* Basic Info Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" /> General Project Metadata
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Project Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Issue Key Prefix</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 text-xs text-blue-300 font-mono font-bold border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Custom Workflow Columns Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" /> Custom Workflow Statuses
              </h2>

              <div className="flex flex-wrap gap-2 mb-4">
                {statuses.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200"
                  >
                    <span>{status}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStatus(status)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="New status column (e.g. in-review)..."
                  className="w-full bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddStatus}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-900/30"
              >
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
