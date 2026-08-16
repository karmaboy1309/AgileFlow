import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

// ─── RichCommentEditor ────────────────────────────────────────────────────────
// Markdown-aware comment editor with @mention autocomplete, emoji picker,
// preview mode, and character limit indicator.

const EMOJI_LIST = ['👍','❤️','🚀','😂','😮','😢','🎉','🔥','💯','✅','❌','⚠️','🐛','💡','📌'];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="rce-emoji-picker">
      {EMOJI_LIST.map(emoji => (
        <button key={emoji} className="rce-emoji-btn" onClick={() => { onSelect(emoji); onClose(); }}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

function MentionDropdown({ users, activeIdx, onSelect }) {
  if (!users.length) return null;
  return (
    <div className="rce-mention-dropdown">
      {users.map((user, i) => (
        <div
          key={user._id}
          className={`rce-mention-item ${i === activeIdx ? 'active' : ''}`}
          onMouseDown={e => { e.preventDefault(); onSelect(user); }}
        >
          <div className="rce-mention-avatar" style={{ background: user.avatarColor || '#6366f1' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="rce-mention-name">{user.name}</div>
            <div className="rce-mention-email">{user.email}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple markdown → HTML converter for preview
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, '<span class="rce-mention-tag">@$1</span>');
}

const MAX_LENGTH = 5000;

export default function RichCommentEditor({ entityType, entityId, parentId = null, onCommentAdded, placeholder = 'Write a comment… Use @ to mention someone' }) {
  const [content, setContent]       = useState('');
  const [preview, setPreview]       = useState(false);
  const [showEmoji, setShowEmoji]   = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionIdx, setMentionIdx]   = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const token = localStorage.getItem('agileflow_token');

  // Fetch @mention users
  useEffect(() => {
    if (mentionQuery.length < 1) { setMentionUsers([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?query=${encodeURIComponent(mentionQuery)}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setMentionUsers((data.users || data).slice(0, 6));
      } catch { setMentionUsers([]); }
    }, 200);
    return () => clearTimeout(timeout);
  }, [mentionQuery]);

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length > MAX_LENGTH) return;
    setContent(val);
    // Detect @mention
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const atIdx  = before.lastIndexOf('@');
    if (atIdx >= 0 && !before.slice(atIdx + 1).includes(' ')) {
      setMentionStart(atIdx);
      setMentionQuery(before.slice(atIdx + 1));
      setMentionIdx(0);
    } else {
      setMentionStart(-1);
      setMentionQuery('');
      setMentionUsers([]);
    }
  };

  const insertMention = (user) => {
    if (mentionStart < 0) return;
    const before = content.slice(0, mentionStart);
    const after  = content.slice(textareaRef.current.selectionStart);
    const mention = `@[${user.name}](${user._id})`;
    setContent(before + mention + ' ' + after);
    setMentionUsers([]);
    setMentionQuery('');
    setMentionStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const insertEmoji = (emoji) => {
    const pos = textareaRef.current?.selectionStart ?? content.length;
    setContent(c => c.slice(0, pos) + emoji + c.slice(pos));
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionUsers.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionUsers[mentionIdx]); }
      if (e.key === 'Escape') { setMentionUsers([]); }
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entityType, entityId, content: content.trim(), parentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      const data = await res.json();
      toast.success('Comment added');
      setContent('');
      onCommentAdded?.(data.comment);
    } catch (err) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = MAX_LENGTH - content.length;

  return (
    <div className="rce-editor">
      {/* Toolbar */}
      <div className="rce-toolbar">
        <button className={`rce-tool-btn ${!preview ? 'active' : ''}`} onClick={() => setPreview(false)}>Write</button>
        <button className={`rce-tool-btn ${preview ? 'active' : ''}`} onClick={() => setPreview(true)} disabled={!content.trim()}>Preview</button>
        <div className="rce-toolbar-sep" />
        <button className="rce-tool-btn" onClick={() => setContent(c => `**${c}**`)} title="Bold">B</button>
        <button className="rce-tool-btn rce-italic" onClick={() => setContent(c => `*${c}*`)} title="Italic">I</button>
        <button className="rce-tool-btn rce-code" onClick={() => setContent(c => `\`${c}\``)} title="Code">&lt;/&gt;</button>
        <button className="rce-tool-btn" onClick={() => setShowEmoji(v => !v)} title="Emoji">😊</button>
        {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div className="rce-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<em class="rce-empty">Nothing to preview</em>' }} />
      ) : (
        <div className="rce-textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="rce-textarea"
            placeholder={placeholder}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={4}
          />
          {mentionUsers.length > 0 && (
            <MentionDropdown users={mentionUsers} activeIdx={mentionIdx} onSelect={insertMention} />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="rce-footer">
        <span className={`rce-char-count ${remaining < 200 ? remaining < 50 ? 'critical' : 'warning' : ''}`}>
          {remaining} chars left
        </span>
        <span className="rce-hint">Ctrl+Enter to submit</span>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!content.trim() || submitting}>
          {submitting ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
    </div>
  );
}
