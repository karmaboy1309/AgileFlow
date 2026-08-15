const mongoose = require('mongoose');

// ─── ActivityLog Model ───────────────────────────────────────────────────────
// Rich, per-entity event stream for auditing, activity feeds, and
// collaboration awareness. Captures structured change diffs.
const activityLogSchema = new mongoose.Schema(
  {
    // Which entity this log belongs to
    entityType: {
      type: String,
      required: true,
      enum: ['task', 'epic', 'sprint', 'project', 'release', 'comment', 'user'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType',
    },
    // The action that occurred
    action: {
      type: String,
      required: true,
      enum: [
        // Task actions
        'created', 'updated', 'deleted', 'status_changed', 'assigned',
        'unassigned', 'priority_changed', 'moved', 'archived', 'restored',
        'duplicated', 'linked', 'unlinked',
        // Comment actions
        'comment_added', 'comment_edited', 'comment_deleted', 'reaction_added',
        // Work actions
        'worklog_added', 'worklog_deleted', 'estimate_changed',
        // Sprint actions
        'sprint_started', 'sprint_completed', 'sprint_task_added', 'sprint_task_removed',
        // Field changes
        'field_changed', 'tag_added', 'tag_removed', 'label_added', 'label_removed',
        // Attachment
        'attachment_added', 'attachment_removed',
      ],
    },
    // Who performed the action
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: which project context
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    // Structured diff for field changes
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],
    // Human-readable summary
    summary: { type: String, maxlength: 500 },
    // Optional metadata (e.g., from sprint, to sprint)
    meta: { type: mongoose.Schema.Types.Mixed },
    // Visibility: all = everyone, mentioned = only mentioned users
    visibility: {
      type: String,
      enum: ['all', 'project', 'mentioned'],
      default: 'project',
    },
    // TTL for auto-cleanup: null = keep forever
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// ── Indexes for efficient querying ───────────────────────────────────────────
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ── Static: Get recent activity for an entity ────────────────────────────────
activityLogSchema.statics.getForEntity = function (entityType, entityId, limit = 50) {
  return this.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'name email avatarColor')
    .lean();
};

// ── Static: Get project activity feed ────────────────────────────────────────
activityLogSchema.statics.getProjectFeed = function (projectId, limit = 100) {
  return this.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'name email avatarColor')
    .lean();
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
