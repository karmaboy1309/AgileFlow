'use strict';

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const protect = require('../middleware/auth');

router.use(protect);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'name email avatarColor')
      .populate('taskId', 'title issueKey issueType')
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id }, { $set: { isRead: true } });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
