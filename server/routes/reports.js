'use strict';

const express = require('express');
const router = express.Router();
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/reports/burndown?sprintId=...
router.get('/burndown', async (req, res, next) => {
  try {
    const { sprintId } = req.query;
    if (!sprintId) return res.status(400).json({ message: 'sprintId parameter is required.' });

    const sprint = await Sprint.findOne({ _id: sprintId, createdBy: req.user.id });
    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });

    const tasks = await Task.find({ sprintId });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const start = sprint.startDate || sprint.createdAt;
    const end = sprint.endDate || new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    // Generate daily burndown data points
    const dailyData = [];
    const pointsPerDay = totalPoints / durationDays;

    for (let day = 0; day <= durationDays; day++) {
      const currentDate = new Date(start.getTime() + day * 24 * 60 * 60 * 1000);
      const idealRemaining = Math.max(0, Math.round((totalPoints - day * pointsPerDay) * 10) / 10);

      // Tasks completed on or before this day
      const completedOnDay = tasks.filter(
        t => t.status === 'done' && t.updatedAt <= currentDate
      ).reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      const actualRemaining = Math.max(0, totalPoints - completedOnDay);

      dailyData.push({
        day: `Day ${day}`,
        date: currentDate.toISOString().slice(0, 10),
        ideal: idealRemaining,
        actual: currentDate <= new Date() ? actualRemaining : null,
      });
    }

    res.json({
      sprintName: sprint.name,
      totalPoints,
      durationDays,
      burndown: dailyData,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/velocity?projectId=...
router.get('/velocity', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = { createdBy: req.user.id };
    if (projectId) filter.projectId = projectId;

    const sprints = await Sprint.find(filter).sort({ createdAt: 1 }).limit(7);
    const sprintIds = sprints.map(s => s._id);
    const tasks = await Task.find({ sprintId: { $in: sprintIds } });

    const velocityData = sprints.map(s => {
      const sTasks = tasks.filter(t => t.sprintId?.toString() === s._id.toString());
      const committed = sTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completed = sTasks
        .filter(t => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        sprintName: s.name,
        committed,
        completed,
      };
    });

    res.json({ velocity: velocityData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
