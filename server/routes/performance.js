const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

// ─── GET /api/reports/assignee-performance ────────────────────────────────────
// Returns per-assignee performance metrics: tasks completed, avg cycle time,
// story points delivered, and on-time delivery rate.
router.get('/assignee-performance', auth, async (req, res) => {
  try {
    const { projectId, sprintId, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 86400000);

    const query = { status: 'done', updatedAt: { $gte: since } };
    if (projectId) query.projectId = projectId;
    if (sprintId)  query.sprintId  = sprintId;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatarColor')
      .lean();

    // Group by assignee
    const map = {};
    tasks.forEach(task => {
      const key = task.assignedTo?._id?.toString() || 'unassigned';
      if (!map[key]) {
        map[key] = {
          userId: key,
          name: task.assignedTo?.name || 'Unassigned',
          email: task.assignedTo?.email || '',
          avatarColor: task.assignedTo?.avatarColor || '#64748b',
          tasksCompleted: 0,
          storyPointsDelivered: 0,
          onTimeTasks: 0,
          lateTasks: 0,
          cycleTimes: [],
        };
      }

      map[key].tasksCompleted++;
      map[key].storyPointsDelivered += task.storyPoints || 0;

      // On-time delivery
      if (task.dueDate) {
        const completedAt = new Date(task.updatedAt);
        const dueDate = new Date(task.dueDate);
        if (completedAt <= dueDate) map[key].onTimeTasks++;
        else map[key].lateTasks++;
      }

      // Cycle time (days from creation to done)
      if (task.createdAt && task.updatedAt) {
        const cycleMs = new Date(task.updatedAt) - new Date(task.createdAt);
        map[key].cycleTimes.push(cycleMs / 86400000);
      }
    });

    const performers = Object.values(map).map(p => {
      const avgCycleTime = p.cycleTimes.length
        ? (p.cycleTimes.reduce((a, b) => a + b, 0) / p.cycleTimes.length).toFixed(1)
        : null;
      const onTimeRate = (p.onTimeTasks + p.lateTasks) > 0
        ? Math.round((p.onTimeTasks / (p.onTimeTasks + p.lateTasks)) * 100)
        : null;
      return {
        ...p,
        avgCycleTimeDays: avgCycleTime ? parseFloat(avgCycleTime) : null,
        onTimeDeliveryRate: onTimeRate,
        cycleTimes: undefined,
      };
    }).sort((a, b) => b.storyPointsDelivered - a.storyPointsDelivered);

    res.json({
      period: { days: parseInt(days), since },
      performers,
      summary: {
        totalTasks: tasks.length,
        totalPoints: performers.reduce((s, p) => s + p.storyPointsDelivered, 0),
        teamAvgCycleTime: performers.length
          ? (performers.reduce((s, p) => s + (p.avgCycleTimeDays || 0), 0) / performers.length).toFixed(1)
          : null,
      },
    });
  } catch (err) {
    console.error('Assignee performance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
