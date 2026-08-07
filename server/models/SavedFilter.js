'use strict';

const mongoose = require('mongoose');

const savedFilterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Filter name is required.'],
      trim: true,
      maxlength: [100, 'Filter name cannot exceed 100 characters.'],
    },
    jql: {
      type: String,
      required: [true, 'JQL string is required.'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model('SavedFilter', savedFilterSchema);
