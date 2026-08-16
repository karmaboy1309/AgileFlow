const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Integration = require('../models/Integration');
const https = require('https');
const http = require('http');

// ─── GET /api/integrations?projectId= ────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: 'projectId is required' });
    const integrations = await Integration.find({ project: projectId })
      .sort({ createdAt: -1 })
      .lean();
    // Mask secrets from response
    integrations.forEach(i => { if (i.secret) i.secret = '***'; if (i.oauthToken) i.oauthToken = '***'; });
    res.json({ integrations });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/integrations ───────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { project, name, type, url, method, secret, headers, events } = req.body;
    if (!project || !name || !type) {
      return res.status(400).json({ message: 'project, name, and type are required' });
    }
    const integration = await Integration.create({
      project, name, type, url, method, secret, headers,
      events: events || [], createdBy: req.user.id,
    });
    res.status(201).json({ integration: { ...integration.toJSON(), secret: secret ? '***' : undefined } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/integrations/:id ────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const integration = await Integration.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    res.json({ integration });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/integrations/:id ─────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Integration.findByIdAndDelete(req.params.id);
    res.json({ message: 'Integration deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/integrations/:id/test ─────────────────────────────────────────
// Send a test payload to the webhook URL and record delivery result
router.post('/:id/test', auth, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    if (!integration.url) return res.status(400).json({ message: 'No URL configured for this integration' });

    const payload = JSON.stringify({
      event: 'test',
      source: 'agileflow',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test payload from AgileFlow' },
    });

    const startTime = Date.now();
    const urlObj = new URL(integration.url);
    const lib = urlObj.protocol === 'https:' ? https : http;

    const testResult = await new Promise((resolve) => {
      const req = lib.request({
        hostname: urlObj.hostname, port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search, method: integration.method || 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'X-AgileFlow-Event': 'test', 'User-Agent': 'AgileFlow/1.0' },
        timeout: 10000,
      }, (response) => {
        resolve({ statusCode: response.statusCode, responseMs: Date.now() - startTime, success: response.statusCode >= 200 && response.statusCode < 300 });
      });
      req.on('error', (err) => resolve({ statusCode: 0, responseMs: Date.now() - startTime, success: false, error: err.message }));
      req.on('timeout', () => resolve({ statusCode: 0, responseMs: Date.now() - startTime, success: false, error: 'Request timed out' }));
      req.write(payload);
      req.end();
    });

    // Update last delivery
    integration.lastDelivery = { timestamp: new Date(), ...testResult };
    integration.deliveryCount++;
    if (!testResult.success) integration.failureCount++;
    await integration.save();

    res.json({ result: testResult, message: testResult.success ? 'Webhook test successful' : `Webhook test failed (${testResult.statusCode || testResult.error})` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
