'use strict';

/**
 * models/SavedFilter.js
 *
 * Schema for User-defined Saved Filters and JQL Query Presets.
 */

const mongoose = require('mongoose');

const savedFilterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Filter name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [60, 'Name cannot exceed 60 characters.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters.'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filterState: {
      type: Object,
      required: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SavedFilter', savedFilterSchema);
