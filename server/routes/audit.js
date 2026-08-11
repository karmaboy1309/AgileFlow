'use strict';

const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const protect = require('../middleware/auth');

router.get('/', protect, async (req, res, next) => {
  try {
    const { action, actor, targetType, targetId, startDate, endDate, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (actor) filter.actor = new RegExp(actor, 'i');
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
    const skipNum = Math.max(parseInt(skip, 10) || 0, 0);

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      totalCount,
      limit: limitNum,
      skip: skipNum,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
