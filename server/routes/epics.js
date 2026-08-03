'use strict';

/**
 * routes/epics.js
 *
 * All Epic endpoints require a valid JWT (enforced by the `protect` middleware).
 * Users can only read/mutate their own Epics.
 *
 * GET    /api/epics          — List all Epics belonging to the current user
 * POST   /api/epics          — Create a new Epic
 * GET    /api/epics/:id      — Get a single Epic (with task counts)
 * PUT    /api/epics/:id      — Update an Epic's title / description / color
 * DELETE /api/epics/:id      — Delete an Epic and all its Tasks (cascade)
 *
 * Legacy alias (also supported):
 * GET    /api/epics/:id/tasks — Fetch tasks for an Epic (sorted by orderIndex)
 */

const express = require('express');
const mongoose = require('mongoose');
const protect  = require('../middleware/auth');
const Epic     = require('../models/Epic');
const Task     = require('../models/Task');

const router = express.Router();

// All routes below this line require authentication
router.use(protect);

// ─── Helper: Validate MongoDB ObjectId ───────────────────────────────────────
const isValidId = (id) => mongoose.isValidObjectId(id);

// ─── GET /api/epics ───────────────────────────────────────────────────────────
/**
 * Returns all Epics owned by the logged-in user, newest first.
 * Includes lightweight task / done-task counts via aggregation.
 */
router.get('/', async (req, res, next) => {
  try {
    // Aggregation pipeline: join tasks collection to get counts per epic
    const epics = await Epic.aggregate([
      { $match: { createdBy: new mongoose.Types.ObjectId(req.user.id) } },
      { $sort : { createdAt: -1 } },
      {
        $lookup: {
          from         : 'tasks',
          localField   : '_id',
          foreignField : 'epicId',
          as           : 'tasks',
        },
      },
      {
        $addFields: {
          taskCount: { $size: '$tasks' },
          doneCount: {
            $size: {
              $filter: {
                input: '$tasks',
                as   : 't',
                cond : { $eq: ['$$t.status', 'done'] },
              },
            },
          },
        },
      },
      // Remove the full tasks array from the output — just keep the counts
      { $project: { tasks: 0 } },
    ]);

    console.log(`📋  [epics] GET / — returning ${epics.length} epics for ${req.user.email}`);
    res.json(epics);
  } catch (error) {
    console.error('❗  [epics/GET /]', error.message);
    next(error);
  }
});

// ─── GET /api/epics/analytics ────────────────────────────────────────────────
/**
 * Workspace Analytics Endpoint
 * Computes high-level project velocity, completion percentage, priority breakdown,
 * and overdue task count across all user epics.
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const userEpics = await Epic.find({ createdBy: userId }).select('_id');
    const epicIds = userEpics.map((e) => e._id);

    const totalEpics = userEpics.length;
    const allTasks = await Task.find({ epicId: { $in: epicIds } });

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'done').length;
    const inProgressTasks = allTasks.filter((t) => t.status === 'in-progress').length;
    const todoTasks = allTasks.filter((t) => t.status === 'todo').length;
    const highPriorityTasks = allTasks.filter((t) => t.priority === 'high').length;

    const now = new Date();
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    ).length;

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      analytics: {
        totalEpics,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        highPriorityTasks,
        overdueTasks,
        overallProgress,
      },
    });
  } catch (error) {
    console.error('❗  [epics/GET /analytics]', error.message);
    next(error);
  }
});

// ─── GET /api/epics/export ───────────────────────────────────────────────────
/**
 * Backup Export Endpoint
 * Exports all user epics and associated tasks as a structured JSON object.
 */
router.get('/export', async (req, res, next) => {
  try {
    const epics = await Epic.find({ createdBy: req.user.id });
    const epicDataList = [];

    for (const epic of epics) {
      const tasks = await Task.find({ epicId: epic._id });
      epicDataList.push({
        title: epic.title,
        description: epic.description,
        color: epic.color,
        createdAt: epic.createdAt,
        tasks: tasks.map((t) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee,
          dueDate: t.dueDate,
          subtasks: t.subtasks,
          tags: t.tags,
          orderIndex: t.orderIndex,
        })),
      });
    }

    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: req.user.email,
      epics: epicDataList,
    });
  } catch (error) {
    console.error('❗  [epics/GET /export]', error.message);
    next(error);
  }
});

