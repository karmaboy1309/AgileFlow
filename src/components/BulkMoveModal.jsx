import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { tasksAPI, epicsAPI } from '../api';

// ─── BulkMoveModal ────────────────────────────────────────────────────────────
// Moves multiple selected tasks from their current epic to a target epic.
// Shows a confirmation with task count and destination.

export default function BulkMoveModal({ isOpen, onClose, selectedTaskIds = [], currentEpicId, onMoved }) {
  const [epics, setEpics]         = useState([]);
  const [targetEpic, setTargetEpic] = useState('');
  const [loading, setLoading]     = useState(false);
  const [moving, setMoving]       = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    epicsAPI.getAll().then(res => {
      setEpics((res.data?.epics || res.data || []).filter(e => e._id !== currentEpicId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOpen, currentEpicId]);

  if (!isOpen) return null;

  const handleMove = async () => {
    if (!targetEpic || selectedTaskIds.length === 0) return;
    setMoving(true);
    try {
      await tasksAPI.bulkUpdate(selectedTaskIds, { epicId: targetEpic });
      const target = epics.find(e => e._id === targetEpic);
      toast.success(`Moved ${selectedTaskIds.length} tasks to "${target?.title || 'Epic'}"`);
      onMoved?.(targetEpic);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move tasks');
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bmm-modal">
        <div className="bmm-header">
          <h2 className="bmm-title">Move Tasks to Epic</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="bmm-summary">
          <div className="bmm-count-badge">{selectedTaskIds.length}</div>
          <span className="bmm-summary-text">
            task{selectedTaskIds.length !== 1 ? 's' : ''} selected for moving
          </span>
        </div>

        <div className="bmm-body">
          <label className="bmm-label">Destination Epic</label>
          {loading ? (
            <div className="bmm-loading">Loading epics…</div>
          ) : (
            <select className="bmm-select" value={targetEpic} onChange={e => setTargetEpic(e.target.value)}>
              <option value="">Select destination epic…</option>
              {epics.map(ep => (
                <option key={ep._id} value={ep._id}>
                  {ep.title} {ep.status ? `(${ep.status})` : ''}
                </option>
              ))}
            </select>
          )}

          {targetEpic && (
            <div className="bmm-confirm-message">
              <span className="bmm-warn-icon">⚠</span>
              Moving tasks will remove them from the current epic's board. This action can be undone by moving them back.
            </div>
          )}
        </div>

        <div className="bmm-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleMove}
            disabled={!targetEpic || moving || loading}
          >
            {moving ? 'Moving…' : `Move ${selectedTaskIds.length} Tasks`}
          </button>
        </div>
      </div>
    </div>
  );
}
