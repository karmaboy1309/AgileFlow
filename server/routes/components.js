'use strict';

const express = require('express');
const router = express.Router();
const Component = require('../models/Component');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/components?projectId=...
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = { createdBy: req.user.id };
    if (projectId) filter.projectId = projectId;

    const components = await Component.find(filter)
      .populate('lead', 'name email avatarColor')
      .sort({ name: 1 });

    // Calculate issues count per component
    const componentIds = components.map(c => c._id);
    const tasks = await Task.find({ componentIds: { $in: componentIds } }).select('componentIds');

    const result = components.map(c => {
      const count = tasks.filter(t => t.componentIds?.some(id => id.toString() === c._id.toString())).length;
      return { ...c.toJSON(), issueCount: count };
    });

    res.json({ components: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/components
router.post('/', async (req, res, next) => {
  try {
    const { name, description, lead, projectId } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ message: 'Component name and projectId are required.' });
    }

    const component = await Component.create({
      name: name.trim(),
      description: description?.trim() || '',
      lead: lead || null,
      projectId,
      createdBy: req.user.id,
    });

    res.status(201).json({ component });
  } catch (err) {
    next(err);
  }
});

// PUT /api/components/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, lead } = req.body;
    const component = await Component.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { name, description, lead },
      { new: true, runValidators: true }
    );
    if (!component) return res.status(404).json({ message: 'Component not found.' });
    res.json({ component });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/components/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const component = await Component.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!component) return res.status(404).json({ message: 'Component not found.' });

    // Pull component ID from all tasks
    await Task.updateMany(
      { componentIds: req.params.id },
      { $pull: { componentIds: req.params.id } }
    );

    res.json({ message: 'Component deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
