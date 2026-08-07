'use strict';

const mongoose = require('mongoose');

const LINK_TYPES = ['blocks', 'is_blocked_by', 'relates_to', 'duplicates'];

const issueLinkSchema = new mongoose.Schema(
  {
    sourceTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    targetTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    relationship: {
      type: String,
      enum: LINK_TYPES,
      default: 'relates_to',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

issueLinkSchema.index({ sourceTaskId: 1, targetTaskId: 1 }, { unique: true });

module.exports = mongoose.model('IssueLink', issueLinkSchema);
