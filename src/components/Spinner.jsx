/**
 * components/Spinner.jsx
 *
 * Reusable animated loading spinner.
 * Replaces the copy-pasted inline SVG found across LoginPage, RegisterPage,
 * CreateEpicModal, CreateTaskModal, and KanbanBoard.
 *
 * Props:
 *   size  — Tailwind size class (default: 'h-4 w-4')
 *   className — extra classes forwarded to the <svg>
 */
export default function Spinner({ size = 'h-4 w-4', className = '' }) {
  return (
    <svg
      className={`animate-spin ${size} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}
