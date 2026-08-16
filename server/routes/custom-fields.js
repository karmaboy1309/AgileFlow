const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CustomField = require('../models/CustomField');

// ─── GET /api/custom-fields?projectId= ───────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: 'projectId is required' });
    const fields = await CustomField.find({ project: projectId, isArchived: false })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();
    res.json({ fields });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/custom-fields ──────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { project, name, key, fieldType, description, options, isRequired, displayOrder, defaultValue, validation } = req.body;
    if (!project || !name || !key || !fieldType) {
      return res.status(400).json({ message: 'project, name, key, and fieldType are required' });
    }
    const field = await CustomField.create({
      project, name, key: key.toLowerCase(), fieldType, description,
      options: options || [], isRequired: isRequired ?? false,
      displayOrder: displayOrder ?? 0, defaultValue, validation,
      createdBy: req.user.id,
    });
    res.status(201).json({ field });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A field with this key already exists in this project' });
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/custom-fields/:id ───────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const allowed = ['name', 'description', 'options', 'isRequired', 'displayOrder', 'displayInList', 'isSearchable', 'defaultValue', 'validation'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const field = await CustomField.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!field) return res.status(404).json({ message: 'Custom field not found' });
    res.json({ field });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/custom-fields/:id ────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const field = await CustomField.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
    if (!field) return res.status(404).json({ message: 'Custom field not found' });
    res.json({ message: 'Custom field archived', field });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/custom-fields/reorder ──────────────────────────────────────────
router.put('/reorder', auth, async (req, res) => {
  try {
    const { order } = req.body; // [{ id, displayOrder }]
    if (!Array.isArray(order)) return res.status(400).json({ message: 'order array is required' });
    await Promise.all(order.map(({ id, displayOrder }) =>
      CustomField.findByIdAndUpdate(id, { displayOrder })
    ));
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
