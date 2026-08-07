'use strict';

const mongoose = require('mongoose');

const gadgetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Gadget title is required.'],
      trim: true,
    },
    gadgetType: {
      type: String,
      enum: ['assigned_issues', 'project_summary', 'velocity_chart', 'custom_jql'],
      default: 'assigned_issues',
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    orderIndex: {
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

module.exports = mongoose.model('Gadget', gadgetSchema);
