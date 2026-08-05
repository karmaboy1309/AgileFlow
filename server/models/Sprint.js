'use strict';

const mongoose = require('mongoose');

const SPRINT_STATUSES = ['draft', 'active', 'closed'];

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sprint name is required.'],
      trim: true,
      maxlength: [100, 'Sprint name cannot exceed 100 characters.'],
    },
    goal: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Sprint goal cannot exceed 500 characters.'],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: SPRINT_STATUSES,
        message: `Status must be one of: ${SPRINT_STATUSES.join(', ')}.`,
      },
      default: 'draft',
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

module.exports = mongoose.model('Sprint', sprintSchema);
