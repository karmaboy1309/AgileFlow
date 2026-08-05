import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, LogOut, LayoutDashboard, User, X, Check, Shield, Palette, KeyRound } from 'lucide-react';
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

  useEffect(() => {
    const selectedTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
    document.body.style.backgroundColor = selectedTheme.bg;
    localStorage.setItem('agileflow_theme', theme);
  }, [theme]);

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

        {/* Right: theme + avatar + logout */}
        <div className="flex items-center gap-3">
          {/* Theme selector */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
            <Palette size={13} className="text-slate-400 ml-1.5 hidden sm:inline" />
            <select
              id="theme-selector-btn"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-medium px-2 py-0.5 rounded-lg focus:outline-none cursor-pointer"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id} style={{ background: '#1e1e2d', color: '#fff' }}>
                  {t.label}
                </option>
              ))}
            </select>
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
    </header>
  );
}
