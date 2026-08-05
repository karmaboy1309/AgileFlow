'use strict';

/**
 * routes/tasks.js
 *
 * All Task endpoints require a valid JWT (enforced by the `protect` middleware).
 * Tasks are always scoped through their parent Epic to verify ownership.
 *
 * GET    /api/tasks?epicId=:id  — List all tasks for an Epic (sorted by orderIndex)
 * POST   /api/tasks             — Create a new task inside an Epic
 * PUT    /api/tasks/:id         — Update status / orderIndex / any field (DnD + edits)
 * DELETE /api/tasks/:id         — Remove a single task
 */

const express  = require('express');
const mongoose = require('mongoose');
const protect  = require('../middleware/auth');
const Task     = require('../models/Task');
const Epic     = require('../models/Epic');
const Project  = require('../models/Project');

const router = express.Router();

// All routes below this line require authentication
router.use(protect);

// ─── Helper: Validate MongoDB ObjectId ───────────────────────────────────────
const isValidId = (id) => mongoose.isValidObjectId(id);

/**
 * Verify that the calling user owns the Epic referenced by epicId.
 * Returns the Epic document on success, or throws a 404 response.
 */
const assertEpicOwnership = async (epicId, userId, res) => {
  if (!isValidId(epicId)) {
    res.status(400).json({ message: 'Invalid Epic ID format.' });
    return null;
  }
  const epic = await Epic.findOne({ _id: epicId, createdBy: userId });
  if (!epic) {
    res.status(404).json({ message: 'Epic not found or access denied.' });
    return null;
  }
  return epic;
};

// ─── GET /api/tasks?epicId=:id ────────────────────────────────────────────────
/**
 * Returns all tasks for the specified Epic, sorted by orderIndex ascending.
 * This is the primary endpoint called by the frontend KanbanBoard.
 */
