'use strict';

/**
 * models/Component.js
 *
 * Project Component schema representing sub-systems or modules (e.g., Frontend, API, Database, UI/UX).
 */

const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Component name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [50, 'Name cannot exceed 50 characters.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [250, 'Description cannot exceed 250 characters.'],
    },
    lead: {
      type: String,
      default: '',
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

componentSchema.index({ projectId: 1, name: 1 });

module.exports = mongoose.model('Component', componentSchema);
