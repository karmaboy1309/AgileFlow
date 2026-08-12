'use strict';

/**
 * routes/releases.js
 *
 * REST API routes for Project Fix Versions & Releases.
 */

const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const Release = require('../models/Release');
const Task = require('../models/Task');

// All routes require JWT auth
router.use(authGuard);

// GET /api/releases?projectId=...
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = { user: req.user.id };
    if (projectId) filter.projectId = projectId;

    const releases = await Release.find(filter).sort({ releaseDate: 1, createdAt: -1 });

    // Compute progress stats for each release
    const releaseIds = releases.map(r => r._id);
    const tasks = await Task.find({ fixVersionId: { $in: releaseIds } });

    const releasesWithStats = releases.map(rel => {
      const relTasks = tasks.filter(t => t.fixVersionId && t.fixVersionId.toString() === rel._id.toString());
      const totalTasks = relTasks.length;
      const completedTasks = relTasks.filter(t => t.status === 'done').length;
      const totalPoints = relTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = relTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        ...rel.toObject(),
        totalTasks,
        completedTasks,
        totalPoints,
        completedPoints,
      };
    });

    res.json(releasesWithStats);
  } catch (error) {
    console.error('Error in GET /api/releases:', error);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// POST /api/releases
router.post('/', async (req, res) => {
  try {
    const { name, description, projectId, startDate, releaseDate } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ error: 'Name and projectId are required.' });
    }

    const release = new Release({
      name,
      description,
      projectId,
      startDate: startDate || null,
      releaseDate: releaseDate || null,
      user: req.user.id,
    });

    await release.save();
    res.status(201).json(release);
  } catch (error) {
    console.error('Error in POST /api/releases:', error);
    res.status(500).json({ error: 'Failed to create release' });
  }
});

// PUT /api/releases/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, startDate, releaseDate, status } = req.body;
    const release = await Release.findOne({ _id: req.params.id, user: req.user.id });
    if (!release) return res.status(404).json({ error: 'Release not found.' });

    if (name !== undefined) release.name = name;
    if (description !== undefined) release.description = description;
    if (startDate !== undefined) release.startDate = startDate;
    if (releaseDate !== undefined) release.releaseDate = releaseDate;
    if (status !== undefined) release.status = status;

    await release.save();
    res.json(release);
  } catch (error) {
    console.error('Error in PUT /api/releases/:id:', error);
    res.status(500).json({ error: 'Failed to update release' });
  }
});

// POST /api/releases/:id/release
router.post('/:id/release', async (req, res) => {
  try {
    const release = await Release.findOne({ _id: req.params.id, user: req.user.id });
    if (!release) return res.status(404).json({ error: 'Release not found.' });

    release.status = 'Released';
    if (!release.releaseDate) release.releaseDate = new Date();
    await release.save();

    res.json(release);
  } catch (error) {
    console.error('Error in POST /api/releases/:id/release:', error);
    res.status(500).json({ error: 'Failed to mark release as completed' });
  }
});

// DELETE /api/releases/:id
router.delete('/:id', async (req, res) => {
  try {
    const release = await Release.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!release) return res.status(404).json({ error: 'Release not found.' });

    // Unlink tasks assigned to this fix version
    await Task.updateMany({ fixVersionId: release._id }, { $set: { fixVersionId: null } });

    res.json({ message: 'Release deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/releases/:id:', error);
    res.status(500).json({ error: 'Failed to delete release' });
  }
});

module.exports = router;
