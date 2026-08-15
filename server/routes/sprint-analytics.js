const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

// ─── GET /api/sprints/:id/velocity ─────────────────────────────────────────
// Returns velocity data for a sprint including story point breakdown by status,
// daily burn rate, and comparison to team average velocity.
router.get('/:id/velocity', auth, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id).lean();
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const tasks = await Task.find({ sprintId: req.params.id }).lean();

    const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const donePoints  = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
    const inProgPoints = tasks.filter(t => t.status === 'in-progress').reduce((s, t) => s + (t.storyPoints || 0), 0);
    const todoPoints  = tasks.filter(t => t.status === 'todo').reduce((s, t) => s + (t.storyPoints || 0), 0);

    // Calculate daily burn if sprint is active
    let dailyBurnRate = 0;
    let daysElapsed = 0;
    let daysRemaining = 0;
    if (sprint.startDate) {
      const start = new Date(sprint.startDate);
      const now   = new Date();
      const end   = sprint.endDate ? new Date(sprint.endDate) : null;
      daysElapsed   = Math.max(1, Math.floor((now - start) / 86400000));
      daysRemaining = end ? Math.max(0, Math.floor((end - now) / 86400000)) : 0;
      dailyBurnRate = daysElapsed > 0 ? (donePoints / daysElapsed).toFixed(2) : 0;
    }

    // Ideal burn: points per day to finish on time
    const totalDays = sprint.startDate && sprint.endDate
      ? Math.floor((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000)
      : 14;
    const idealBurnPerDay = totalDays > 0 ? (totalPoints / totalDays).toFixed(2) : 0;

    // Estimate remaining days needed
    const projectedDaysToComplete = dailyBurnRate > 0
      ? Math.ceil(todoPoints / dailyBurnRate)
      : null;

    res.json({
      sprint: { id: sprint._id, name: sprint.name, goal: sprint.goal, status: sprint.status },
      velocity: {
        totalPoints,
        donePoints,
        inProgressPoints: inProgPoints,
        todoPoints,
        completionRate: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
        dailyBurnRate: parseFloat(dailyBurnRate),
        idealBurnPerDay: parseFloat(idealBurnPerDay),
        daysElapsed,
        daysRemaining,
        projectedDaysToComplete,
        isOnTrack: dailyBurnRate >= idealBurnPerDay,
      },
      taskBreakdown: {
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        todo: tasks.filter(t => t.status === 'todo').length,
        byPriority: {
          high:   tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low:    tasks.filter(t => t.priority === 'low').length,
        },
      },
    });
  } catch (err) {
    console.error('Velocity error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/sprints/:id/team-capacity ─────────────────────────────────────
// Returns per-assignee load distribution for the sprint with point totals.
router.get('/:id/team-capacity', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ sprintId: req.params.id })
      .populate('assignedTo', 'name email avatarColor')
      .lean();

    // Group tasks and points by assignee
    const capacityMap = {};
    tasks.forEach(task => {
      const key = task.assignedTo ? task.assignedTo._id.toString() : 'unassigned';
      const label = task.assignedTo ? task.assignedTo.name : 'Unassigned';
      if (!capacityMap[key]) {
        capacityMap[key] = {
          userId: key === 'unassigned' ? null : key,
          name: label,
          avatarColor: task.assignedTo?.avatarColor || '#64748b',
          tasks: 0,
          points: 0,
          doneTasks: 0,
          donePoints: 0,
          estimatedHours: 0,
          loggedHours: 0,
        };
      }
      capacityMap[key].tasks++;
      capacityMap[key].points += task.storyPoints || 0;
      capacityMap[key].estimatedHours += task.estimatedHours || 0;
      capacityMap[key].loggedHours += task.loggedHours || 0;
      if (task.status === 'done') {
        capacityMap[key].doneTasks++;
        capacityMap[key].donePoints += task.storyPoints || 0;
      }
    });

    const members = Object.values(capacityMap).sort((a, b) => b.points - a.points);
    const maxPoints = members.length > 0 ? Math.max(...members.map(m => m.points)) : 1;

    // Annotate with relative load percentage
    members.forEach(m => {
      m.loadPercent = maxPoints > 0 ? Math.round((m.points / maxPoints) * 100) : 0;
      m.completionRate = m.tasks > 0 ? Math.round((m.doneTasks / m.tasks) * 100) : 0;
    });

    res.json({ members, totalTasks: tasks.length });
  } catch (err) {
    console.error('Team capacity error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
