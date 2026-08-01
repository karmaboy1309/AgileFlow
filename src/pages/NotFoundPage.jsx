import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

/**
 * pages/NotFoundPage.jsx
 *
 * Rendered for any route that does not match a defined path.
 * Provides a clear message and a one-click escape back to the dashboard.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0f0f17' }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/08 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-600/06 blur-3xl" />
      </div>

      <div className="text-center animate-fade-in-up max-w-md w-full relative">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 mb-8 shadow-xl shadow-amber-500/10">
          <AlertTriangle size={40} className="text-amber-400" />
        </div>

        {/* 404 number */}
        <p className="text-8xl font-black gradient-text mb-4 leading-none">404</p>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            id="not-found-home-btn"
            onClick={() => navigate('/dashboard')}
            className="btn-primary flex items-center justify-center gap-2 px-6 h-11 text-sm"
          >
            <Home size={15} />
            <span>Go to Dashboard</span>
          </button>
          <button
            id="not-found-back-btn"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 h-11 text-sm text-slate-400 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
