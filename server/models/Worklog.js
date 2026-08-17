'use strict';

const mongoose = require('mongoose');

const worklogSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    timeSpentHours: {
      type: Number,
      required: [true, 'Time spent in hours is required.'],
      min: [0.1, 'Time spent must be at least 0.1 hours.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    isBillable: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      enum: ['development', 'design', 'testing', 'documentation', 'meetings', 'deployment', 'research', 'other'],
      default: 'development',
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

module.exports = mongoose.model('Worklog', worklogSchema);
