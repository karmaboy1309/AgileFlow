'use strict';

const express = require('express');
const router = express.Router();
const Worklog = require('../models/Worklog');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/tasks/:taskId/worklogs
router.get('/tasks/:taskId/worklogs', async (req, res, next) => {
  try {
    const worklogs = await Worklog.find({ taskId: req.params.taskId })
      .populate('createdBy', 'name email avatarColor')
      .sort({ createdAt: -1 });
    res.json({ worklogs });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:taskId/worklogs
router.post('/tasks/:taskId/worklogs', async (req, res, next) => {
  try {
    const { timeSpentHours, description, startDate } = req.body;
    if (!timeSpentHours || Number(timeSpentHours) <= 0) {
      return res.status(400).json({ message: 'Valid timeSpentHours is required.' });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const hours = Number(timeSpentHours);
    const worklog = await Worklog.create({
      taskId: task._id,
      timeSpentHours: hours,
      description: description?.trim() || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      createdBy: req.user.id,
    });

    // Atomically increment loggedHours on Task
    task.loggedHours = (task.loggedHours || 0) + hours;
    task.activityLog.push({
      action: 'worklog_added',
      field: 'loggedHours',
      from: String(task.loggedHours - hours),
      to: String(task.loggedHours),
      actor: req.user.name || req.user.email,
    });
    await task.save();

    res.status(201).json({ worklog, task });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/worklogs/:id
router.delete('/worklogs/:id', async (req, res, next) => {
  try {
    const worklog = await Worklog.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!worklog) return res.status(404).json({ message: 'Worklog entry not found.' });

    // Decrement task logged hours
    await Task.findByIdAndUpdate(worklog.taskId, {
      $inc: { loggedHours: -worklog.timeSpentHours },
    });

    res.json({ message: 'Worklog entry removed.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
