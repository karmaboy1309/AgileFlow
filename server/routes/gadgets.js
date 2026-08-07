'use strict';

const express = require('express');
const router = express.Router();
const Gadget = require('../models/Gadget');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/gadgets
router.get('/', async (req, res, next) => {
  try {
    const gadgets = await Gadget.find({ createdBy: req.user.id }).sort({ orderIndex: 1, createdAt: -1 });
    res.json({ gadgets });
  } catch (err) {
    next(err);
  }
});

// POST /api/gadgets
router.post('/', async (req, res, next) => {
  try {
    const { title, gadgetType, config, orderIndex } = req.body;
    if (!title || !gadgetType) {
      return res.status(400).json({ message: 'Gadget title and gadgetType are required.' });
    }

    const gadget = await Gadget.create({
      title: title.trim(),
      gadgetType,
      config: config || {},
      orderIndex: orderIndex || 0,
      createdBy: req.user.id,
    });

    res.status(201).json({ gadget });
  } catch (err) {
    next(err);
  }
});

// PUT /api/gadgets/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { title, config, orderIndex } = req.body;
    const gadget = await Gadget.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { title, config, orderIndex },
      { new: true, runValidators: true }
    );
    if (!gadget) return res.status(404).json({ message: 'Gadget not found.' });
    res.json({ gadget });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/gadgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const gadget = await Gadget.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!gadget) return res.status(404).json({ message: 'Gadget not found.' });
    res.json({ message: 'Gadget deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