router.get('/', async (req, res, next) => {
  try {
    const { epicId, limit: limitStr, skip: skipStr, status } = req.query;

    if (!epicId) {
      return res.status(400).json({ message: 'Query parameter "epicId" is required.' });
    }

    // Ownership check
    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;   // Response already sent inside assertEpicOwnership

    // Pagination — default 50 tasks per page, cap at 200
    const limit = Math.min(parseInt(limitStr, 10) || 50, 200);
    const skip  = parseInt(skipStr, 10)  || 0;

    // Optional status filter for column-level lazy loading
    const filter = { epicId };
    if (status) filter.status = status;

    const [tasks, totalCount] = await Promise.all([
      Task.find(filter).sort({ orderIndex: 1, createdAt: 1 }).skip(skip).limit(limit),
      Task.countDocuments(filter),
    ]);

    const hasMore = skip + tasks.length < totalCount;

    console.log(`📋  [tasks] GET /?epicId=${epicId} — ${tasks.length} of ${totalCount} task(s) (skip=${skip}, limit=${limit})`);
    res.json({ tasks, totalCount, hasMore });
  } catch (error) {
    console.error('❗  [tasks/GET /]', error.message);
    next(error);
  }
});

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
/**
 * Body: { epicId, title, description?, status?, priority?, assignee?, orderIndex? }
 * Returns: { task }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      epicId,
      projectId: reqProjectId,
      issueType   = 'task',
      title,
      description = '',
      status      = 'todo',
      priority    = 'medium',
      assignee    = '',
      orderIndex,
      dueDate,
      subtasks,
      tags,
      attachments,
      estimatedHours = 0,
      loggedHours    = 0,
      storyPoints    = 0,
      sprintId       = null,
    } = req.body;

    if (!epicId || !title) {
      return res.status(400).json({ message: 'epicId and title are required.' });
    }

    // Ownership check
    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;

    // Determine associated Project or default project for key generation
    let targetProject = null;
    if (reqProjectId) {
      targetProject = await Project.findOne({ _id: reqProjectId, createdBy: req.user.id });
    }
    if (!targetProject) {
      // Find default project or create default 'AGILE' project for user
      targetProject = await Project.findOne({ createdBy: req.user.id });
      if (!targetProject) {
        targetProject = await Project.create({
          name: 'AgileFlow Default',
          key: 'AGILE',
          createdBy: req.user.id,
          lead: req.user.id,
        });
      }
    }

    // Atomically increment project sequence counter
    const updatedProject = await Project.findByIdAndUpdate(
      targetProject._id,
      { $inc: { seq: 1 } },
      { new: true }
    );

    const generatedKey = `${updatedProject.key}-${updatedProject.seq}`;

    // Auto-assign orderIndex = current task count if not provided
    let idx = orderIndex;
    if (idx === undefined || idx === null) {
      idx = await Task.countDocuments({ epicId });
    }

    const task = await Task.create({
      title          : title.trim(),
      description    : description.trim(),
      issueType      : issueType || 'task',
      issueKey       : generatedKey,
      projectId      : updatedProject._id,
      sprintId       : sprintId || null,
      status,
      priority,
      assignee       : assignee.trim(),
      epicId,
      orderIndex     : idx,
      dueDate        : dueDate ? new Date(dueDate) : null,
      subtasks       : Array.isArray(subtasks) ? subtasks : [],
      tags           : Array.isArray(tags) ? tags : [],
      attachments    : Array.isArray(attachments) ? attachments : [],
      estimatedHours : Number(estimatedHours) || 0,
      loggedHours    : Number(loggedHours) || 0,
      storyPoints    : Number(storyPoints) || 0,
      activityLog    : [{
        action: 'created',
        actor : req.user.name || req.user.email,
      }],
    });

    console.log(`✅  [tasks] Created: "${task.title}" (${task._id}) in epic ${epicId}`);
    res.status(201).json({ task });
  } catch (error) {
    console.error('❗  [tasks/POST /]', error.message);
    next(error);
  }
});

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
/**
 * Primary use-case: drag-and-drop → sends { status, orderIndex }.
 * Also handles full updates: { title, description, priority, assignee }.
 *
 * Ownership is verified by tracing task → epic → createdBy.
 *
 * Returns: { task }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Task ID format.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Verify ownership via the parent Epic
    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) {
      return res.status(403).json({ message: 'Access denied. You do not own this task.' });
    }

    // ── Build update payload — only touch fields that were sent ──────────────
    const {
      title,
      description,
      issueType,
      status,
      priority,
      assignee,
      orderIndex,
      dueDate,
      subtasks,
      tags,
      attachments,
      isArchived,
      estimatedHours,
      loggedHours,
      storyPoints,
      sprintId,
    } = req.body;

    const updates = {};
    if (title          !== undefined) updates.title          = title.trim();
    if (description    !== undefined) updates.description    = description.trim();
    if (issueType      !== undefined) updates.issueType      = issueType;
    if (status         !== undefined) updates.status         = status;
    if (priority       !== undefined) updates.priority       = priority;
    if (assignee       !== undefined) updates.assignee       = assignee.trim();
    if (orderIndex     !== undefined) updates.orderIndex     = Number(orderIndex);
    if (dueDate        !== undefined) updates.dueDate        = dueDate ? new Date(dueDate) : null;
    if (subtasks       !== undefined) updates.subtasks       = Array.isArray(subtasks) ? subtasks : [];
    if (tags           !== undefined) updates.tags           = Array.isArray(tags) ? tags : [];
    if (attachments    !== undefined) updates.attachments    = Array.isArray(attachments) ? attachments : [];
    if (isArchived     !== undefined) updates.isArchived     = Boolean(isArchived);
    if (estimatedHours !== undefined) updates.estimatedHours = Number(estimatedHours) || 0;
    if (loggedHours    !== undefined) updates.loggedHours    = Number(loggedHours) || 0;
    if (storyPoints    !== undefined) updates.storyPoints    = Number(storyPoints) || 0;
    if (sprintId       !== undefined) updates.sprintId       = sprintId || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }

    // ── Build activity log entries for auditable field changes ────────────────
    const actorName = req.user.name || req.user.email;
    const newLogEntries = [];
    const auditableFields = ['status', 'priority', 'assignee', 'isArchived', 'storyPoints', 'issueType', 'sprintId'];
    for (const field of auditableFields) {
      if (updates[field] !== undefined && String(task[field]) !== String(updates[field])) {
        newLogEntries.push({
          action   : `${field}_change`,
          field,
          from     : String(task[field] ?? ''),
          to       : String(updates[field]),
          actor    : actorName,
          createdAt: new Date(),
        });
      }
    }

    // Use $set for data updates and $push to append log entries atomically
    const mongoUpdate = { $set: updates };
    if (newLogEntries.length > 0) {
      mongoUpdate.$push = { activityLog: { $each: newLogEntries } };
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      mongoUpdate,
      { new: true, runValidators: true }
    );

    console.log(
      `✏️   [tasks] Updated: "${updatedTask.title}" (${id}) → status="${updatedTask.status}", order=${updatedTask.orderIndex}`
    );

    res.json({ task: updatedTask });
  } catch (error) {
    console.error(`❗  [tasks/PUT /:id]`, error.message);
    next(error);
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
/**
 * Removes a single task. Ownership verified via parent Epic.
 * Returns: { message }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Task ID format.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Ownership check
    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) {
      return res.status(403).json({ message: 'Access denied. You do not own this task.' });
    }

    await Task.findByIdAndDelete(id);

    console.log(`🗑️   [tasks] Deleted: "${task.title}" (${id}) from epic ${task.epicId}`);
    res.json({ message: `Task "${task.title}" deleted successfully.` });
  } catch (error) {
    console.error(`❗  [tasks/DELETE /:id]`, error.message);
    next(error);
  }
});

// ─── POST /api/tasks/:id/comments ────────────────────────────────────────────
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) return res.status(403).json({ message: 'Access denied.' });

    const authorName = req.user.name || req.user.email || 'Member';
    task.comments.push({ text: text.trim(), author: authorName, createdAt: new Date() });
    await task.save();

    res.status(201).json({ task });
  } catch (error) {
    console.error('❗  [tasks/POST /:id/comments]', error.message);
    next(error);
  }
});

// ─── DELETE /api/tasks/:id/comments/:commentId ───────────────────────────────
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) return res.status(403).json({ message: 'Access denied.' });

    task.comments = task.comments.filter((c) => c._id.toString() !== commentId);
    await task.save();

    res.json({ task });
  } catch (error) {
    console.error('❗  [tasks/DELETE /:id/comments/:commentId]', error.message);
    next(error);
  }
});

// ─── Helper: Verify bulk task ownership ───────────────────────────────────────
/**
 * Returns the set of task IDs that the current user actually owns.
 * Ownership is traced via task.epicId → epic.createdBy.
 */
