const mongoose = require('mongoose');

// ─── Integration Model ────────────────────────────────────────────────────────
// Stores webhook and OAuth integration configurations for external services
// (Slack, GitHub, Jira, PagerDuty, etc.) with per-event subscriptions.
const integrationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: ['webhook', 'slack', 'github', 'gitlab', 'jira', 'pagerduty', 'custom'],
    },
    // Webhook target URL
    url: { type: String, trim: true },
    // HTTP method for webhook
    method: { type: String, enum: ['POST', 'PUT', 'PATCH'], default: 'POST' },
    // Shared secret for signature verification (HMAC-SHA256)
    secret: { type: String },
    // Custom headers to send with webhook
    headers: { type: Map, of: String },
    // Which events trigger this integration
    events: [{
      type: String,
      enum: [
        'task.created', 'task.updated', 'task.deleted', 'task.status_changed',
        'task.assigned', 'sprint.started', 'sprint.completed',
        'epic.created', 'epic.completed', 'comment.added', 'worklog.added',
        'release.published', 'project.updated',
      ],
    }],
    // OAuth credentials (encrypted in production)
    oauthToken:        { type: String },
    oauthRefreshToken: { type: String },
    oauthExpiresAt:    { type: Date },
    // Last delivery status
    lastDelivery: {
      timestamp:   Date,
      statusCode:  Number,
      success:     Boolean,
      responseMs:  Number,
      error:       String,
    },
    // Stats
    deliveryCount:  { type: Number, default: 0 },
    failureCount:   { type: Number, default: 0 },
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

integrationSchema.index({ project: 1, isActive: 1 });
integrationSchema.index({ type: 1 });

module.exports = mongoose.model('Integration', integrationSchema);
