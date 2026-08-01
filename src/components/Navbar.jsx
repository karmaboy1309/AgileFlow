import { useNavigate } from 'react-router-dom';
import { Zap, LogOut, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Decodes the JWT payload (without verification — server handles that).
 * Returns null if the token is missing or malformed.
 */
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Returns the user's initials from their full name (max 2 chars).
 * e.g. "Jane Smith" → "JS", "Alice" → "AL"
 */
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Navbar({ title }) {
  const navigate = useNavigate();

  // Decode the stored JWT to get the current user's name
  const token   = localStorage.getItem('agileflow_token');
  const payload = token ? decodeToken(token) : null;
  const userName = payload?.name || '';

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

        {/* Right: avatar + logout */}
        <div className="flex items-center gap-3">
          {/* User avatar with initials */}
          {userName && (
            <div
              title={userName}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-white leading-none">
                  {getInitials(userName)}
                </span>
              </div>
              <span className="hidden sm:inline text-xs font-medium text-slate-300 max-w-[120px] truncate">
                {userName}
              </span>
            </div>
          )}

          {/* Logout */}
          <button
            id="navbar-logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
