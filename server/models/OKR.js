const mongoose = require('mongoose');

// ─── OKR (Objectives and Key Results) Model ───────────────────────────────────
// Tracks company/team level OKRs and links them to epics/tasks.
// Supports quarterly planning, progress auto-calculation, and alignment hierarchy.
const okrSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    // OKR hierarchy
    parentOkr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OKR',
      default: null,
    },
    type: {
      type: String,
      enum: ['company', 'team', 'individual'],
      default: 'team',
    },
    // Objective
    objective: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    // Time period
    quarter: { type: String, match: /^Q[1-4]-\d{4}$/ }, // e.g. "Q3-2025"
    startDate: { type: Date },
    endDate:   { type: Date },
    // Key results
    keyResults: [{
      title:          { type: String, required: true, maxlength: 300 },
      description:    { type: String, maxlength: 500 },
      metricType:     { type: String, enum: ['number', 'percent', 'boolean', 'milestone'], default: 'number' },
      startValue:     { type: Number, default: 0 },
      targetValue:    { type: Number, required: true },
      currentValue:   { type: Number, default: 0 },
      unit:           { type: String, maxlength: 30 }, // e.g. "users", "%", "$"
      confidence:     { type: Number, min: 0, max: 10, default: 5 }, // 0-10 confidence score
      linkedEpics:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Epic' }],
      owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      lastUpdated:    { type: Date },
      updateHistory:  [{ value: Number, note: String, updatedAt: { type: Date, default: Date.now } }],
    }],
    owner:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'on-track', 'at-risk', 'behind', 'completed'], default: 'draft' },
    isPublic: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Virtual: overall progress (avg of key results) ────────────────────────────
okrSchema.virtual('progress').get(function () {
  if (!this.keyResults?.length) return 0;
  const sum = this.keyResults.reduce((total, kr) => {
    const pct = kr.targetValue > 0 ? Math.min(100, (kr.currentValue / kr.targetValue) * 100) : 0;
    return total + pct;
  }, 0);
  return parseFloat((sum / this.keyResults.length).toFixed(1));
});

okrSchema.index({ project: 1, quarter: 1 });
okrSchema.index({ parentOkr: 1 });
okrSchema.index({ 'keyResults.owner': 1 });

module.exports = mongoose.model('OKR', okrSchema);
