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

// GET /api/reports/cfd?projectId=...
router.get('/cfd', async (req, res, next) => {
  try {
    const { projectId, days = 14 } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter);
    const numDays = Math.min(Number(days), 30);
    const now = new Date();
    const cfdData = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);

      // Tasks created on or before date 'd'
      const activeAtDate = tasks.filter(t => new Date(t.createdAt) <= d);

      const todo = activeAtDate.filter(t => t.status === 'todo').length;
      const inProgress = activeAtDate.filter(t => t.status === 'in-progress').length;
      const done = activeAtDate.filter(t => t.status === 'done' && new Date(t.updatedAt) <= d).length;

      cfdData.push({
        date: dateStr,
        todo,
        inProgress,
        done,
      });
    }

    res.json({ cfd: cfdData });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/version-readiness?versionId=...
router.get('/version-readiness', async (req, res, next) => {
  try {
    const { versionId } = req.query;
    if (!versionId) return res.status(400).json({ message: 'versionId is required.' });

    const Version = require('../models/Version');
    const version = await Version.findById(versionId);
    if (!version) return res.status(404).json({ message: 'Version not found.' });

    const tasks = await Task.find({ fixVersionId: versionId });
    const totalIssues = tasks.length;
    const completedIssues = tasks.filter(t => t.status === 'done').length;
    const inProgressIssues = tasks.filter(t => t.status === 'in-progress').length;
    const todoIssues = tasks.filter(t => t.status === 'todo').length;
    const openBlockerBugs = tasks.filter(t => t.issueType === 'bug' && t.priority === 'high' && t.status !== 'done').length;

    const readinessPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 100;

    res.json({
      versionName: version.name,
      status: version.status,
      releaseDate: version.releaseDate,
      totalIssues,
      completedIssues,
      inProgressIssues,
      todoIssues,
      openBlockerBugs,
      readinessPct,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/sprint-report?sprintId=...
router.get('/sprint-report', async (req, res, next) => {
  try {
    const { sprintId } = req.query;
    if (!sprintId) return res.status(400).json({ message: 'sprintId is required.' });

    const Sprint = require('../models/Sprint');
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });

    const tasks = await Task.find({ sprintId });
    const completedTasks = tasks.filter(t => t.status === 'done');
    const uncompletedTasks = tasks.filter(t => t.status !== 'done');

    const completedPoints = completedTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const uncompletedPoints = uncompletedTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

    res.json({
      sprintName: sprint.name,
      sprintGoal: sprint.goal,
      status: sprint.status,
      completedTasks,
      uncompletedTasks,
      completedPoints,
      uncompletedPoints,
      totalPoints: completedPoints + uncompletedPoints,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/epic-forecast?epicId=...
router.get('/epic-forecast', async (req, res, next) => {
  try {
    const { epicId } = req.query;
    if (!epicId) return res.status(400).json({ message: 'epicId is required.' });

    const Epic = require('../models/Epic');
    const epic = await Epic.findById(epicId);
    if (!epic) return res.status(404).json({ message: 'Epic not found.' });

    const tasks = await Task.find({ epicId });
    const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const completedPoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
    const remainingPoints = totalPoints - completedPoints;

    // Estimate remaining sprints based on 10 pts per sprint average velocity
    const estimatedSprintsRemaining = Math.max(1, Math.ceil(remainingPoints / 10));

    res.json({
      epicTitle: epic.title,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      totalPoints,
      completedPoints,
      remainingPoints,
      completionPct: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 100,
      estimatedSprintsRemaining,
      estimatedWeeksRemaining: estimatedSprintsRemaining * 2,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
