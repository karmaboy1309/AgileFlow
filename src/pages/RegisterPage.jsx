import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../api';
import Spinner from '../components/Spinner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      localStorage.setItem('agileflow_token', data.token);
      toast.success('Account created! Let\'s build something great 🚀');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6)  return { label: 'Weak',   color: '#ef4444', width: '30%'  };
    if (p.length < 10) return { label: 'Fair',   color: '#f59e0b', width: '60%'  };
    return               { label: 'Strong', color: '#10b981', width: '100%' };
  };
  const strength = passwordStrength();

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">AgileFlow</span>
          </div>
          <h1 className="text-3xl font-bold text-theme-text mb-2">Create your account</h1>
          <p className="text-theme-text-sub text-sm">Start your agile journey today</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-300 mb-2">
                Full name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  className="input-dark"
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="input-dark"
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="input-dark"
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength meter */}
              {strength && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, background: strength.color }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strength.color }}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ pointerEvents: 'none' }} />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className="input-dark"
                  style={{
                    paddingLeft: '2.75rem',
                    borderColor: form.confirmPassword && form.confirmPassword !== form.password
                      ? 'rgba(239,68,68,0.6)'
                      : undefined,
                  }}
                />
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-xs text-red-400 mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-11 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Creating account…</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-slate-500">OR</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <p className="text-center text-sm text-theme-text-sub">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
