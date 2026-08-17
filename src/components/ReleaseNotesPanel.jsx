import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ReleaseNotesPanel({ projectId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const token = localStorage.getItem('agileflow_token');

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/release-notes/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setNotes(data.releaseNotes || []);
    } catch {
      toast.error('Failed to load release notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const copyMarkdown = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Changelog copied to clipboard!');
  };

  return (
    <div className="rn-panel-card">
      <h3 className="rn-title">Release Notes & Changelogs</h3>
      {loading ? <p>Loading...</p> : notes.length === 0 ? <p className="rn-empty">No release notes published yet.</p> : notes.map(note => (
        <div key={note._id} className="rn-item-card">
          <div className="rn-item-header">
            <span className="rn-version">{note.versionName}</span>
            <button className="btn btn-secondary btn-xs" onClick={() => copyMarkdown(note.markdownCache)}>
              📋 Copy Markdown
            </button>
          </div>
          <p className="rn-summary">{note.summary}</p>
          <pre className="rn-md-preview">{note.markdownCache}</pre>
        </div>
      ))}
    </div>
  );
}
