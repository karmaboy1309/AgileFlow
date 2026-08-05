import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, LayoutDashboard, BarChart2, Settings, ChevronLeft, ChevronRight, Zap, CheckSquare } from 'lucide-react';

export default function Sidebar({ project, activeTab = 'board' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      id: 'backlog',
      label: 'Backlog',
      icon: Layers,
      path: project ? `/projects/${project._id}/backlog` : '/backlog',
    },
    {
      id: 'board',
      label: 'Active Board',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart2,
      path: '/dashboard',
    },
    {
      id: 'settings',
      label: 'Project Settings',
      icon: Settings,
      path: '/dashboard',
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#14141e] border-r border-white/[0.08] flex flex-col justify-between transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div>
        {/* Project Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
              {project ? project.key.slice(0, 2) : 'AF'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate">
                  {project ? project.name : 'AgileFlow'}
                </h3>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {project ? `${project.key} Project` : 'Software Workspace'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || location.pathname.includes(item.id);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : ''}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/[0.08]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span>Collapse Sidebar</span></>}
        </button>
      </div>
    </aside>
  );
}
