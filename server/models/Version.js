'use strict';

const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Version name is required.'],
      trim: true,
      maxlength: [100, 'Version name cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    releaseDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['unreleased', 'released', 'archived'],
      default: 'unreleased',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
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

module.exports = mongoose.model('Version', versionSchema);
