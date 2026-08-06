'use strict';

/**
 * models/Release.js
 *
 * Mongoose schema for Fix Versions / Releases in AgileFlow.
 * Tracks software release milestones for a project.
 */

const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Release name is required.'],
      trim: true,
      maxlength: [100, 'Release name cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'projectId is required.'],
      index: true,
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
      enum: ['Unreleased', 'Released', 'Archived'],
      default: 'Unreleased',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Release', releaseSchema);
