const express = require('express');
const aiController = require('../controllers/ai.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET  /api/ai/settings  – return current provider setting (key masked)
router.get('/settings', (req, res, next) => aiController.getSettings(req, res, next));

// PUT  /api/ai/settings  – save provider + key
router.put('/settings', (req, res, next) => aiController.updateSettings(req, res, next));

module.exports = router;
