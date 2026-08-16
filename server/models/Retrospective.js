const mongoose = require('mongoose');

// ─── Sprint Retrospective Model ───────────────────────────────────────────────
// Structured retrospective data for completed sprints. Supports the
// classic "What went well / What could improve / Action items" format
// with voting, ownership, and follow-up tracking.
const retrospectiveSchema = new mongoose.Schema(
  {
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      required: true,
      unique: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    status: {
      type: String,
      enum: ['draft', 'in-progress', 'completed'],
      default: 'draft',
    },
    facilitator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // "What went well?"
    wentWell: [{
      text:      { type: String, required: true, maxlength: 500 },
      author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      votes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      createdAt: { type: Date, default: Date.now },
    }],
    // "What could improve?"
    improvements: [{
      text:      { type: String, required: true, maxlength: 500 },
      author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      votes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      createdAt: { type: Date, default: Date.now },
    }],
    // Action items with owners and due dates
    actionItems: [{
      title:   { type: String, required: true, maxlength: 300 },
      owner:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      dueDate: { type: Date },
      isDone:  { type: Boolean, default: false },
      linkedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    }],
    // Anonymous mood check-in (1-5 scale)
    moodScores: [{ type: Number, min: 1, max: 5 }],
    // Meeting notes
    notes: { type: String, maxlength: 5000 },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

retrospectiveSchema.virtual('avgMood').get(function () {
  if (!this.moodScores?.length) return null;
  return parseFloat((this.moodScores.reduce((a, b) => a + b, 0) / this.moodScores.length).toFixed(1));
});

retrospectiveSchema.index({ sprint: 1 }, { unique: true });
retrospectiveSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model('Retrospective', retrospectiveSchema);
