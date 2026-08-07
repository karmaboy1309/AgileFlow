'use strict';

const express = require('express');
const router = express.Router();
const SavedFilter = require('../models/SavedFilter');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/filters
router.get('/', async (req, res, next) => {
  try {
    const filters = await SavedFilter.find({ createdBy: req.user.id }).sort({ isFavorite: -1, name: 1 });
    res.json({ filters });
  } catch (err) {
    next(err);
  }
});

// POST /api/filters
router.post('/', async (req, res, next) => {
  try {
    const { name, jql, description, isFavorite } = req.body;
    if (!name || !jql) {
      return res.status(400).json({ message: 'Filter name and JQL string are required.' });
    }

    const filter = await SavedFilter.create({
      name: name.trim(),
      jql: jql.trim(),
      description: description?.trim() || '',
      isFavorite: Boolean(isFavorite),
      createdBy: req.user.id,
    });

    res.status(201).json({ filter });
  } catch (err) {
    next(err);
  }
});

// PUT /api/filters/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, jql, description, isFavorite } = req.body;
    const filter = await SavedFilter.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { name, jql, description, isFavorite },
      { new: true, runValidators: true }
    );
    if (!filter) return res.status(404).json({ message: 'Filter not found.' });
    res.json({ filter });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/filters/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const filter = await SavedFilter.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!filter) return res.status(404).json({ message: 'Filter not found.' });
    res.json({ message: 'Filter deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
