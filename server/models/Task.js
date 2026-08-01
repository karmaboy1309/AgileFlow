'use strict';

/**
 * models/Task.js
 *
 * A Task lives inside an Epic and represents an atomic unit of work.
 * Its `status` field drives which Kanban column it renders in on the frontend.
 * `orderIndex` is used to preserve drag-and-drop ordering within a column.
 */

const mongoose = require('mongoose');

// Status values must match the frontend's COLUMNS[].id definitions in KanbanBoard.jsx
const TASK_STATUSES = ['todo', 'in-progress', 'done'];

// Priority levels surfaced by the CreateTaskModal on the frontend
const TASK_PRIORITIES = ['low', 'medium', 'high'];

// ─── Schema ───────────────────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
  {
    title: {
      type     : String,
      required : [true, 'Task title is required.'],
      trim     : true,
      minlength: [2,   'Title must be at least 2 characters.'],
      maxlength: [200, 'Title cannot exceed 200 characters.'],
    },

    description: {
      type     : String,
      default  : '',
      trim     : true,
      maxlength: [2000, 'Description cannot exceed 2000 characters.'],
    },

    status: {
      type    : String,
      enum    : {
        values : TASK_STATUSES,
        message: `Status must be one of: ${TASK_STATUSES.join(', ')}.`,
      },
      default : 'todo',
    },

    priority: {
      type    : String,
      enum    : {
        values : TASK_PRIORITIES,
        message: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`,
      },
      default : 'medium',
    },

    // Optional free-text assignee name / email (not a User reference for simplicity)
    assignee: {
      type   : String,
      default: '',
      trim   : true,
      maxlength: [100, 'Assignee cannot exceed 100 characters.'],
    },

    // Parent Epic
    epicId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Epic',
      required: [true, 'epicId is required.'],
      index   : true,
    },

    // Used to maintain drag-and-drop order within a column.
    // Client should send the new index on every PUT /api/tasks/:id call.
    orderIndex: {
      type   : Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Primary query pattern: "all tasks for an epic, ordered by position"
taskSchema.index({ epicId: 1, orderIndex: 1 });
// Secondary: filter by status within an epic
taskSchema.index({ epicId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
