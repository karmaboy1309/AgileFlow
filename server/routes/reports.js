'use strict';

/**
 * routes/reports.js
 *
 * REST API endpoints for Agile Burndown Charts & Sprint Velocity Reports.
 */

const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Epic = require('../models/Epic');

router.use(authGuard);

// GET /api/reports/burndown/:sprintId
router.get('/burndown/:sprintId', async (req, res) => {
  try {
    const { sprintId } = req.params;
    const sprint = await Sprint.findOne({ _id: sprintId, createdBy: req.userId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found.' });
    }

    const tasks = await Task.find({ sprintId });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const startDate = sprint.startDate || sprint.createdAt;
    const endDate = sprint.endDate || new Date(new Date(startDate).getTime() + 14 * 24 * 60 * 60 * 1000);

    // Build timeline points (14 day duration)
    const durationDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const daysArray = [];
    const idealStep = totalPoints / durationDays;

    let runningRemaining = totalPoints;

    for (let i = 0; i <= durationDays; i++) {
      const currentDate = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000);
      const dayLabel = `Day ${i}`;
      const idealRemaining = Math.max(0, Math.round((totalPoints - i * idealStep) * 10) / 10);

      // Count tasks completed on or before currentDate
      const completedUpToDay = tasks
        .filter((t) => t.status === 'done' && new Date(t.updatedAt) <= currentDate)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      const actualRemaining = Math.max(0, totalPoints - completedUpToDay);

      daysArray.push({
        day: dayLabel,
        date: currentDate.toISOString().split('T')[0],
        ideal: idealRemaining,
        actual: actualRemaining,
      });
    }

    res.json({
      sprint,
      totalPoints,
      completedPoints,
      remainingPoints: totalPoints - completedPoints,
      dataPoints: daysArray,
    });
  } catch (error) {
    console.error('Error in GET /api/reports/burndown:', error);
    res.status(500).json({ error: 'Failed to generate burndown report' });
  }
});

// GET /api/reports/velocity/:projectId
router.get('/velocity/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const sprints = await Sprint.find({ projectId, createdBy: req.userId }).sort({ createdAt: 1 });

    const velocityData = [];

    for (const sprint of sprints) {
      const tasks = await Task.find({ sprintId: sprint._id });
      const committedPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = tasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      velocityData.push({
        sprintId: sprint._id,
        sprintName: sprint.name,
        status: sprint.status,
        committedPoints,
        completedPoints,
      });
    }

    res.json({
      projectId,
      sprintsCount: sprints.length,
      velocityData,
    });
  } catch (error) {
    console.error('Error in GET /api/reports/velocity:', error);
    res.status(500).json({ error: 'Failed to generate velocity report' });
  }
});

module.exports = router;
