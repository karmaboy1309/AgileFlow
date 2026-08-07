'use strict';

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required.'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters.'],
    },
    key: {
      type: String,
      required: [true, 'Project key is required.'],
      uppercase: true,
      trim: true,
      minlength: [2, 'Key must be at least 2 characters.'],
      maxlength: [10, 'Key cannot exceed 10 characters.'],
      match: [/^[A-Z0-9]+$/, 'Project key must contain only uppercase letters and numbers.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    category: {
      type: String,
      default: 'Software',
      enum: ['Software', 'Business', 'Service Desk', 'Marketing'],
    },
    // Configurable Kanban/Scrum Workflow Statuses
    statuses: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          category: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
        },
      ],
      default: [
        { id: 'todo', label: 'To Do', category: 'todo' },
        { id: 'in-progress', label: 'In Progress', category: 'in-progress' },
        { id: 'done', label: 'Done', category: 'done' },
      ],
    },
    // Configurable Custom Fields definitions
    customFields: [
      {
        name: { type: String, required: true, trim: true },
        fieldType: { type: String, enum: ['text', 'number', 'select', 'date'], default: 'text' },
        options: [{ type: String, trim: true }], // For select dropdowns
      },
    ],
    // Auto-increment sequence counter for issue keys (e.g. AGILE-1, AGILE-2)
    seq: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ createdBy: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);
