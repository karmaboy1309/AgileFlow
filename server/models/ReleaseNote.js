const mongoose = require('mongoose');

// ─── Release Notes Model ──────────────────────────────────────────────────────
// Structured release notes linked to a version. Supports categories,
// external contributors, breaking change flags, and migration guides.
const releaseNoteSchema = new mongoose.Schema(
  {
    version: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Version',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    // Semantic version string (duplicated from Version for denormalization)
    versionName: { type: String, required: true, trim: true },
    // Overall summary / announcement
    summary: { type: String, trim: true, maxlength: 2000 },
    // Change entries grouped by category
    entries: [{
      category: {
        type: String,
        enum: ['feature', 'improvement', 'bug_fix', 'breaking', 'security', 'deprecation', 'performance', 'internal'],
        default: 'feature',
      },
      title:       { type: String, required: true, maxlength: 300 },
      description: { type: String, maxlength: 1000 },
      linkedTask:  { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      linkedEpic:  { type: mongoose.Schema.Types.ObjectId, ref: 'Epic' },
      isBreaking:  { type: Boolean, default: false },
      // GitHub/GitLab PR or issue link
      externalLink: { type: String, maxlength: 500 },
      contributors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
    // Migration guide for breaking changes
    migrationGuide: { type: String, maxlength: 5000 },
    // Publication settings
    status: {
      type: String,
      enum: ['draft', 'preview', 'published'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Public URL slug (for external publishing)
    slug: { type: String, trim: true },
    // Changelog markdown export
    markdownCache: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

releaseNoteSchema.virtual('breakingCount').get(function () {
  return this.entries?.filter(e => e.isBreaking).length || 0;
});

releaseNoteSchema.virtual('entriesByCategory').get(function () {
  return this.entries?.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {}) || {};
});

releaseNoteSchema.index({ project: 1, status: 1 });
releaseNoteSchema.index({ version: 1 }, { unique: true });
releaseNoteSchema.index({ slug: 1 });

module.exports = mongoose.model('ReleaseNote', releaseNoteSchema);
