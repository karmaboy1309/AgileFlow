import React from 'react';
import { Keyboard, X, Command } from 'lucide-react';

const SHORTCUTS = [
  { key: 'C', description: 'Create a new task / issue' },
  { key: 'E', description: 'Create a new Epic' },
  { key: 'B', description: 'Go to Backlog' },
  { key: 'A', description: 'Go to Active Sprint Board' },
  { key: '/', description: 'Focus quick search filter' },
  { key: 'M', description: 'Assign selected issue to me' },
  { key: 'Esc', description: 'Close modals & slide-over drawer' },
  { key: '?', description: 'Open Keyboard Shortcuts Reference' },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">Boost your productivity with hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{item.description}</span>
              <kbd className="px-2 py-1 rounded bg-slate-700/80 border border-slate-600/60 font-mono text-slate-200 text-[11px] shadow-inner font-semibold min-w-[24px] text-center">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Esc</kbd> to close</span>
          <span className="flex items-center gap-1"><Command className="w-3.5 h-3.5" /> AgileFlow Power User</span>
        </div>
      </div>
    </div>
  );
}
