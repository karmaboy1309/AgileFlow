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

// GET /api/reports/time-tracking?projectId=...
router.get('/time-tracking', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter);
    const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((s, t) => s + (t.loggedHours || 0), 0);

    const timeTrackingData = tasks.map(t => ({
      issueKey: t.issueKey || 'AGILE-?',
      title: t.title,
      assignee: t.assignee || 'Unassigned',
      estimatedHours: t.estimatedHours || 0,
      loggedHours: t.loggedHours || 0,
      accuracyPct: (t.estimatedHours || 0) > 0 ? Math.round(((t.loggedHours || 0) / t.estimatedHours) * 100) : 100,
    }));

    res.json({
      totalEstimatedHours: totalEstimated,
      totalLoggedHours: totalLogged,
      varianceHours: totalLogged - totalEstimated,
      issues: timeTrackingData,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/created-vs-resolved?projectId=...
router.get('/created-vs-resolved', async (req, res, next) => {
  try {
    const { projectId, days = 14 } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter);
    const numDays = Math.min(Number(days), 30);
    const now = new Date();
    const chartData = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);

      const createdOnDay = tasks.filter(t => new Date(t.createdAt).toISOString().slice(0, 10) === dateStr).length;
      const resolvedOnDay = tasks.filter(t => t.status === 'done' && new Date(t.updatedAt).toISOString().slice(0, 10) === dateStr).length;

      chartData.push({
        date: dateStr,
        created: createdOnDay,
        resolved: resolvedOnDay,
      });
    }

    res.json({ data: chartData });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/cycle-time?projectId=...
router.get('/cycle-time', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = { status: 'done' };
    if (projectId) filter.projectId = projectId;

    const completedTasks = await Task.find(filter);

    let totalLeadTimeDays = 0;
    const taskDetails = completedTasks.map(t => {
      const created = new Date(t.createdAt);
      const resolved = new Date(t.updatedAt);
      const leadTimeDays = Math.max(0.1, Math.round(((resolved - created) / (1000 * 60 * 60 * 24)) * 10) / 10);
      totalLeadTimeDays += leadTimeDays;

      return {
        issueKey: t.issueKey || 'AGILE-?',
        title: t.title,
        leadTimeDays,
      };
    });

    const avgLeadTimeDays = completedTasks.length > 0 ? Math.round((totalLeadTimeDays / completedTasks.length) * 10) / 10 : 0;

    res.json({
      avgLeadTimeDays,
      completedIssuesCount: completedTasks.length,
      issues: taskDetails,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/workload?projectId=...
router.get('/workload', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter);
    const workloadMap = {};

    tasks.forEach(t => {
      const member = t.assignee || 'Unassigned';
      if (!workloadMap[member]) {
        workloadMap[member] = { assignee: member, taskCount: 0, totalStoryPoints: 0, inProgressCount: 0 };
      }
      workloadMap[member].taskCount += 1;
      workloadMap[member].totalStoryPoints += t.storyPoints || 0;
      if (t.status === 'in-progress') workloadMap[member].inProgressCount += 1;
    });

    res.json({ workload: Object.values(workloadMap) });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/printable-summary?projectId=...
router.get('/printable-summary', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter);

    let html = `<!DOCTYPE html><html><head><title>AgileFlow Printable Issue Summary</title>
    <style>body{font-family:sans-serif;padding:20px;color:#111;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#f0f0f0;}</style>
    </head><body><h1>AgileFlow Executive Issue Report</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    <table><thead><tr><th>Key</th><th>Title</th><th>Type</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Points</th></tr></thead><tbody>`;

    tasks.forEach(t => {
      html += `<tr><td><b>${t.issueKey || 'N/A'}</b></td><td>${t.title}</td><td>${t.issueType}</td><td>${t.status}</td><td>${t.priority}</td><td>${t.assignee || 'Unassigned'}</td><td>${t.storyPoints || 0}</td></tr>`;
    });

    html += `</tbody></table></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
