const mongoose = require('mongoose');

// ─── Team Model ──────────────────────────────────────────────────────────────
// Represents a cross-project team with capacity planning, member roles,
// and sprint load tracking for enterprise agile workflows.
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Team lead / manager
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: {
          type: String,
          enum: ['developer', 'designer', 'qa', 'devops', 'product', 'scrum_master'],
          default: 'developer',
        },
        // Weekly capacity in hours
        capacityHours: { type: Number, default: 40, min: 0, max: 168 },
        // Availability percentage (0–100)
        availability: { type: Number, default: 100, min: 0, max: 100 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    // Projects this team is associated with
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    // Active sprint the team is currently working on
    activeSprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
    // Team-level velocity: average story points per sprint
    averageVelocity: { type: Number, default: 0 },
    // Colors/avatar for display
    color: { type: String, default: '#6366f1' },
    avatarUrl: { type: String },
    // Soft-delete
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: total capacity for the team in current sprint ──────────────────
teamSchema.virtual('totalCapacityHours').get(function () {
  return this.members.reduce((sum, m) => {
    return sum + Math.round((m.capacityHours * m.availability) / 100);
  }, 0);
});

// ── Virtual: member count ────────────────────────────────────────────────────
teamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// ── Index ────────────────────────────────────────────────────────────────────
teamSchema.index({ name: 'text', description: 'text' });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ projects: 1 });

module.exports = mongoose.model('Team', teamSchema);
