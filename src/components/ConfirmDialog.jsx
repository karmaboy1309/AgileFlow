import { AlertTriangle, X } from 'lucide-react';
import Spinner from './Spinner';

/**
 * components/ConfirmDialog.jsx
 *
 * Reusable modal dialog for destructive confirmation actions (e.g. epic deletion).
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        className="animate-fade-in-up w-full max-w-md rounded-2xl border border-white/[0.09] shadow-2xl p-6 relative"
        style={{ background: '#16161f' }}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg p-1 hover:bg-white/05 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 h-9 rounded-xl text-xs font-medium text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 h-9 rounded-xl text-xs font-medium text-white flex items-center gap-2 transition-all ${
              confirmVariant === 'danger'
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <Spinner size="h-3.5 w-3.5" />
                <span>Deleting…</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
