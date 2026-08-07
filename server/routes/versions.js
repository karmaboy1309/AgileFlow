'use strict';

const express = require('express');
const router = express.Router();
const Version = require('../models/Version');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/versions?projectId=...
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = { createdBy: req.user.id };
    if (projectId) filter.projectId = projectId;

    const versions = await Version.find(filter).sort({ releaseDate: 1, createdAt: -1 });
    
    // Attach issue counts per version
    const versionIds = versions.map(v => v._id);
    const tasks = await Task.find({ fixVersionId: { $in: versionIds } }).select('fixVersionId status');
    
    const result = versions.map(v => {
      const vTasks = tasks.filter(t => t.fixVersionId?.toString() === v._id.toString());
      const completedTasks = vTasks.filter(t => t.status === 'done').length;
      return {
        ...v.toJSON(),
        totalIssues: vTasks.length,
        completedIssues: completedTasks,
      };
    });

    res.json({ versions: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/versions
router.post('/', async (req, res, next) => {
  try {
    const { name, description, startDate, releaseDate, projectId } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ message: 'Version name and projectId are required.' });
    }

    const version = await Version.create({
      name: name.trim(),
      description: description?.trim() || '',
      startDate: startDate ? new Date(startDate) : null,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      projectId,
      createdBy: req.user.id,
    });

    res.status(201).json({ version });
  } catch (err) {
    next(err);
  }
});

// PUT /api/versions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, startDate, releaseDate, status } = req.body;
    const version = await Version.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { name, description, startDate, releaseDate, status },
      { new: true, runValidators: true }
    );
    if (!version) return res.status(404).json({ message: 'Version not found.' });
    res.json({ version });
  } catch (err) {
    next(err);
  }
});

// POST /api/versions/:id/release - Mark version as released
router.post('/:id/release', async (req, res, next) => {
  try {
    const version = await Version.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { status: 'released', releaseDate: new Date() },
      { new: true }
    );
    if (!version) return res.status(404).json({ message: 'Version not found.' });
    res.json({ version, message: `Version "${version.name}" released! 🚀` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/versions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const version = await Version.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!version) return res.status(404).json({ message: 'Version not found.' });
    
    // Unassign fixVersion from tasks
    await Task.updateMany({ fixVersionId: req.params.id }, { $set: { fixVersionId: null } });
    
    res.json({ message: 'Version deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
