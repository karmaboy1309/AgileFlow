const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attachment = require('../models/Attachment');

// GET /api/attachments/:entityType/:entityId
router.get('/:entityType/:entityId', auth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const attachments = await Attachment.find({ entityType, entityId, isDeleted: false })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ attachments });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attachments
router.post('/', auth, async (req, res) => {
  try {
    const { entityType, entityId, filename, originalName, mimeType, size, storageKey, url } = req.body;
    if (!entityType || !entityId || !filename || !mimeType || !size || !storageKey) {
      return res.status(400).json({ message: 'Missing required attachment fields' });
    }
    
    const attachment = await Attachment.create({
      entityType, entityId, filename, originalName: originalName || filename,
      mimeType, size, storageKey, url, uploadedBy: req.user.id,
      scanStatus: 'clean',
    });
    
    res.status(201).json({ attachment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/attachments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    if (attachment.uploadedBy.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    
    attachment.isDeleted = true;
    await attachment.save();
    res.json({ message: 'Attachment removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
