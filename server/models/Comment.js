const mongoose = require('mongoose');

// ─── Comment Model ────────────────────────────────────────────────────────────
// Rich threaded comments with @mention parsing, markdown support,
// emoji reactions, and edit history for full collaboration transparency.
const reactionSchema = new mongoose.Schema({
  emoji:  { type: String, required: true },
  users:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  count:  { type: Number, default: 0 },
}, { _id: false });

const editHistorySchema = new mongoose.Schema({
  content:   { type: String, required: true },
  editedAt:  { type: Date, default: Date.now },
  editedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const commentSchema = new mongoose.Schema(
  {
    // Which entity this comment belongs to
    entityType: {
      type: String,
      required: true,
      enum: ['task', 'epic', 'sprint', 'release'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Comment content (supports markdown)
    content: {
      type: String,
      required: true,
      maxlength: 10000,
      trim: true,
    },
    // Raw content preserving @mentions for resolution
    rawContent: { type: String, maxlength: 10000 },
    // Author
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // @mentioned users (parsed from content)
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Emoji reactions: { '👍': [userId1, userId2], '❤️': [...] }
    reactions: [reactionSchema],
    // Thread parent (null = top-level, non-null = reply)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    // Edit history for transparency
    editHistory: [editHistorySchema],
    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    // Pinned to top
    isPinned: { type: Boolean, default: false },
    // Attachments (file references)
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Virtual: reply count ──────────────────────────────────────────────────────
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true,
});

// ── Indexes ───────────────────────────────────────────────────────────────────
commentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ mentions: 1 });
commentSchema.index({ isPinned: -1, createdAt: -1 });

// ── Static: parse @mentions from content ─────────────────────────────────────
commentSchema.statics.parseMentions = function (content) {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const userIds = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    if (match[2]) userIds.push(match[2]);
  }
  return userIds;
};

module.exports = mongoose.model('Comment', commentSchema);
