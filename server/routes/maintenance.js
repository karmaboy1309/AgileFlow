const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const os = require('os');

// GET /api/maintenance/system-health
router.get('/system-health', auth, async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    
    res.json({
      uptime: process.uptime(),
      memory: {
        rss: parseFloat((memUsage.rss / 1024 / 1024).toFixed(1)), // MB
        heapTotal: parseFloat((memUsage.heapTotal / 1024 / 1024).toFixed(1)),
        heapUsed: parseFloat((memUsage.heapUsed / 1024 / 1024).toFixed(1)),
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        freeMem: parseFloat((os.freemem() / 1024 / 1024 / 1024).toFixed(1)), // GB
        totalMem: parseFloat((os.totalmem() / 1024 / 1024 / 1024).toFixed(1)),
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: mongoose.connection.name,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
