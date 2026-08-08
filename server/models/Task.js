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

// Jira Issue Types
const ISSUE_TYPES = ['story', 'bug', 'task', 'epic', 'subtask'];

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

    issueType: {
      type    : String,
      enum    : {
        values : ISSUE_TYPES,
        message: `issueType must be one of: ${ISSUE_TYPES.join(', ')}.`,
      },
      default : 'task',
    },

    issueKey: {
      type: String,
      trim: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },

    fixVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Version',
      index: true,
    },

    componentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Component',
      index: true,
    }],

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

    // Optional deadline for the task
    dueDate: {
      type   : Date,
      default: null,
    },

    // Subtasks / Checklist items
    subtasks: [
      {
        title: { type: String, required: true, trim: true },
        completed: { type: Boolean, default: false },
      },
    ],

    // Issue Dependencies & Linking
    issueLinks: [
      {
        relationship: {
          type: String,
          enum: ['blocks', 'is_blocked_by', 'relates_to', 'duplicates'],
          required: true,
        },
        targetTaskId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Task',
          required: true,
        },
      },
    ],

    // Fix Version / Release reference
    fixVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Release',
      default: null,
    },

    // Component References
    componentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component',
      },
    ],

    // Custom Category Labels / Tags
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Task Comments & Discussion Stream
    comments: [
      {
        text: { type: String, required: true, trim: true },
        author: { type: String, default: 'Workspace Member', trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Task External Link Attachments / Resources
    attachments: [
      {
        title: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
      },
    ],

    // Archiving status
    isArchived: {
      type   : Boolean,
      default: false,
    },

    // Starred / Bookmarked
    isStarred: {
      type   : Boolean,
      default: false,
    },

    // Issue Watchers
    watchers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // Custom fields value store
    customFieldsData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Story Points estimation (Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21)
    storyPoints: {
      type   : Number,
      default: 0,
      min    : 0,
    },

    // Time tracking & Work Logs (hours)
    originalEstimateHours: {
      type   : Number,
      default: 0,
      min    : 0,
    },
    estimatedHours: {
      type   : Number,
      default: 0,
      min    : 0,
    },
    remainingEstimateHours: {
      type   : Number,
      default: 0,
      min    : 0,
    },
    loggedHours: {
      type   : Number,
      default: 0,
      min    : 0,
    },
    workLogs: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: { type: String, default: 'Workspace Member' },
        timeSpentHours: { type: Number, required: true, min: 0.1 },
        dateLogged: { type: Date, default: Date.now },
        comment: { type: String, default: '', trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Used to maintain drag-and-drop order within a column.
    // Client should send the new index on every PUT /api/tasks/:id call.
    orderIndex: {
      type   : Number,
      default: 0,
    },

    // Activity / Audit Log — immutable history of changes to this task
    activityLog: [
      {
        action   : { type: String, required: true },          // e.g. 'status_change', 'created', 'priority_change'
        field    : { type: String, default: null },           // e.g. 'status'
        from     : { type: String, default: null },           // previous value
        to       : { type: String, default: null },           // new value
        actor    : { type: String, default: 'Workspace Member' }, // display name or email
        createdAt: { type: Date,   default: Date.now },
      },
    ],
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
// Tertiary: sort by creation date to surface most recent activity
taskSchema.index({ epicId: 1, createdAt: -1 });

// ── Compound Indexes for Performance Tuning ─────────────────────────────
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ sprintId: 1, status: 1 });
taskSchema.index({ epicId: 1, status: 1 });
taskSchema.index({ issueKey: 1 });

module.exports = mongoose.model('Task', taskSchema);
