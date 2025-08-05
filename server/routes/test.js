const express = require('express');
const router = express.Router();
const { updatePlayerRound } = require('../services/playerService');

router.post('/test-round', async (req, res) => {
  const { playerId, round } = req.body;
  const success = await updatePlayerRound(playerId, round);
  res.json({ success });
});

module.exports = router;
