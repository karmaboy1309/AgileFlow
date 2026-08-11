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

// Helper to check if adding sourceTaskId -> targetTaskId would introduce a cycle
async function wouldCreateCycle(sourceId, targetId) {
  const visited = new Set();
  const queue = [targetId.toString()];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === sourceId.toString()) {
      return true; // A path exists from target back to source, adding source -> target creates a cycle
    }
    if (visited.has(current)) continue;
    visited.add(current);

    // Query for all outgoing 'blocks' relations from the current node
    const outgoingLinks = await IssueLink.find({
      sourceTaskId: current,
      relationship: 'blocks',
    });

    for (const link of outgoingLinks) {
      const nextId = link.targetTaskId.toString();
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }
  return false;
}

// POST /api/links
router.post('/', async (req, res, next) => {
  try {
    const { sourceTaskId, targetTaskId, relationship = 'relates_to' } = req.body;
    if (!sourceTaskId || !targetTaskId) {
      return res.status(400).json({ message: 'sourceTaskId and targetTaskId are required.' });
    }
    if (sourceTaskId === targetTaskId) {
      return res.status(400).json({ message: 'Cannot link an issue to itself.' });
    }

    if (relationship === 'blocks') {
      const isCircular = await wouldCreateCycle(sourceTaskId, targetTaskId);
      if (isCircular) {
        return res.status(400).json({
          message: 'Circular dependency detected. Creating this link would cause issues to block each other.',
        });
      }
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
