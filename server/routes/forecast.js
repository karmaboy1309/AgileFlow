const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Epic = require('../models/Epic');

// ─── GET /api/tasks/estimated-completion ─────────────────────────────────────
// Calculates estimated completion dates using logged hours vs estimated hours,
// providing intelligent forecasting based on current team velocity.
router.get('/estimated-completion', auth, async (req, res) => {
  try {
    const { epicId } = req.query;
    if (!epicId) return res.status(400).json({ message: 'epicId is required' });

    const tasks = await Task.find({ epicId, isArchived: { $ne: true } })
      .populate('assignedTo', 'name email avatarColor')
      .lean();

    const completedTasks = tasks.filter(t => t.status === 'done');
    const pendingTasks   = tasks.filter(t => t.status !== 'done');

    // Calculate average team velocity (hours per day) from completed tasks
    let avgHoursPerDay = 6; // default assumption
    const recentCompleted = completedTasks.filter(t => {
      const diff = Date.now() - new Date(t.updatedAt).getTime();
      return diff < 30 * 86400000; // last 30 days
    });

    if (recentCompleted.length >= 3) {
      const totalLogged = recentCompleted.reduce((s, t) => s + (t.loggedHours || 0), 0);
      const oldestDate  = new Date(Math.min(...recentCompleted.map(t => new Date(t.createdAt))));
      const days        = Math.max(1, (Date.now() - oldestDate) / 86400000);
      avgHoursPerDay    = totalLogged / days;
    }

    // Total remaining estimated hours
    const remainingHours = pendingTasks.reduce((s, t) => {
      const remaining = Math.max(0, (t.estimatedHours || 0) - (t.loggedHours || 0));
      return s + remaining;
    }, 0);

    const daysToComplete = avgHoursPerDay > 0
      ? Math.ceil(remainingHours / avgHoursPerDay)
      : null;
    const estimatedDate = daysToComplete
      ? new Date(Date.now() + daysToComplete * 86400000).toISOString().split('T')[0]
      : null;

    // Per-task estimates
    const taskEstimates = pendingTasks.map(t => {
      const rem = Math.max(0, (t.estimatedHours || 0) - (t.loggedHours || 0));
      return {
        taskId: t._id,
        title: t.title,
        issueKey: t.issueKey,
        remainingHours: rem,
        estimatedDays: avgHoursPerDay > 0 ? Math.ceil(rem / avgHoursPerDay) : null,
        assignee: t.assignedTo?.name || 'Unassigned',
        priority: t.priority,
      };
    });

    res.json({
      epic: { id: epicId },
      forecast: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        remainingHours,
        avgTeamVelocityHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
        estimatedDaysToComplete: daysToComplete,
        estimatedCompletionDate: estimatedDate,
        confidence: recentCompleted.length >= 5 ? 'high' : recentCompleted.length >= 2 ? 'medium' : 'low',
      },
      taskEstimates,
    });
  } catch (err) {
    console.error('Estimated completion error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