// ─── POST /api/epics/import ──────────────────────────────────────────────────
/**
 * Backup Restore / Import Endpoint
 * Accepts exported JSON payload and recreates epics and tasks for the current user.
 */
router.post('/import', async (req, res, next) => {
  try {
    const { epics } = req.body;
    if (!Array.isArray(epics)) {
      return res.status(400).json({ message: 'Invalid import format. "epics" array is required.' });
    }

    let importedEpicsCount = 0;
    let importedTasksCount = 0;

    for (const epicItem of epics) {
      if (!epicItem.title) continue;

      const newEpic = await Epic.create({
        title: epicItem.title.trim(),
        description: epicItem.description?.trim() || '',
        color: epicItem.color || '#6366f1',
        createdBy: req.user.id,
      });
      importedEpicsCount++;

      if (Array.isArray(epicItem.tasks)) {
        for (const taskItem of epicItem.tasks) {
          if (!taskItem.title) continue;
          await Task.create({
            title: taskItem.title.trim(),
            description: taskItem.description?.trim() || '',
            status: taskItem.status || 'todo',
            priority: taskItem.priority || 'medium',
            assignee: taskItem.assignee?.trim() || '',
            epicId: newEpic._id,
            dueDate: taskItem.dueDate ? new Date(taskItem.dueDate) : null,
            subtasks: Array.isArray(taskItem.subtasks) ? taskItem.subtasks : [],
            tags: Array.isArray(taskItem.tags) ? taskItem.tags : [],
            orderIndex: taskItem.orderIndex || 0,
          });
          importedTasksCount++;
        }
      }
    }

    res.json({
      message: `Successfully imported ${importedEpicsCount} epic(s) and ${importedTasksCount} task(s).`,
      importedEpics: importedEpicsCount,
      importedTasks: importedTasksCount,
    });
  } catch (error) {
    console.error('❗  [epics/POST /import]', error.message);
    next(error);
  }
});

