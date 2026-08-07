'use strict';

/**
 * routes/components.js
 *
 * REST API routes for Project Components.
 */

const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const Component = require('../models/Component');
const Task = require('../models/Task');

// All routes require JWT authentication
router.use(authGuard);

// GET /api/components?projectId=...
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const components = await Component.find(filter).sort({ name: 1 });

    // Compute task counts per component
    const componentIds = components.map(c => c._id);
    const tasks = await Task.find({ componentIds: { $in: componentIds } });

    const componentsWithStats = components.map(comp => {
      const compTasks = tasks.filter(t => t.componentIds && t.componentIds.some(cid => cid.toString() === comp._id.toString()));
      const totalTasks = compTasks.length;
      const completedTasks = compTasks.filter(t => t.status === 'done').length;

      return {
        ...comp.toObject(),
        totalTasks,
        completedTasks,
      };
    });

    res.json(componentsWithStats);
  } catch (error) {
    console.error('Error in GET /api/components:', error);
    res.status(500).json({ error: 'Failed to fetch components.' });
  }
});

// POST /api/components
router.post('/', async (req, res) => {
  try {
    const { name, description, lead, projectId } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ error: 'Component name and projectId are required.' });
    }

    const component = await Component.create({
      name,
      description: description || '',
      lead: lead || '',
      projectId,
      createdBy: req.userId,
    });

    res.status(201).json(component);
  } catch (error) {
    console.error('Error in POST /api/components:', error);
    res.status(500).json({ error: 'Failed to create component.' });
  }
});

// PUT /api/components/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, lead } = req.body;
    const component = await Component.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found.' });
    }

    if (name !== undefined) component.name = name;
    if (description !== undefined) component.description = description;
    if (lead !== undefined) component.lead = lead;

    await component.save();
    res.json(component);
  } catch (error) {
    console.error('Error in PUT /api/components/:id:', error);
    res.status(500).json({ error: 'Failed to update component.' });
  }
});

// DELETE /api/components/:id
router.delete('/:id', async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found.' });
    }

    // Remove component reference from tasks
    await Task.updateMany(
      { componentIds: component._id },
      { $pull: { componentIds: component._id } }
    );

    await component.deleteOne();
    res.json({ message: 'Component deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/components/:id:', error);
    res.status(500).json({ error: 'Failed to delete component.' });
  }
});

module.exports = router;
