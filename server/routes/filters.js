'use strict';

/**
 * routes/filters.js
 *
 * REST API routes for Saved Filters & JQL Query Presets.
 */

const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const SavedFilter = require('../models/SavedFilter');

// All routes require JWT authentication
router.use(authGuard);

// GET /api/filters?projectId=...
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = { userId: req.userId };
    if (projectId) filter.projectId = projectId;

    const filters = await SavedFilter.find(filter).sort({ isFavorite: -1, updatedAt: -1 });
    res.json(filters);
  } catch (error) {
    console.error('Error in GET /api/filters:', error);
    res.status(500).json({ error: 'Failed to fetch saved filters.' });
  }
});

// POST /api/filters
router.post('/', async (req, res) => {
  try {
    const { name, description, projectId, filterState, isFavorite } = req.body;
    if (!name || !filterState) {
      return res.status(400).json({ error: 'Filter name and filterState are required.' });
    }

    const savedFilter = await SavedFilter.create({
      name,
      description: description || '',
      projectId: projectId || null,
      userId: req.userId,
      filterState,
      isFavorite: Boolean(isFavorite),
    });

    res.status(201).json(savedFilter);
  } catch (error) {
    console.error('Error in POST /api/filters:', error);
    res.status(500).json({ error: 'Failed to create saved filter.' });
  }
});

// DELETE /api/filters/:id
router.delete('/:id', async (req, res) => {
  try {
    const savedFilter = await SavedFilter.findOne({ _id: req.params.id, userId: req.userId });
    if (!savedFilter) {
      return res.status(404).json({ error: 'Saved filter not found.' });
    }

    await savedFilter.deleteOne();
    res.json({ message: 'Saved filter deleted.' });
  } catch (error) {
    console.error('Error in DELETE /api/filters/:id:', error);
    res.status(500).json({ error: 'Failed to delete filter.' });
  }
});

module.exports = router;
