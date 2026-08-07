import React, { useState } from 'react';
import { X, Download, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksAPI } from '../api';

export default function ExportImportModal({ isOpen, onClose, epicId, projectId, onImportSuccess }) {
  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  // Import State
  const [importText, setImportText] = useState('');
  const [parsedTasks, setParsedTasks] = useState([]);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportFormat === 'csv') {
        const response = await tasksAPI.exportTasks({ epicId, projectId, format: 'csv' });
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `agileflow_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('CSV Export downloaded! 📄');
      } else {
        const response = await tasksAPI.exportTasks({ epicId, projectId, format: 'json' });
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(response.data, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.setAttribute('download', `agileflow_export_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('JSON Export downloaded! 📦');
      }
    } catch (err) {
      toast.error('Failed to export tasks');
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      setImportText(content);
      parseContent(content, file.name.endsWith('.csv') ? 'csv' : 'json');
    };
    reader.readAsText(file);
  };

  const parseContent = (text, type) => {
    try {
      if (type === 'json' || text.trim().startsWith('[')) {
        const items = JSON.parse(text);
        if (Array.isArray(items)) {
          setParsedTasks(items);
          toast.success(`Parsed ${items.length} issue(s) from JSON`);
          return;
        }
      }

      // Simple CSV Parser
      const lines = text.trim().split('\n');
      if (lines.length <= 1) return;
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const tasks = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length > 0 && cols[0]) {
          const taskObj = {
            title: cols[1] || cols[0],
            issueType: cols[2] || 'task',
            status: cols[3] || 'todo',
            priority: cols[4] || 'medium',
            assignee: cols[5] || '',
            storyPoints: Number(cols[6]) || 0,
          };
          tasks.push(taskObj);
        }
      }

      setParsedTasks(tasks);
      toast.success(`Parsed ${tasks.length} issue(s) from CSV`);
    } catch (err) {
      toast.error('Failed to parse file format. Ensure valid JSON or CSV.');
    }
  };

  const handleImportSubmit = async () => {
    if (parsedTasks.length === 0) {
      toast.error('No tasks parsed to import.');
      return;
    }
    if (!epicId) {
      toast.error('Please select an Epic context to import tasks into.');
      return;
    }

    setImporting(true);
    try {
      const res = await tasksAPI.importTasks({
        epicId,
        projectId,
        tasks: parsedTasks,
      });
      toast.success(res.data.message || 'Imported tasks successfully!');
      if (onImportSuccess) onImportSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#161622] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Issue Data Export & Import Hub</h3>
              <p className="text-[11px] text-slate-400">Backup, transfer, or bulk import issues in CSV / JSON formats</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] bg-slate-900/50">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'export' ? 'border-blue-500 text-blue-400 bg-white/[0.03]' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" /> Export Issues
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'import' ? 'border-emerald-500 text-emerald-400 bg-white/[0.03]' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Export all issues in the current workspace to standard format for backup or external analysis.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    exportFormat === 'csv'
                      ? 'border-blue-500 bg-blue-500/10 text-slate-100'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block text-blue-400 mb-1">CSV Format</span>
                  <span className="text-[11px] block">Excel & Spreadsheet compatible table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    exportFormat === 'json'
                      ? 'border-blue-500 bg-blue-500/10 text-slate-100'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block text-blue-400 mb-1">JSON Format</span>
                  <span className="text-[11px] block">Structured raw metadata & subtasks</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : `Download ${exportFormat.toUpperCase()}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center bg-slate-900/40 hover:border-emerald-500/50 transition-colors">
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="import-file-input"
                />
                <label htmlFor="import-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                  <Upload className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-200">Click to upload CSV or JSON file</span>
                  <span className="text-[10px] text-slate-500">Supports exported AgileFlow issue files</span>
                </label>
              </div>

              {parsedTasks.length > 0 && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Ready to import {parsedTasks.length} issue(s)
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">Target Epic ID: {epicId || 'Select Epic'}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={importing || parsedTasks.length === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : 'Import Issues'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
