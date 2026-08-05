import React from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6 text-slate-100"
          style={{ background: '#0f0f17' }}
        >
          <div className="text-center max-w-md w-full glass rounded-3xl p-8 border border-red-500/20 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertOctagon size={32} className="text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6">
              An unexpected error occurred in the application interface.
            </p>

            {this.state.error && (
              <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 mb-6 text-left overflow-x-auto max-h-32 text-xs font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary flex items-center justify-center gap-2 text-xs h-10 px-4"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/dashboard';
                }}
                className="flex items-center justify-center gap-2 text-xs h-10 px-4 text-slate-300 border border-white/10 rounded-xl hover:bg-white/05 transition-colors"
              >
                <Home size={14} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