// ─── POST /api/epics ──────────────────────────────────────────────────────────
/**
 * Body: { title, description?, color?, startDate?, targetDate? }
 * Returns: { epic }
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, color, startDate, targetDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Epic title is required.' });
    }

    const epic = await Epic.create({
      title      : title.trim(),
      description: description?.trim() || '',
      color      : color || '#6366f1',
      startDate  : startDate ? new Date(startDate) : null,
      targetDate : targetDate ? new Date(targetDate) : null,
      createdBy  : req.user.id,
    });

    // Attach counts for the frontend (new epic has no tasks yet)
    const payload = { ...epic.toJSON(), taskCount: 0, doneCount: 0 };

    console.log(`✅  [epics] Created: "${epic.title}" (${epic._id}) by ${req.user.email}`);
    res.status(201).json({ epic: payload });
  } catch (error) {
    console.error('❗  [epics/POST /]', error.message);
    next(error);
  }
});

// ─── GET /api/epics/:id ───────────────────────────────────────────────────────
/**
 * Returns a single Epic (plus task/done counts) owned by the current user.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Epic ID format.' });
    }

    const [epic] = await Epic.aggregate([
      {
        $match: {
          _id      : new mongoose.Types.ObjectId(id),
          createdBy: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $lookup: {
          from        : 'tasks',
          localField  : '_id',
          foreignField: 'epicId',
          as          : 'tasks',
        },
      },
      {
        $addFields: {
          taskCount: { $size: '$tasks' },
          doneCount: {
            $size: {
              $filter: {
                input: '$tasks',
                as   : 't',
                cond : { $eq: ['$$t.status', 'done'] },
              },
            },
          },
        },
      },
      { $project: { tasks: 0 } },
    ]);

    if (!epic) {
      return res.status(404).json({ message: 'Epic not found or access denied.' });
    }

    console.log(`📋  [epics] GET /${id} — found: "${epic.title}"`);
    res.json({ epic });
  } catch (error) {
    console.error(`❗  [epics/GET /:id]`, error.message);
    next(error);
  }
});

// ─── PUT /api/epics/:id ───────────────────────────────────────────────────────
/**
 * Body: { title?, description?, color? }
 * Returns: { epic }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Epic ID format.' });
    }

    const { title, description, color } = req.body;

    // Build update object — only include fields that were actually sent
    const updates = {};
    if (title       !== undefined) updates.title       = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (color       !== undefined) updates.color       = color;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }

    // findOneAndUpdate scopes the query to the current user — prevents IDOR
    const epic = await Epic.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!epic) {
      return res.status(404).json({ message: 'Epic not found or access denied.' });
    }

    console.log(`✏️   [epics] Updated: "${epic.title}" (${epic._id})`);
    res.json({ epic });
  } catch (error) {
    console.error(`❗  [epics/PUT /:id]`, error.message);
    next(error);
  }
});

// ─── POST /api/epics/:id/duplicate ───────────────────────────────────────────
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Epic ID format.' });
    }

    const sourceEpic = await Epic.findOne({ _id: id, createdBy: req.user.id });
    if (!sourceEpic) {
      return res.status(404).json({ message: 'Epic not found or access denied.' });
    }

    const clonedEpic = await Epic.create({
      title: `${sourceEpic.title} (Copy)`,
      description: sourceEpic.description || '',
      color: sourceEpic.color || '#6366f1',
      startDate: sourceEpic.startDate,
      targetDate: sourceEpic.targetDate,
      createdBy: req.user.id,
    });

    const sourceTasks = await Task.find({ epicId: id });
    let clonedTaskCount = 0;
    for (const t of sourceTasks) {
      await Task.create({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        epicId: clonedEpic._id,
        dueDate: t.dueDate,
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        tags: Array.isArray(t.tags) ? t.tags : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        orderIndex: t.orderIndex,
      });
      clonedTaskCount++;
    }

    const payload = {
      ...clonedEpic.toJSON(),
      taskCount: clonedTaskCount,
      doneCount: sourceTasks.filter((t) => t.status === 'done').length,
    };

    console.log(`📋  [epics] Duplicated: "${sourceEpic.title}" → "${clonedEpic.title}" (${clonedTaskCount} tasks)`);
    res.status(201).json({ epic: payload });
  } catch (error) {
    console.error(`❗  [epics/POST /:id/duplicate]`, error.message);
    next(error);
  }
});

// ─── DELETE /api/epics/:id ────────────────────────────────────────────────────
/**
 * Cascade-deletes all Tasks belonging to the Epic before removing the Epic itself.
 * Returns: { message }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Epic ID format.' });
    }

    const epic = await Epic.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!epic) {
      return res.status(404).json({ message: 'Epic not found or access denied.' });
    }

    // Cascade: remove all tasks belonging to this epic
    const { deletedCount } = await Task.deleteMany({ epicId: id });

    console.log(
      `🗑️   [epics] Deleted: "${epic.title}" (${id}) + ${deletedCount} task(s) by ${req.user.email}`
    );

    res.json({ message: `Epic "${epic.title}" and ${deletedCount} task(s) deleted successfully.` });
  } catch (error) {
    console.error(`❗  [epics/DELETE /:id]`, error.message);
    next(error);
  }
});

// ─── GET /api/epics/:id/tasks (legacy alias) ──────────────────────────────────
/**
 * Returns tasks for a given Epic sorted by orderIndex.
 * Mirrors GET /api/tasks?epicId=... for spec compliance.
 */
router.get('/:id/tasks', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Epic ID format.' });
    }

    // Verify ownership before exposing tasks
    const epic = await Epic.findOne({ _id: id, createdBy: req.user.id });
    if (!epic) {
      return res.status(404).json({ message: 'Epic not found or access denied.' });
    }

    const tasks = await Task.find({ epicId: id }).sort({ orderIndex: 1 });

    console.log(`📋  [epics] GET /${id}/tasks — ${tasks.length} task(s)`);
    res.json({ tasks });
  } catch (error) {
    console.error(`❗  [epics/GET /:id/tasks]`, error.message);
    next(error);
  }
});

module.exports = router;
