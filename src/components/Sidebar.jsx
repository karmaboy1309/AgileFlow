import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, LayoutDashboard, BarChart2, Rocket, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Sidebar component that renders the primary navigation and project selector.
 * 
 * @param {Object} props
 * @param {Object} [props.project] - The currently selected project object
 * @param {Array} [props.projects] - List of all projects the user is associated with
 * @param {string} [props.selectedProjectId] - ID of the selected project
 * @param {function} [props.onSelectProject] - Callback triggered when selecting a different project
 * @param {string} [props.activeTab] - Currently active navigation tab
 */
export default function Sidebar({ project, projects = [], selectedProjectId, onSelectProject, activeTab = 'board' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      id: 'backlog',
      label: 'Backlog',
      icon: Layers,
      path: '/backlog',
    },
    {
      id: 'board',
      label: 'Active Board',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      id: 'reports',
      label: 'Reports & Burndown',
      icon: BarChart2,
      path: '/reports',
    },
    {
      id: 'releases',
      label: 'Releases',
      icon: Rocket,
      path: '/releases',
    },
    {
      id: 'settings',
      label: 'Project Settings',
      icon: Settings,
      path: '/settings',
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 bg-theme-sidebar border-r border-theme-border hidden md:flex flex-col justify-between transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div>
        {/* Project Header / Selector */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 w-full">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
              {project ? project.key.slice(0, 3) : 'AF'}
            </div>
            {!collapsed && (
              <div className="min-w-0 w-full">
                {projects.length > 0 && onSelectProject ? (
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => onSelectProject(e.target.value)}
                    className="w-full bg-theme-surface text-xs font-bold text-theme-text border border-theme-border rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id} style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-theme-text truncate">
                      {project ? project.name : 'AgileFlow'}
                    </h3>
                    <span className="text-[10px] text-theme-text-sub block font-mono">
                      {project ? `${project.key} Project` : 'Software Workspace'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.id);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : ''}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-theme-text-sub hover:text-theme-text hover:bg-theme-hover'
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
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs text-theme-text-sub hover:text-theme-text hover:bg-theme-hover transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span>Collapse Sidebar</span></>}
        </button>
      </div>
    </aside>
  );
}
