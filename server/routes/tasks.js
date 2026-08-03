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
    const { epicId } = req.query;

    if (!epicId) {
      return res.status(400).json({ message: 'Query parameter "epicId" is required.' });
    }

    // Ownership check
    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;   // Response already sent inside assertEpicOwnership

    const tasks = await Task.find({ epicId }).sort({ orderIndex: 1, createdAt: 1 });

    console.log(`📋  [tasks] GET /?epicId=${epicId} — ${tasks.length} task(s)`);
    res.json({ tasks });
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
    } = req.body;

    if (!epicId || !title) {
      return res.status(400).json({ message: 'epicId and title are required.' });
    }

    // Ownership check
    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;

    // Auto-assign orderIndex = current task count if not provided
    let idx = orderIndex;
    if (idx === undefined || idx === null) {
      idx = await Task.countDocuments({ epicId });
    }

    const task = await Task.create({
      title          : title.trim(),
      description    : description.trim(),
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
    } = req.body;

    const updates = {};
    if (title          !== undefined) updates.title          = title.trim();
    if (description    !== undefined) updates.description    = description.trim();
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updates,
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

// ─── POST /api/tasks/bulk-update ──────────────────────────────────────────────
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { taskIds, updates } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0 || !updates) {
      return res.status(400).json({ message: 'taskIds array and updates object are required.' });
    }

    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.isArchived !== undefined) payload.isArchived = Boolean(updates.isArchived);

    await Task.updateMany({ _id: { $in: taskIds } }, { $set: payload });
    res.json({ message: `Updated ${taskIds.length} task(s).` });
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
