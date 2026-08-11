'use strict';

const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');

const crypto = require('crypto');

router.post('/trigger', protect, async (req, res) => {
  try {
    const { event, targetUrl, payload, secret } = req.body;
    if (!event || !targetUrl) {
      return res.status(400).json({ message: 'event and targetUrl are required.' });
    }

    const serializedPayload = JSON.stringify(payload || {});
    let signature = '';

    if (secret) {
      signature = crypto
        .createHmac('sha256', secret)
        .update(serializedPayload)
        .digest('hex');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-AgileFlow-Event': event,
    };

    if (signature) {
      headers['X-Hub-Signature-256'] = `sha256=${signature}`;
    }

    // Fire-and-forget background request using native fetch
    fetch(targetUrl, {
      method: 'POST',
      headers,
      body: serializedPayload,
    })
      .then(response => {
        console.log(`🔗 [Webhook Outgoing] Event "${event}" dispatched to ${targetUrl}. Status: ${response.status}`);
      })
      .catch(err => {
        console.error(`❗ [Webhook Outgoing] Failed for ${targetUrl}: ${err.message}`);
      });

    res.json({
      success: true,
      message: 'Webhook dispatch initiated in background.',
      signature: signature || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal error trigger webhook', error: err.message });
  }
});

module.exports = router;
