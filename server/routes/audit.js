'use strict';

const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const protect = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  res.json({ logs });
});

module.exports = router;
