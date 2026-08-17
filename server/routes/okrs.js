const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const OKR = require('../models/OKR');

// GET /api/okrs
router.get('/', auth, async (req, res) => {
  try {
    const { projectId, quarter } = req.query;
    const query = {};
    if (projectId) query.project = projectId;
    if (quarter) query.quarter = quarter;
    
    const okrs = await OKR.find(query)
      .populate('owner', 'name email avatarColor')
      .populate('keyResults.owner', 'name email avatarColor')
      .populate('parentOkr', 'objective')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
      
    res.json({ okrs });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/okrs
router.post('/', auth, async (req, res) => {
  try {
    const { project, objective, description, quarter, type, parentOkr, keyResults } = req.body;
    if (!objective?.trim()) return res.status(400).json({ message: 'Objective is required' });
    
    const okr = await OKR.create({
      project, objective, description, quarter, type, parentOkr: parentOkr || null,
      keyResults: keyResults || [], owner: req.user.id,
      status: 'draft',
    });
    
    res.status(201).json({ okr });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/okrs/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const okr = await OKR.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!okr) return res.status(404).json({ message: 'OKR not found' });
    res.json({ okr });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/okrs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await OKR.findByIdAndDelete(req.params.id);
    res.json({ message: 'OKR deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/okrs/:id/key-results/:krId/update
router.post('/:id/key-results/:krId/update', auth, async (req, res) => {
  try {
    const { value, note } = req.body;
    if (value === undefined) return res.status(400).json({ message: 'Value is required' });
    
    const okr = await OKR.findById(req.params.id);
    if (!okr) return res.status(404).json({ message: 'OKR not found' });
    
    const kr = okr.keyResults.id(req.params.krId);
    if (!kr) return res.status(404).json({ message: 'Key Result not found' });
    
    kr.currentValue = value;
    kr.lastUpdated = new Date();
    kr.updateHistory.push({ value, note, updatedAt: new Date() });
    
    await okr.save();
    res.json({ okr });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
