const mongoose = require('mongoose');

// ─── CustomField Model ────────────────────────────────────────────────────────
// Per-project dynamic field definitions that extend the default Task schema.
// Supports text, number, date, select, multi-select, user, and url types.
const customFieldSchema = new mongoose.Schema(
  {
    // Project this field belongs to
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      match: [/^[a-z][a-z0-9_]*$/, 'Key must be lowercase alphanumeric with underscores'],
    },
    description: { type: String, trim: true, maxlength: 300 },
    fieldType: {
      type: String,
      required: true,
      enum: ['text', 'number', 'date', 'select', 'multi_select', 'user', 'url', 'boolean', 'textarea'],
    },
    // For select / multi_select types
    options: [{ label: String, value: String, color: String }],
    // Display settings
    isRequired: { type: Boolean, default: false },
    isSearchable: { type: Boolean, default: true },
    displayInList: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    // Default value (stored as string, cast at runtime)
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    // Validation rules
    validation: {
      min: Number,
      max: Number,
      minLength: Number,
      maxLength: Number,
      pattern: String,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ── Compound unique index: field key must be unique per project ───────────────
customFieldSchema.index({ project: 1, key: 1 }, { unique: true });
customFieldSchema.index({ project: 1, displayOrder: 1 });

module.exports = mongoose.model('CustomField', customFieldSchema);
