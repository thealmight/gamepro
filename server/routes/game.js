// routes/game.js
const express = require('express');
const router = express.Router();

// NOTE: This file contains placeholder routes and legacy examples. Real game routes are in gameRoutes.js.

router.get('/placeholder', (_req, res) => {
  res.json({ message: 'Use /api/game endpoints defined in gameRoutes.js' });
});

module.exports = router;
