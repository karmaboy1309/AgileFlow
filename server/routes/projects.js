'use strict';

const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/projects - list user projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ createdBy: req.user.id })
      .populate('lead', 'name email avatarColor')
      .sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects - create project
router.post('/', async (req, res, next) => {
  try {
    const { name, key, description, category } = req.body;
    if (!name || !key) {
      return res.status(400).json({ message: 'Project name and key are required.' });
    }

    const cleanKey = key.trim().toUpperCase();
    const existing = await Project.findOne({ createdBy: req.user.id, key: cleanKey });
    if (existing) {
      return res.status(400).json({ message: `Project key "${cleanKey}" already exists in your workspace.` });
    }

    const { template } = req.body;
    let finalStatuses = [
      { id: 'todo', label: 'To Do', category: 'todo' },
      { id: 'in-progress', label: 'In Progress', category: 'in-progress' },
      { id: 'done', label: 'Done', category: 'done' },
    ];

    if (template === 'kanban') {
      finalStatuses.splice(1, 0, { id: 'selected-for-development', label: 'Selected for Development', category: 'todo' });
    }

    const project = await Project.create({
      name: name.trim(),
      key: cleanKey,
      description: description?.trim() || '',
      category: category || 'Software',
      lead: req.user.id,
      createdBy: req.user.id,
      statuses: finalStatuses,
    });

    // For Scrum template, create an initial sprint automatically
    if (template === 'scrum') {
      const Sprint = require('../models/Sprint');
      await Sprint.create({
        name: `${cleanKey} Sprint 1`,
        projectId: project._id,
        status: 'draft',
        goal: 'Initial sprint created from Scrum template',
      });
    }

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('lead', 'name email avatarColor');
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, category, lead, statuses } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (lead !== undefined) updates.lead = lead;
    if (Array.isArray(statuses)) updates.statuses = statuses;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/archive - Toggle Project Archiving
router.post('/:id/archive', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    project.isArchived = !project.isArchived;
    await project.save();

    res.json({ project, message: project.isArchived ? 'Project archived.' : 'Project restored.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
