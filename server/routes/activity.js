const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const Task = require('../models/Task');

// ─── POST /api/activity ──────────────────────────────────────────────────────
// Create a new activity log entry manually (e.g., from integrations)
router.post('/', auth, async (req, res) => {
  try {
    const { entityType, entityId, action, changes, summary, meta } = req.body;
    if (!entityType || !entityId || !action) {
      return res.status(400).json({ message: 'entityType, entityId, and action are required' });
    }
    const log = await ActivityLog.create({
      entityType,
      entityId,
      action,
      actor: req.user.id,
      changes: changes || [],
      summary: summary || '',
      meta: meta || {},
    });
    res.status(201).json({ log });
  } catch (err) {
    console.error('Activity create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/activity/entity/:type/:id ─────────────────────────────────────
// Get recent activity logs for a specific entity (task, epic, sprint, etc.)
router.get('/entity/:type/:id', auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = parseInt(req.query.skip) || 0;

    const [logs, total] = await Promise.all([
      ActivityLog.find({ entityType: type, entityId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name email avatarColor')
        .lean(),
      ActivityLog.countDocuments({ entityType: type, entityId: id }),
    ]);

    res.json({ logs, total, hasMore: skip + limit < total });
  } catch (err) {
    console.error('Activity fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/activity/user ──────────────────────────────────────────────────
// Get activity feed for the currently authenticated user
router.get('/user', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await ActivityLog.find({ actor: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/activity/feed ──────────────────────────────────────────────────
// Get recent team activity across all tasks the user can access
router.get('/feed', auth, async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit) || 100;
    const action = req.query.action; // optional filter by action type
    const since  = req.query.since ? new Date(req.query.since) : null;

    const query = {};
    if (action) query.action = action;
    if (since)  query.createdAt = { $gte: since };

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name email avatarColor')
      .lean();

    // Group by date for timeline display
    const grouped = logs.reduce((acc, log) => {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    }, {});

    res.json({ logs, grouped, total: logs.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/activity/:id ────────────────────────────────────────────────
// Delete a specific activity log entry (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    await ActivityLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Activity log deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
