// ─── server/utils/webhookDispatcher.js ───────────────────────────────────────
// Listens to the event bus and dispatches webhook payloads to registered
// integrations. Handles retry logic and delivery tracking.

'use strict';

const https = require('https');
const http  = require('http');
const crypto = require('crypto');
const eventBus = require('./eventBus');
const Integration = require('../models/Integration');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 5000, 15000]; // Exponential backoff

function hmacSignature(secret, payload) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function deliverWebhook(integration, event) {
  const payload = JSON.stringify({
    event: event.eventName,
    source: 'agileflow',
    timestamp: event.timestamp,
    data: event,
  });

  const urlObj = new URL(integration.url);
  const lib    = urlObj.protocol === 'https:' ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'X-AgileFlow-Event': event.eventName,
    'X-AgileFlow-Delivery': crypto.randomUUID(),
    'User-Agent': 'AgileFlow-Webhook/1.0',
  };

  if (integration.secret) {
    headers['X-AgileFlow-Signature'] = hmacSignature(integration.secret, payload);
  }

  // Add custom headers
  if (integration.headers) {
    for (const [k, v] of integration.headers.entries?.() || Object.entries(integration.headers)) {
      headers[k] = v;
    }
  }

  const startMs = Date.now();
  return new Promise((resolve) => {
    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: integration.method || 'POST',
      headers,
      timeout: 10000,
    }, (res) => {
      resolve({ statusCode: res.statusCode, responseMs: Date.now() - startMs, success: res.statusCode >= 200 && res.statusCode < 300 });
    });
    req.on('error', (err) => resolve({ statusCode: 0, responseMs: Date.now() - startMs, success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, responseMs: Date.now() - startMs, success: false, error: 'Timeout' }); });
    req.write(payload);
    req.end();
  });
}

async function dispatchEvent(event) {
  try {
    const integrations = await Integration.find({
      isActive: true,
      events: event.eventName,
    }).lean();

    for (const intg of integrations) {
      if (!intg.url) continue;

      let result = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAY_MS[attempt - 1]));
        result = await deliverWebhook(intg, event);
        if (result.success) break;
      }

      // Update delivery stats
      await Integration.findByIdAndUpdate(intg._id, {
        lastDelivery: { timestamp: new Date(), ...result },
        $inc: { deliveryCount: 1, ...(result?.success ? {} : { failureCount: 1 }) },
      });

      if (!result?.success) {
        console.warn(`[WebhookDispatcher] ⚠ Delivery failed for integration "${intg.name}": ${result?.error || result?.statusCode}`);
      }
    }
  } catch (err) {
    console.error('[WebhookDispatcher] Error dispatching event:', err.message);
  }
}

// ── Initialize: subscribe to all domain events ─────────────────────────────────
function initWebhookDispatcher() {
  eventBus.subscribeAll(async (event) => {
    if (event.eventName === '*') return;
    await dispatchEvent(event);
  });
  console.log('🔌  WebhookDispatcher initialized');
}

module.exports = { initWebhookDispatcher, deliverWebhook };
