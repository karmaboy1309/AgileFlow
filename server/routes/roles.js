'use strict';

const express = require('express');
const router = express.Router();
const ProjectRole = require('../models/ProjectRole');
const protect = require('../middleware/auth');

router.use(protect);

/**
 * @route GET /api/projects/:projectId/roles
 * @desc Retrieve all user roles mapped to a specific project with populated user details
 * @access Private
 */
router.get('/projects/:projectId/roles', async (req, res, next) => {
  try {
    const roles = await ProjectRole.find({ projectId: req.params.projectId })
      .populate('userId', 'name email avatarColor');
    res.json({ roles });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/projects/:projectId/roles
 * @desc Assign or update a user's project role (e.g. Owner, Admin, Member, Viewer)
 * @access Private
 */
router.post('/projects/:projectId/roles', async (req, res, next) => {
  try {
    const { userId, role = 'Member' } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const updatedRole = await ProjectRole.findOneAndUpdate(
      { projectId: req.params.projectId, userId },
      { role, createdBy: req.user.id },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ role: updatedRole });
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/projects/:projectId/roles/:userId
 * @desc Remove a user's role mapping from a specific project
 * @access Private
 */
router.delete('/projects/:projectId/roles/:userId', async (req, res, next) => {
  try {
    await ProjectRole.findOneAndDelete({ projectId: req.params.projectId, userId: req.params.userId });
    res.json({ message: 'User role removed from project.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
