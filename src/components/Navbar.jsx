import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, LogOut, LayoutDashboard, User, X, Check, Shield, Palette, KeyRound, Keyboard, HelpCircle, Rocket, BarChart3, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../api';

const AVATAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6'
];

const THEMES = [
  { id: 'dark',     label: 'Dark',     bg: '#0f0f17' },
  { id: 'midnight', label: 'Midnight', bg: '#0a0e1a' },
  { id: 'slate',    label: 'Slate',    bg: '#0f172a' },
  { id: 'emerald',  label: 'Emerald',  bg: '#061a14' },
  { id: 'light',    label: 'Light Mode',bg: '#f8fafc' },
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'U';
}

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('agileflow_theme') || 'dark');
  const [profileForm, setProfileForm] = useState({
    name: '',
    role: '',
    avatarColor: '#6366f1',
  });
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');

  useEffect(() => {
    const selectedTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = selectedTheme.bg;
    localStorage.setItem('agileflow_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    authAPI.getMe()
      .then(({ data }) => {
        setUser(data.user);
        setProfileForm({
          name: data.user.name || '',
          role: data.user.role || 'Developer',
          avatarColor: data.user.avatarColor || '#6366f1',
        });
      })
      .catch(() => {
        // Fallback if offline or guest token
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('agileflow_token');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(profileForm);
      setUser(data.user);
      setShowProfileModal(false);
      toast.success('Profile updated successfully! ✨');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowProfileModal(false);
      toast.success('Password changed successfully! 🔒');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const userName = user?.name || 'User';
  const avatarBg = user?.avatarColor || '#6366f1';

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/[0.06]">
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          id="navbar-brand-btn"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center transition-colors">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-lg font-bold text-theme-text group-hover:text-indigo-500 transition-colors">AgileFlow</span>
        </button>

        {/* Page title */}
        {title && (
          <div className="hidden md:flex items-center gap-2 text-slate-300 text-sm font-medium">
            <LayoutDashboard size={15} className="text-slate-500" />
            <span>{title}</span>
          </div>
        )}

        {/* Global Search Bar */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="relative w-48 md:w-64">
            <input
              type="text"
              placeholder="Search issues... (Ctrl+K)"
              onClick={() => {
                setShowCommandPalette(true);
              }}
              readOnly
              className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/10 rounded-xl py-1.5 pl-3 pr-8 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-600 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.06] select-none">Ctrl K</kbd>
          </div>
          <button
            onClick={() => setShowShortcutsModal(true)}
            type="button"
            title="Global Keyboard Shortcuts Guide"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/[0.08] hover:border-white/10 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <Keyboard size={15} />
          </button>
        </div>

        {/* Right: theme + avatar + logout */}
        <div className="flex items-center gap-3">
          {/* Theme selector */}
          <div className="relative">
            <button
              id="theme-selector-btn"
              onClick={() => setShowThemeDropdown((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-slate-300 font-medium transition-colors cursor-pointer"
            >
              <Palette size={14} className="text-indigo-400" />
              <span>Theme: {THEMES.find((t) => t.id === theme)?.label || 'Dark'}</span>
            </button>
            {showThemeDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowThemeDropdown(false)} />
                <div
                  className="absolute right-0 top-10 z-20 rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden py-1.5 animate-fade-in-up"
                  style={{ background: '#16161f', minWidth: '160px' }}
                >
                  {THEMES.map((t) => {
                    const isActive = t.id === theme;
                    const dotColor = t.id === 'dark' ? '#6366f1' : t.id === 'midnight' ? '#3b82f6' : t.id === 'slate' ? '#64748b' : t.id === 'emerald' ? '#10b981' : '#e2e8f0';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTheme(t.id);
                          setShowThemeDropdown(false);
                        }}
                        className={`flex items-center justify-between w-full px-4 py-2 text-xs transition-colors hover:bg-white/[0.05] ${
                          isActive ? 'text-indigo-400 font-semibold' : 'text-slate-300 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                          <span>{t.label}</span>
                        </div>
                        {isActive && <Check size={12} className="text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* User profile avatar pill */}
          <button
            id="navbar-profile-btn"
            onClick={() => setShowProfileModal(true)}
            title="Edit User Profile"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: avatarBg }}
            >
              <span className="text-[9px] font-bold text-white leading-none">
                {getInitials(userName)}
              </span>
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-medium text-slate-200 max-w-[110px] truncate">
                {userName}
              </span>
              <span className="text-[10px] text-slate-500 max-w-[110px] truncate">
                {user?.role || 'Developer'}
              </span>
            </div>
          </button>

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

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowProfileModal(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-md rounded-2xl border border-white/[0.09] shadow-2xl p-6"
            style={{ background: '#16161f' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Profile Settings</h3>
                  <p className="text-xs text-slate-500">Update your workspace profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User size={12} /> Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  activeTab === 'security' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound size={12} /> Security
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="input-dark text-xs h-9"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    <span className="flex items-center gap-1"><Shield size={12} /> Workspace Role</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.role}
                    onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                    className="input-dark text-xs h-9"
                    placeholder="e.g. Lead Developer, Product Owner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Avatar Accent Color</label>
                  <div className="flex items-center gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, avatarColor: c })}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ background: c }}
                      >
                        {profileForm.avatarColor === c && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 h-9 text-xs font-medium text-slate-400 border border-white/[0.08] rounded-xl hover:bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 h-9 text-xs flex items-center justify-center gap-2"
                  >
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
                  <input
                    id="current-password-input"
                    type="password"
                    required
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="input-dark text-xs h-9"
                    placeholder="Your current password"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                  <input
                    id="new-password-input"
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="input-dark text-xs h-9"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    id="confirm-password-input"
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    className="input-dark text-xs h-9"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 h-9 text-xs font-medium text-slate-400 border border-white/[0.08] rounded-xl hover:bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                  <button
                    id="change-password-btn"
                    type="submit"
                    disabled={pwSaving}
                    className="btn-primary flex-1 h-9 text-xs flex items-center justify-center gap-2"
                  >
                    <KeyRound size={13} />
                    {pwSaving ? 'Saving…' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowShortcutsModal(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-white/[0.09] shadow-2xl p-6"
            style={{ background: '#16161f' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Keyboard size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Global Shortcuts</h3>
                  <p className="text-xs text-slate-500">AgileFlow keyboard hotkeys</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Open Command Palette</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[10px] border border-white/10">Ctrl K</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Focus Search Bar</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[10px] border border-white/10">/</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Create New Epic (Dashboard)</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[10px] border border-white/10">E</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Create New Task (Board)</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[10px] border border-white/10">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Dismiss Modals / Overlay</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[10px] border border-white/10">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
          onClick={(e) => e.target === e.currentTarget && setShowCommandPalette(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-lg rounded-2xl border border-white/[0.09] shadow-2xl overflow-hidden text-theme-text"
            style={{ background: '#16161f' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 border-b border-white/[0.07] flex items-center gap-3">
              <Search className="w-5 h-5 text-indigo-400" />
              <input
                autoFocus
                type="text"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                placeholder="Type a command or search page..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <kbd className="text-[10px] font-mono text-slate-500 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.06] select-none">ESC</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {(() => {
                const allCommands = [
                  { icon: <LayoutDashboard size={14} />, label: 'Go to Dashboard', action: () => navigate('/dashboard') },
                  { icon: <Rocket size={14} />, label: 'Go to Releases', action: () => navigate('/releases') },
                  { icon: <BarChart3 size={14} />, label: 'Go to Reports', action: () => navigate('/reports') },
                  { icon: <Palette size={14} />, label: 'Switch to Dark Theme', action: () => setTheme('dark') },
                  { icon: <Palette size={14} />, label: 'Switch to Midnight Theme', action: () => setTheme('midnight') },
                  { icon: <Palette size={14} />, label: 'Switch to Slate Theme', action: () => setTheme('slate') },
                  { icon: <Palette size={14} />, label: 'Switch to Emerald Theme', action: () => setTheme('emerald') },
                  { icon: <Palette size={14} />, label: 'Switch to Light Theme', action: () => setTheme('light') },
                  { icon: <User size={14} />, label: 'Edit User Profile', action: () => { setShowProfileModal(true); } },
                  { icon: <LogOut size={14} />, label: 'Logout', action: handleLogout },
                ];

                const filtered = allCommands.filter((cmd) =>
                  cmd.label.toLowerCase().includes(paletteSearch.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No matching commands found.
                    </div>
                  );
                }

                return filtered.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      cmd.action();
                      setShowCommandPalette(false);
                      setPaletteSearch('');
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-xs text-slate-300 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <span className="text-slate-500 hover:text-indigo-400 transition-colors">{cmd.icon}</span>
                    <span className="font-medium">{cmd.label}</span>
                    <span className="ml-auto text-[10px] text-slate-600 font-mono">↵ Run</span>
                  </button>
                ));
              })()}
            </div>
            <div className="p-3 bg-white/[0.02] border-t border-white/[0.05] text-[10px] text-slate-500 flex items-center justify-between">
              <span>Use typing to filter actions</span>
              <span>Press ESC to exit</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
