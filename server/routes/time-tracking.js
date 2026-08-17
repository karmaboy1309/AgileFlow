const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Worklog = require('../models/Worklog');
const Task = require('../models/Task');

// GET /api/time-tracking/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    // Build query filters
    const query = {};
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate)   query.startDate.$lte = new Date(endDate);
    }
    
    // Find all worklogs
    let worklogs = await Worklog.find(query)
      .populate('taskId', 'projectId title issueKey')
      .populate('createdBy', 'name email avatarColor')
      .lean();
      
    // Filter worklogs by project if projectId is supplied
    if (projectId) {
      worklogs = worklogs.filter(w => w.taskId && w.taskId.projectId && w.taskId.projectId.toString() === projectId);
    }
    
    // Aggregate statistics
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    const categoryBreakdown = {};
    const userBreakdown = {};
    
    worklogs.forEach(w => {
      const hrs = w.timeSpentHours || 0;
      totalHours += hrs;
      
      if (w.isBillable) {
        billableHours += hrs;
      } else {
        nonBillableHours += hrs;
      }
      
      const cat = w.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + hrs;
      
      const userId = w.createdBy?._id?.toString() || 'unknown';
      const userName = w.createdBy?.name || 'Unknown User';
      if (!userBreakdown[userId]) {
        userBreakdown[userId] = { name: userName, hours: 0, billable: 0 };
      }
      userBreakdown[userId].hours += hrs;
      if (w.isBillable) userBreakdown[userId].billable += hrs;
    });
    
    res.json({
      summary: {
        totalHours: parseFloat(totalHours.toFixed(1)),
        billableHours: parseFloat(billableHours.toFixed(1)),
        nonBillableHours: parseFloat(nonBillableHours.toFixed(1)),
        billablePercent: totalHours > 0 ? parseFloat(((billableHours / totalHours) * 100).toFixed(1)) : 0,
      },
      categoryBreakdown,
      userBreakdown: Object.values(userBreakdown),
      worklogs: worklogs.slice(0, 100), // return last 100 entries
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
