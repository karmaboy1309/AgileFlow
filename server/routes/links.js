'use strict';

const express = require('express');
const router = express.Router();
const IssueLink = require('../models/IssueLink');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/tasks/:taskId/links
router.get('/tasks/:taskId/links', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const links = await IssueLink.find({
      $or: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
    })
      .populate('sourceTaskId', 'title issueKey issueType status')
      .populate('targetTaskId', 'title issueKey issueType status');

    res.json({ links });
  } catch (err) {
    next(err);
  }
});

// POST /api/links
router.post('/links', async (req, res, next) => {
  try {
    const { sourceTaskId, targetTaskId, relationship = 'relates_to' } = req.body;
    if (!sourceTaskId || !targetTaskId) {
      return res.status(400).json({ message: 'sourceTaskId and targetTaskId are required.' });
    }
    if (sourceTaskId === targetTaskId) {
      return res.status(400).json({ message: 'Cannot link an issue to itself.' });
    }

    const link = await IssueLink.create({
      sourceTaskId,
      targetTaskId,
      relationship,
      createdBy: req.user.id,
    });

    res.status(201).json({ link });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/links/:id
router.delete('/links/:id', async (req, res, next) => {
  try {
    const link = await IssueLink.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!link) return res.status(404).json({ message: 'Link not found.' });
    res.json({ message: 'Link removed.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
