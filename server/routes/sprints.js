'use strict';

const express = require('express');
const router = express.Router();
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/sprints?projectId=...
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = { createdBy: req.user.id };
    if (projectId) filter.projectId = projectId;

    const sprints = await Sprint.find(filter).sort({ createdAt: -1 });

    // Fetch tasks for each sprint to include counts & story points
    const sprintIds = sprints.map((s) => s._id);
    const tasks = await Task.find({ sprintId: { $in: sprintIds } });

    const result = sprints.map((sprint) => {
      const sprintTasks = tasks.filter((t) => t.sprintId?.toString() === sprint._id.toString());
      const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = sprintTasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        ...sprint.toJSON(),
        tasksCount: sprintTasks.length,
        totalPoints,
        completedPoints,
      };
    });

    res.json({ sprints: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/sprints
router.post('/', async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate, projectId } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ message: 'Sprint name and projectId are required.' });
    }

    const sprint = await Sprint.create({
      name: name.trim(),
      goal: goal?.trim() || '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      projectId,
      createdBy: req.user.id,
    });

    res.status(201).json({ sprint });
  } catch (err) {
    next(err);
  }
});

// PUT /api/sprints/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (goal !== undefined) updates.goal = goal.trim();
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updates.status = status;

    const sprint = await Sprint.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });
    res.json({ sprint });
  } catch (err) {
    next(err);
  }
});

// POST /api/sprints/:id/start - Start sprint
router.post('/:id/start', async (req, res, next) => {
  try {
    const { durationDays = 14 } = req.body;
    const sprint = await Sprint.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });

    // Check if another sprint is active in the same project
    const activeSprint = await Sprint.findOne({
      projectId: sprint.projectId,
      status: 'active',
      _id: { $ne: sprint._id },
    });

    if (activeSprint) {
      return res.status(400).json({ message: `Sprint "${activeSprint.name}" is currently active. Complete it first before starting a new sprint.` });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(durationDays));

    sprint.status = 'active';
    sprint.startDate = startDate;
    sprint.endDate = endDate;
    await sprint.save();

    res.json({ sprint, message: `Sprint "${sprint.name}" started!` });
  } catch (err) {
    next(err);
  }
});

// POST /api/sprints/:id/complete - Complete sprint
router.post('/:id/complete', async (req, res, next) => {
  try {
    const sprint = await Sprint.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });

    sprint.status = 'closed';
    await sprint.save();

    // Move incomplete tasks back to backlog (sprintId = null)
    await Task.updateMany(
      { sprintId: sprint._id, status: { $ne: 'done' } },
      { $set: { sprintId: null } }
    );

    res.json({ sprint, message: `Sprint "${sprint.name}" completed!` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sprints/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const sprint = await Sprint.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });

    // Unassign tasks from deleted sprint
    await Task.updateMany({ sprintId: req.params.id }, { $set: { sprintId: null } });

    res.json({ message: 'Sprint deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
