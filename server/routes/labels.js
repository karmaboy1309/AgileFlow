const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Label = require('../models/Label');
const Task = require('../models/Task');

// ─── GET /api/labels ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { projectId, search, archived } = req.query;
    const query = {};
    if (projectId) query.$or = [{ project: projectId }, { project: null }];
    if (search) query.$text = { $search: search };
    if (!archived) query.isArchived = false;
    const labels = await Label.find(query).sort({ taskCount: -1, name: 1 }).lean();
    res.json({ labels });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/labels ─────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color, project } = req.body;
    if (!name) return res.status(400).json({ message: 'Label name is required' });
    const label = await Label.create({ name, description, color, project: project || null, createdBy: req.user.id });
    res.status(201).json({ label });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A label with this name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/labels/:id ──────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const label = await Label.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!label) return res.status(404).json({ message: 'Label not found' });
    res.json({ label });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/labels/:id ───────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Label.findByIdAndDelete(req.params.id);
    // Remove label from all tasks
    await Task.updateMany({ labels: req.params.id }, { $pull: { labels: req.params.id } });
    res.json({ message: 'Label deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/labels/bulk-assign ─────────────────────────────────────────────
// Assign one or more labels to multiple tasks at once
router.post('/bulk-assign', auth, async (req, res) => {
  try {
    const { taskIds, labelIds, action = 'add' } = req.body;
    if (!taskIds?.length || !labelIds?.length) {
      return res.status(400).json({ message: 'taskIds and labelIds are required' });
    }
    const op = action === 'remove'
      ? { $pullAll: { labels: labelIds } }
      : { $addToSet: { labels: { $each: labelIds } } };
    const result = await Task.updateMany({ _id: { $in: taskIds } }, op);
    // Update usage counts
    if (action === 'add') {
      await Label.updateMany({ _id: { $in: labelIds } }, { $inc: { taskCount: taskIds.length } });
    } else {
      await Label.updateMany({ _id: { $in: labelIds } }, { $inc: { taskCount: -taskIds.length } });
    }
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/labels/:id/tasks ───────────────────────────────────────────────
router.get('/:id/tasks', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const tasks = await Task.find({ labels: req.params.id })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('assignedTo', 'name avatarColor')
      .lean();
    res.json({ tasks, total: tasks.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
