'use strict';

const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');

router.post('/trigger', protect, async (req, res) => {
  const { event, targetUrl, payload } = req.body;
  console.log(`🔗 [Webhook Outgoing] Sending event ${event} to ${targetUrl}`);
  res.json({ success: true, message: 'Webhook queued.' });
});

module.exports = router;
