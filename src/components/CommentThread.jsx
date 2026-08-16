import { useState, useEffect, useCallback } from 'react';
import RichCommentEditor from './RichCommentEditor';
import toast from 'react-hot-toast';

// ─── CommentThread ─────────────────────────────────────────────────────────────
// Full threaded comment list with reactions, reply threading, edit history,
// pin support, and soft-delete display.

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const QUICK_REACTIONS = ['👍', '❤️', '🚀', '😂', '😮'];

function renderContent(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="ct-inline-code">$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, '<span class="ct-mention-tag">@$1</span>');
}

function CommentItem({ comment, entityType, entityId, onRefresh, depth = 0 }) {
  const [showReplies, setShowReplies]   = useState(false);
  const [replying, setReplying]         = useState(false);
  const [replies, setReplies]           = useState([]);
  const [loadingReplies, setLoading]    = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [reactions, setReactions]       = useState(comment.reactions || []);
  const token = localStorage.getItem('agileflow_token');
  const currentUserId = (() => {
    try { return JSON.parse(atob(token.split('.')[1]))?.id; } catch { return null; }
  })();

  const loadReplies = useCallback(async () => {
    if (loadingReplies) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${entityType}/${entityId}?parentId=${comment._id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReplies(data.comments || []);
    } catch {}
    finally { setLoading(false); }
  }, [comment._id, entityType, entityId]);

  const handleReact = async (emoji) => {
    try {
      const res = await fetch(`/api/comments/${comment._id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      setReactions(data.reactions || []);
    } catch { toast.error('Failed to react'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    try {
      await fetch(`/api/comments/${comment._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      onRefresh?.();
    } catch { toast.error('Failed to delete'); }
  };

  const isDeleted  = comment.isDeleted;
  const isAuthor   = comment.author?._id === currentUserId || comment.author === currentUserId;
  const isPinned   = comment.isPinned;
  const hasEdits   = comment.editHistory?.length > 0;

  return (
    <div className={`ct-comment ${depth > 0 ? 'ct-reply' : ''} ${isPinned ? 'ct-pinned' : ''} ${isDeleted ? 'ct-deleted' : ''}`}>
      {isPinned && <div className="ct-pin-label">📌 Pinned</div>}

      <div className="ct-comment-header">
        <div className="ct-avatar" style={{ background: comment.author?.avatarColor || '#6366f1' }}>
          {comment.author?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="ct-meta">
          <span className="ct-author">{comment.author?.name || 'Unknown'}</span>
          <span className="ct-time">{timeAgo(comment.createdAt)}</span>
          {hasEdits && <span className="ct-edited-label" onClick={() => setShowHistory(v => !v)}>(edited ▾)</span>}
        </div>
        {!isDeleted && isAuthor && (
          <button className="ct-delete-btn" onClick={handleDelete} title="Delete comment">🗑</button>
        )}
      </div>

      <div className="ct-body" dangerouslySetInnerHTML={{ __html: renderContent(comment.content) }} />

      {showHistory && hasEdits && (
        <div className="ct-history">
          <div className="ct-history-label">Edit History</div>
          {comment.editHistory.map((h, i) => (
            <div key={i} className="ct-history-item">
              <span className="ct-history-time">{new Date(h.editedAt).toLocaleString()}</span>
              <div className="ct-history-content">{h.content}</div>
            </div>
          ))}
        </div>
      )}

      {!isDeleted && (
        <div className="ct-actions">
          {/* Quick reactions */}
          <div className="ct-reactions-row">
            {QUICK_REACTIONS.map(emoji => {
              const r = reactions.find(r => r.emoji === emoji);
              return (
                <button key={emoji} className={`ct-reaction-btn ${r?.count > 0 ? 'has-count' : ''}`} onClick={() => handleReact(emoji)}>
                  {emoji} {r?.count > 0 && <span className="ct-reaction-count">{r.count}</span>}
                </button>
              );
            })}
            {reactions.filter(r => !QUICK_REACTIONS.includes(r.emoji)).map(r => (
              <button key={r.emoji} className="ct-reaction-btn has-count" onClick={() => handleReact(r.emoji)}>
                {r.emoji} <span className="ct-reaction-count">{r.count}</span>
              </button>
            ))}
          </div>
          {depth < 3 && (
            <button className="ct-reply-btn" onClick={() => setReplying(v => !v)}>
              ↩ Reply
            </button>
          )}
          {comment.replyCount > 0 && (
            <button className="ct-show-replies" onClick={() => { setShowReplies(v => !v); if (!showReplies) loadReplies(); }}>
              {showReplies ? 'Hide' : `Show ${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>
      )}

      {replying && (
        <div className="ct-reply-editor">
          <RichCommentEditor
            entityType={entityType} entityId={entityId} parentId={comment._id}
            placeholder={`Reply to ${comment.author?.name}…`}
            onCommentAdded={() => { setReplying(false); setShowReplies(true); loadReplies(); }}
          />
        </div>
      )}

      {showReplies && (
        <div className="ct-replies">
          {loadingReplies && <div className="ct-loading">Loading replies…</div>}
          {replies.map(r => <CommentItem key={r._id} comment={r} entityType={entityType} entityId={entityId} onRefresh={loadReplies} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({ entityType, entityId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const token = localStorage.getItem('agileflow_token');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${entityType}/${entityId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setComments(data.comments || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="ct-thread">
      <div className="ct-thread-header">
        <h3 className="ct-thread-title">Comments {total > 0 && <span className="ct-count-badge">{total}</span>}</h3>
      </div>

      <RichCommentEditor entityType={entityType} entityId={entityId} onCommentAdded={() => load()} />

      <div className="ct-list">
        {loading && <div className="ct-loading">Loading comments…</div>}
        {!loading && comments.length === 0 && <div className="ct-empty">No comments yet. Be the first!</div>}
        {comments.map(c => <CommentItem key={c._id} comment={c} entityType={entityType} entityId={entityId} onRefresh={load} />)}
      </div>
    </div>
  );
}
