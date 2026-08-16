const mongoose = require('mongoose');

// ─── Attachment Model ─────────────────────────────────────────────────────────
// Stores file attachment metadata for tasks, comments, and epics.
// Actual files are stored on S3/CloudStorage; this model tracks metadata.
const attachmentSchema = new mongoose.Schema(
  {
    // Parent entity
    entityType: {
      type: String,
      required: true,
      enum: ['task', 'epic', 'comment', 'sprint', 'project'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // File details
    filename: { type: String, required: true, maxlength: 255 },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    // Storage location
    storageKey: { type: String, required: true }, // S3 key or local path
    url: { type: String }, // public URL (pre-signed or CDN)
    thumbnailUrl: { type: String }, // for images/videos
    // Upload metadata
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // File category for filtering
    category: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', 'archive', 'code', 'other'],
      default: 'other',
    },
    // Virus scan status
    scanStatus: {
      type: String,
      enum: ['pending', 'clean', 'infected', 'skipped'],
      default: 'pending',
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ── Derive category from mimeType before save ─────────────────────────────────
attachmentSchema.pre('save', function (next) {
  if (this.mimeType) {
    if (this.mimeType.startsWith('image/')) this.category = 'image';
    else if (this.mimeType.startsWith('video/')) this.category = 'video';
    else if (this.mimeType.startsWith('audio/')) this.category = 'audio';
    else if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(this.mimeType)) this.category = 'document';
    else if (['application/zip', 'application/x-tar', 'application/x-7z-compressed'].includes(this.mimeType)) this.category = 'archive';
    else if (this.mimeType.startsWith('text/') || this.mimeType === 'application/json') this.category = 'code';
  }
  next();
});

// ── Virtual: human-readable size ──────────────────────────────────────────────
attachmentSchema.virtual('sizeFormatted').get(function () {
  const bytes = this.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

attachmentSchema.index({ entityType: 1, entityId: 1, isDeleted: 1 });
attachmentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
