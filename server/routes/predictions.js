const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

// GET /api/predictions/project-completion/:projectId
router.get('/project-completion/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get historical completed sprints to calculate velocity
    const completedSprints = await Sprint.find({ projectId, status: 'completed' })
      .sort({ endDate: -1 })
      .limit(6)
      .lean();
      
    // Calculate total points completed per sprint
    const velocities = [];
    for (const sprint of completedSprints) {
      const completedTasks = await Task.find({ sprintId: sprint._id, status: 'done' }).lean();
      const points = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      velocities.push(points);
    }
    
    const avgVelocity = velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 15; // default fallback velocity
      
    // Calculate remaining points in backlog
    const remainingTasks = await Task.find({ projectId, status: { $ne: 'done' } }).lean();
    const remainingPoints = remainingTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    // Projections
    const mostLikelySprints = avgVelocity > 0 ? Math.ceil(remainingPoints / avgVelocity) : 1;
    const optimisticSprints = avgVelocity > 0 ? Math.ceil(remainingPoints / (avgVelocity * 1.3)) : 1;
    const pessimisticSprints = avgVelocity > 0 ? Math.ceil(remainingPoints / (avgVelocity * 0.7)) : 1;
    
    // Build confidence bands dates
    const sprintDurationDays = 14;
    const now = new Date();
    
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toISOString().split('T')[0];
    };
    
    res.json({
      metrics: {
        avgVelocity: parseFloat(avgVelocity.toFixed(1)),
        velocities,
        remainingPoints,
        remainingTasksCount: remainingTasks.length,
      },
      projections: {
        optimistic: { sprints: optimisticSprints, days: optimisticSprints * sprintDurationDays, targetDate: addDays(now, optimisticSprints * sprintDurationDays) },
        mostLikely: { sprints: mostLikelySprints, days: mostLikelySprints * sprintDurationDays, targetDate: addDays(now, mostLikelySprints * sprintDurationDays) },
        pessimistic: { sprints: pessimisticSprints, days: pessimisticSprints * sprintDurationDays, targetDate: addDays(now, pessimisticSprints * sprintDurationDays) },
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
