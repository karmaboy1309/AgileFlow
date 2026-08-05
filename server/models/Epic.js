'use strict';

/**
 * models/Epic.js
 *
 * An Epic is a high-level container for a body of work (a feature or milestone).
 * Each Epic is owned by the user who created it.
 */

const mongoose = require('mongoose');

// ─── Schema ───────────────────────────────────────────────────────────────────
const epicSchema = new mongoose.Schema(
  {
    title: {
      type     : String,
      required : [true, 'Epic title is required.'],
      trim     : true,
      minlength: [2,   'Title must be at least 2 characters.'],
      maxlength: [120, 'Title cannot exceed 120 characters.'],
    },

    description: {
      type     : String,
      default  : '',
      trim     : true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },

    // Accent colour chosen by the user in the frontend colour-picker
    color: {
      type   : String,
      default: '#6366f1',
      match  : [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #6366f1).'],
    },

    startDate: {
      type   : Date,
      default: null,
    },

    targetDate: {
      type   : Date,
      default: null,
    },

    // Reference to the User who owns this Epic
    createdBy: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: [true, 'createdBy (owner) is required.'],
      index   : true,   // Fast lookup of all Epics for a given user
    },

    // Lifecycle status of the epic
    status: {
      type   : String,
      enum   : {
        values : ['active', 'on-hold', 'completed', 'archived'],
        message: 'Status must be one of: active, on-hold, completed, archived.',
      },
      default: 'active',
      index  : true,
    },
  },
  {
    timestamps: true,
    toJSON    : { virtuals: true },
    toObject  : { virtuals: true },
  }
);

// ─── Virtual: taskCount & doneCount ──────────────────────────────────────────
// Populated on-demand via Model.populate() when needed by aggregate queries.
// Routes that require counts run a lightweight aggregation instead of virtuals
// to keep this model simple.

// ─── Index ────────────────────────────────────────────────────────────────────
// Compound index so "my epics, newest first" queries are O(log n)
epicSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Epic', epicSchema);
