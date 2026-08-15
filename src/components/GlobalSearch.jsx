import { useState, useCallback, useRef, useEffect } from 'react';
import { tasksAPI, epicsAPI, projectsAPI, sprintsAPI } from '../api';
import { useNavigate } from 'react-router-dom';

// ─── GlobalSearch ─────────────────────────────────────────────────────────────
// Full-text fuzzy search across tasks, epics, sprints, and projects.
// Opens as a command-palette style modal overlay with keyboard navigation.

const ENTITY_ICONS = {
  task:    { icon: '📋', color: '#3b82f6' },
  epic:    { icon: '🏔', color: '#8b5cf6' },
  sprint:  { icon: '🚀', color: '#10b981' },
  project: { icon: '📁', color: '#f59e0b' },
};

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="gs-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('agileflow_token');
      const res = await fetch(`/api/tasks?search=${encodeURIComponent(q)}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const tasks = (data.tasks || []).map(t => ({
        id: t._id, type: 'task', title: t.title,
        sub: `${t.issueKey || ''} · ${t.status} · ${t.priority}`,
        url: t.epicId ? `/board/${t.epicId}` : '/backlog',
      }));

      const epicsRes = await fetch(`/api/epics?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const epicsData = await epicsRes.json();
      const epics = ((epicsData.epics || epicsData) || []).slice(0, 5).map(e => ({
        id: e._id, type: 'epic', title: e.title,
        sub: `Epic · ${e.status}`,
        url: `/board/${e._id}`,
      }));

      setResults([...tasks.slice(0, 7), ...epics]);
      setActiveIdx(0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) { navigate(results[activeIdx].url); onClose(); }
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="gs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gs-modal">
        {/* Search input */}
        <div className="gs-input-row">
          <span className="gs-search-icon">🔍</span>
          <input
            ref={inputRef}
            className="gs-input"
            placeholder="Search tasks, epics, sprints…"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {loading && <span className="gs-spinner" />}
          <kbd className="gs-esc-kbd" onClick={onClose}>Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="gs-results">
            {results.map((r, i) => {
              const meta = ENTITY_ICONS[r.type] || ENTITY_ICONS.task;
              return (
                <div
                  key={r.id}
                  className={`gs-result-item ${i === activeIdx ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => { navigate(r.url); onClose(); }}
                >
                  <div className="gs-result-icon" style={{ color: meta.color }}>{meta.icon}</div>
                  <div className="gs-result-body">
                    <div className="gs-result-title">{highlight(r.title, query)}</div>
                    <div className="gs-result-sub">{r.sub}</div>
                  </div>
                  <div className="gs-result-type" style={{ color: meta.color }}>{r.type}</div>
                  {i === activeIdx && <span className="gs-result-enter">↵</span>}
                </div>
              );
            })}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="gs-no-results">
            <span>No results for "<strong>{query}</strong>"</span>
          </div>
        )}

        {/* Footer shortcuts */}
        <div className="gs-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