const filterOwnedTaskIds = async (taskIds, userId) => {
  const tasks = await Task.find({ _id: { $in: taskIds } }).select('epicId');
  const epicIds = [...new Set(tasks.map((t) => t.epicId.toString()))];
  const ownedEpics = await Epic.find({ _id: { $in: epicIds }, createdBy: userId }).select('_id');
  const ownedEpicSet = new Set(ownedEpics.map((e) => e._id.toString()));
  return tasks
    .filter((t) => ownedEpicSet.has(t.epicId.toString()))
    .map((t) => t._id);
};

// ─── POST /api/tasks/bulk-update ──────────────────────────────────────────────
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { taskIds, updates } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0 || !updates) {
      return res.status(400).json({ message: 'taskIds array and updates object are required.' });
    }

    // Security: only operate on tasks the caller owns
    const ownedIds = await filterOwnedTaskIds(taskIds, req.user.id);
    if (ownedIds.length === 0) {
      return res.status(403).json({ message: 'Access denied. None of the tasks belong to you.' });
    }

    const payload = {};
    if (updates.status    !== undefined) payload.status    = updates.status;
    if (updates.priority  !== undefined) payload.priority  = updates.priority;
    if (updates.isArchived !== undefined) payload.isArchived = Boolean(updates.isArchived);

    await Task.updateMany({ _id: { $in: ownedIds } }, { $set: payload });
    console.log(`✅  [tasks] Bulk update: ${ownedIds.length} task(s) by ${req.user.email}`);
    res.json({ message: `Updated ${ownedIds.length} task(s).` });
  } catch (error) {
    console.error('❗  [tasks/POST /bulk-update]', error.message);
    next(error);
  }
});

// ─── POST /api/tasks/bulk-delete ──────────────────────────────────────────────
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds array is required.' });
    }

    await Task.deleteMany({ _id: { $in: taskIds } });
    res.json({ message: `Deleted ${taskIds.length} task(s).` });
  } catch (error) {
    console.error('❗  [tasks/POST /bulk-delete]', error.message);
    next(error);
  }
});

module.exports = router;
