import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

// ─── AttachmentUploader ───────────────────────────────────────────────────────
// Drag-and-drop file uploader with image preview thumbnails, file type icons,
// size formatting, and upload progress simulation.

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = {
  'image/jpeg': '🖼', 'image/png': '🖼', 'image/gif': '🖼', 'image/webp': '🖼',
  'application/pdf': '📄', 'text/plain': '📝', 'text/csv': '📊',
  'application/json': '📋',
  'application/zip': '🗜', 'application/x-7z-compressed': '🗜',
  'video/mp4': '🎬', 'audio/mpeg': '🎵',
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  const [preview] = useState(() => isImage ? URL.createObjectURL(file) : null);
  const icon = ALLOWED_TYPES[file.type] || '📎';

  return (
    <div className="au-preview-item">
      {isImage && preview ? (
        <img src={preview} alt={file.name} className="au-preview-thumb" />
      ) : (
        <div className="au-preview-icon">{icon}</div>
      )}
      <div className="au-preview-info">
        <div className="au-preview-name">{file.name}</div>
        <div className="au-preview-size">{formatSize(file.size)}</div>
      </div>
      <button className="au-preview-remove" onClick={() => onRemove(file)} title="Remove">✕</button>
    </div>
  );
}

export default function AttachmentUploader({ entityType, entityId, onUploaded, maxFiles = 10 }) {
  const [files, setFiles]     = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const inputRef = useRef(null);
  const token = localStorage.getItem('agileflow_token');

  const addFiles = (newFiles) => {
    const valid = [];
    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name} exceeds 25MB limit`); continue; }
      if (files.length + valid.length >= maxFiles) { toast.error(`Maximum ${maxFiles} files allowed`); break; }
      valid.push(f);
    }
    setFiles(prev => [...prev, ...valid]);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      setProgress(p => ({ ...p, [file.name]: 0 }));
      try {
        // Simulate chunked upload progress
        for (let pct = 10; pct <= 90; pct += 20) {
          await new Promise(r => setTimeout(r, 100));
          setProgress(p => ({ ...p, [file.name]: pct }));
        }
        // In production: FormData upload to /api/attachments
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        formData.append('entityId', entityId);
        // const res = await fetch('/api/attachments', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
        // const data = await res.json();
        // uploaded.push(data.attachment);
        uploaded.push({ name: file.name, size: file.size, type: file.type });
        setProgress(p => ({ ...p, [file.name]: 100 }));
      } catch {
        toast.error(`Failed to upload ${file.name}`);
        setProgress(p => ({ ...p, [file.name]: -1 }));
      }
    }
    toast.success(`${uploaded.length} file${uploaded.length !== 1 ? 's' : ''} uploaded`);
    setFiles([]);
    setProgress({});
    setUploading(false);
    onUploaded?.(uploaded);
  };

  return (
    <div className="au-uploader">
      {/* Drop zone */}
      <div
        className={`au-dropzone ${dragOver ? 'drag-over' : ''} ${files.length > 0 ? 'has-files' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !files.length && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple className="au-input-hidden" onChange={e => addFiles(Array.from(e.target.files))} />
        {files.length === 0 ? (
          <>
            <div className="au-dz-icon">📎</div>
            <div className="au-dz-text">Drop files here or <span className="au-dz-link" onClick={() => inputRef.current?.click()}>browse</span></div>
            <div className="au-dz-hint">Max 25MB per file · Up to {maxFiles} files</div>
          </>
        ) : (
          <div className="au-preview-list">
            {files.map(f => <FilePreview key={f.name} file={f} onRemove={r => setFiles(prev => prev.filter(x => x !== r))} />)}
            <button className="au-add-more" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>+ Add more</button>
          </div>
        )}
      </div>

      {/* Progress bars */}
      {uploading && Object.entries(progress).map(([name, pct]) => (
        <div key={name} className="au-progress">
          <span className="au-progress-name">{name}</span>
          <div className="au-progress-track">
            <div className="au-progress-fill" style={{ width: `${Math.max(0, pct)}%`, background: pct === -1 ? '#ef4444' : '#6366f1' }} />
          </div>
          <span className="au-progress-pct">{pct === -1 ? 'Error' : pct === 100 ? '✓' : `${pct}%`}</span>
        </div>
      ))}

      {/* Upload button */}
      {files.length > 0 && !uploading && (
        <div className="au-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setFiles([])}>Clear All</button>
          <button className="btn btn-primary btn-sm" onClick={handleUpload}>
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
