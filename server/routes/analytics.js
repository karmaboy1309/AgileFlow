const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');

// ─── GET /api/reports/cfd ─────────────────────────────────────────────────────
// Cumulative Flow Diagram data: daily snapshot of task counts by status
// over the last N days to visualize flow efficiency and bottlenecks.
router.get('/cfd', auth, async (req, res) => {
  try {
    const { projectId, epicId, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 86400000);
    
    const STATUSES = ['todo', 'in-progress', 'in-review', 'done'];
    const query = {};
    if (projectId) query.projectId = projectId;
    if (epicId)    query.epicId    = epicId;

    // Get all tasks with their status transition history (from activityLog)
    const tasks = await Task.find({ ...query, createdAt: { $lte: new Date() } }).lean();

    // Build daily snapshots
    const dailyData = [];
    for (let d = 0; d < parseInt(days); d++) {
      const date = new Date(Date.now() - (parseInt(days) - 1 - d) * 86400000);
      date.setHours(23, 59, 59, 999);
      const snapshot = { date: date.toISOString().split('T')[0], todo: 0, 'in-progress': 0, 'in-review': 0, done: 0 };
      tasks.forEach(task => {
        const createdAt = new Date(task.createdAt);
        if (createdAt > date) return; // task didn't exist yet
        // Use current status as a proxy (in production, would use status history)
        const status = task.status || 'todo';
        if (snapshot.hasOwnProperty(status)) snapshot[status]++;
      });
      snapshot.total = Object.values(snapshot).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
      dailyData.push(snapshot);
    }

    // Calculate average cycle time (Work In Progress / Throughput ratio)
    const wipAvg = dailyData.reduce((s, d) => s + d['in-progress'], 0) / dailyData.length;
    const throughput = dailyData.length > 1
      ? (dailyData[dailyData.length - 1].done - dailyData[0].done) / (dailyData.length - 1)
      : 0;
    const avgCycleTime = throughput > 0 ? (wipAvg / throughput).toFixed(1) : null;

    res.json({
      dailyData,
      insights: {
        avgWIP: parseFloat(wipAvg.toFixed(1)),
        throughputPerDay: parseFloat(throughput.toFixed(2)),
        estimatedCycleTimeDays: avgCycleTime ? parseFloat(avgCycleTime) : null,
        totalTasksTracked: tasks.length,
      },
    });
  } catch (err) {
    console.error('CFD error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/reports/throughput ─────────────────────────────────────────────
// Weekly throughput: tasks completed per week with trend calculation.
router.get('/throughput', auth, async (req, res) => {
  try {
    const { projectId, weeks = 12 } = req.query;
    const since = new Date(Date.now() - weeks * 7 * 86400000);
    const query = { status: 'done', updatedAt: { $gte: since } };
    if (projectId) query.projectId = projectId;

    const completedTasks = await Task.find(query).lean();

    // Group by week
    const weekMap = {};
    completedTasks.forEach(task => {
      const d = new Date(task.updatedAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = { week: key, tasksCompleted: 0, storyPoints: 0 };
      weekMap[key].tasksCompleted++;
      weekMap[key].storyPoints += task.storyPoints || 0;
    });

    const weekData = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));

    // Calculate trend (linear regression slope)
    let trend = 0;
    if (weekData.length >= 2) {
      const n = weekData.length;
      const xs = weekData.map((_, i) => i);
      const ys = weekData.map(w => w.tasksCompleted);
      const xMean = xs.reduce((a, b) => a + b, 0) / n;
      const yMean = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0);
      const den = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
      trend = den > 0 ? parseFloat((num / den).toFixed(2)) : 0;
    }

    res.json({
      weekData,
      summary: {
        totalCompleted: completedTasks.length,
        avgPerWeek: weekData.length > 0 ? parseFloat((completedTasks.length / weekData.length).toFixed(1)) : 0,
        trend: trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable',
        trendValue: trend,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/analytics/team-radar ───────────────────────────────────────────
router.get('/team-radar', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query).populate('assignedTo', 'name').lean();
    
    // Aggregate by user
    const userStats = {};
    tasks.forEach(t => {
      if (!t.assignedTo) return;
      const uid = t.assignedTo._id.toString();
      if (!userStats[uid]) {
        userStats[uid] = {
          name: t.assignedTo.name,
          velocity: 0, // completed points
          throughput: 0, // completed tasks
          efficiency: 0, // tasks completed vs in-progress
          quality: 0, // tasks without bugs/rework
          speed: 0, // average hours spent (inverse helper)
        };
      }
      const stats = userStats[uid];
      if (t.status === 'done') {
        stats.throughput++;
        stats.velocity += t.storyPoints || 0;
      }
    });

    res.json({ radarData: Object.values(userStats) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/analytics/issue-age ─────────────────────────────────────────────
router.get('/issue-age', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = { status: { $ne: 'done' } };
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query).lean();
    const now = Date.now();

    // Group into bins: 0-3d, 4-7d, 8-14d, 15-30d, 30d+
    const bins = { '0-3d': 0, '4-7d': 0, '8-14d': 0, '15-30d': 0, '30d+': 0 };
    tasks.forEach(t => {
      const ageDays = Math.floor((now - new Date(t.createdAt)) / 86400000);
      if (ageDays <= 3) bins['0-3d']++;
      else if (ageDays <= 7) bins['4-7d']++;
      else if (ageDays <= 14) bins['8-14d']++;
      else if (ageDays <= 30) bins['15-30d']++;
      else bins['30d+']++;
    });

    res.json({ bins, totalOpen: tasks.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/analytics/suggestions ───────────────────────────────────────────
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { title, projectId } = req.query;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const query = { status: { $ne: 'done' } };
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query).limit(10).lean();
    
    // Basic fuzzy match simulation (matching title substrings)
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const suggested = tasks.map(t => {
      let score = 0;
      const tTitle = t.title.toLowerCase();
      words.forEach(w => { if (tTitle.includes(w)) score++; });
      return { ...t, score };
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);

    res.json({ suggested });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
