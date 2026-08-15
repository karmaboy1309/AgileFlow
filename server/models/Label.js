const mongoose = require('mongoose');

// ─── Label Model ──────────────────────────────────────────────────────────────
// Cross-project tagging system. Labels can be applied to tasks for
// advanced filtering, reporting, and grouping across the entire workspace.
const labelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    color: {
      type: String,
      required: true,
      default: '#6366f1',
      match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color'],
    },
    // Optional: scope to a specific project (null = global workspace label)
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Usage count cached for performance
    taskCount: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound unique index: label name is unique per project (or globally) ────
labelSchema.index({ name: 1, project: 1 }, { unique: true, sparse: true });
labelSchema.index({ createdBy: 1 });
labelSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Label', labelSchema);
