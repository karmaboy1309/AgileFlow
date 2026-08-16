import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

// ─── RetrospectivePage ────────────────────────────────────────────────────────
// Interactive retrospective board for sprint reviews.
// Three-column layout: Went Well | Improvements | Action Items
// with inline item creation, voting, and mood check-in.

const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['Terrible', 'Poor', 'OK', 'Good', 'Great'];

function RetroColumn({ title, color, icon, items, onAdd, onVote, currentUserId }) {
  const [newText, setNewText] = useState('');
  const [adding, setAdding]   = useState(false);
  const [open, setOpen]       = useState(false);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    await onAdd(newText.trim());
    setNewText('');
    setOpen(false);
    setAdding(false);
  };

  // Sort by vote count descending
  const sorted = [...(items || [])].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  return (
    <div className="rp-column">
      <div className="rp-col-header" style={{ borderTopColor: color }}>
        <span className="rp-col-icon">{icon}</span>
        <h3 className="rp-col-title" style={{ color }}>{title}</h3>
        <span className="rp-col-count">{items?.length || 0}</span>
      </div>

      <div className="rp-items">
        {sorted.map(item => {
          const myVote = item.votes?.some(v => v === currentUserId || v?._id === currentUserId);
          return (
            <div key={item._id} className={`rp-item ${myVote ? 'voted' : ''}`}>
              <div className="rp-item-text">{item.text}</div>
              <div className="rp-item-footer">
                <span className="rp-item-author">{item.author?.name || 'Anonymous'}</span>
                <button className={`rp-vote-btn ${myVote ? 'active' : ''}`} onClick={() => onVote(item._id)} title={myVote ? 'Remove vote' : 'Vote'}>
                  👍 <span className="rp-vote-count">{item.votes?.length || 0}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {open ? (
        <div className="rp-add-form">
          <textarea
            className="rp-add-input"
            placeholder={`${title}…`}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={3}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && e.metaKey && handleAdd()}
          />
          <div className="rp-add-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding || !newText.trim()}>
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button className="rp-add-btn" style={{ borderColor: `${color}44`, color }} onClick={() => setOpen(true)}>
          + Add item
        </button>
      )}
    </div>
  );
}

function MoodCheckin({ onSubmit }) {
  const [score, setScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!score) return;
    await onSubmit(score);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="rp-mood-submitted">
      <span className="rp-mood-submitted-emoji">{MOOD_EMOJIS[score - 1]}</span>
      <span>Mood submitted! Thanks.</span>
    </div>
  );

  return (
    <div className="rp-mood-checkin">
      <div className="rp-mood-title">How did this sprint feel?</div>
      <div className="rp-mood-options">
        {MOOD_EMOJIS.map((emoji, i) => (
          <button key={i} className={`rp-mood-btn ${score === i + 1 ? 'selected' : ''}`} onClick={() => setScore(i + 1)} title={MOOD_LABELS[i]}>
            <span className="rp-mood-emoji">{emoji}</span>
            <span className="rp-mood-label">{MOOD_LABELS[i]}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!score}>Submit Mood</button>
    </div>
  );
}

export default function RetrospectivePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sprints, setSprints]         = useState([]);
  const [selectedSprint, setSprint]   = useState('');
  const [retro, setRetro]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const token = localStorage.getItem('agileflow_token');
  const currentUserId = (() => { try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; } })();

  useEffect(() => {
    fetch('/api/sprints', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const ss = d.sprints || d || []; setSprints(ss); if (ss.length > 0) setSprint(ss[0]._id); });
  }, []);

  useEffect(() => {
    if (!selectedSprint) return;
    setLoading(true);
    fetch(`/api/retrospectives/sprint/${selectedSprint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setRetro(d.retrospective)).finally(() => setLoading(false));
  }, [selectedSprint]);

  const addItem = async (category, text) => {
    await fetch(`/api/retrospectives/sprint/${selectedSprint}/item`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category, text }),
    });
    const res = await fetch(`/api/retrospectives/sprint/${selectedSprint}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setRetro(data.retrospective);
  };

  const vote = async (category, itemId) => {
    await fetch(`/api/retrospectives/sprint/${selectedSprint}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category, itemId }),
    });
    const res = await fetch(`/api/retrospectives/sprint/${selectedSprint}`, { headers: { Authorization: `Bearer ${token}` } });
    setRetro((await res.json()).retrospective);
  };

  const submitMood = async (score) => {
    await fetch(`/api/retrospectives/sprint/${selectedSprint}/mood`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score }),
    });
    toast.success('Mood recorded!');
  };

  const avgMood = retro?.moodScores?.length
    ? (retro.moodScores.reduce((a, b) => a + b, 0) / retro.moodScores.length).toFixed(1)
    : null;

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
          <div className="rp-page">
            <div className="rp-header">
              <div>
                <h1 className="rp-title">Sprint Retrospective</h1>
                <p className="rp-subtitle">Reflect, improve, and commit to action items</p>
              </div>
              <div className="rp-controls">
                <select className="rp-sprint-select" value={selectedSprint} onChange={e => setSprint(e.target.value)}>
                  {sprints.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                {avgMood && <span className="rp-mood-avg">Team Mood: {MOOD_EMOJIS[Math.round(avgMood) - 1]} {avgMood}/5 ({retro?.moodScores?.length} responses)</span>}
              </div>
            </div>

            {loading ? <div className="rp-loading">Loading retrospective…</div> : retro ? (
              <>
                <MoodCheckin onSubmit={submitMood} />
                <div className="rp-columns">
                  <RetroColumn title="What Went Well" color="#10b981" icon="✅" items={retro.wentWell}
                    onAdd={text => addItem('wentWell', text)} onVote={id => vote('wentWell', id)} currentUserId={currentUserId} />
                  <RetroColumn title="What Could Improve" color="#f59e0b" icon="⚡" items={retro.improvements}
                    onAdd={text => addItem('improvements', text)} onVote={id => vote('improvements', id)} currentUserId={currentUserId} />
                  <div className="rp-column rp-action-col">
                    <div className="rp-col-header" style={{ borderTopColor: '#6366f1' }}>
                      <span className="rp-col-icon">📋</span>
                      <h3 className="rp-col-title" style={{ color: '#6366f1' }}>Action Items</h3>
                      <span className="rp-col-count">{retro.actionItems?.length || 0}</span>
                    </div>
                    <div className="rp-items">
                      {retro.actionItems?.map(a => (
                        <div key={a._id} className={`rp-action-item ${a.isDone ? 'done' : ''}`}>
                          <div className="rp-action-text">{a.title}</div>
                          <div className="rp-action-meta">
                            {a.owner?.name && <span className="rp-action-owner">👤 {a.owner.name}</span>}
                            {a.dueDate && <span className="rp-action-due">📅 {new Date(a.dueDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
