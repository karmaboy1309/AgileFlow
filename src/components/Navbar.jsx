import { useNavigate } from 'react-router-dom';
import { Zap, LogOut, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar({ title }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('agileflow_token');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/[0.06]">
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          id="navbar-brand-btn"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">AgileFlow</span>
        </button>

        {/* Page title */}
        {title && (
          <div className="hidden md:flex items-center gap-2 text-slate-300 text-sm font-medium">
            <LayoutDashboard size={15} className="text-slate-500" />
            <span>{title}</span>
          </div>
        )}

        {/* Actions */}
        <button
          id="navbar-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
