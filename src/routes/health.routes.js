const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting, 0 = disconnected
  const isDbReady = dbState === 1;

  if (isDbReady) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(503).json({
    status: 'not_ready',
    database: dbState === 2 ? 'connecting' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
