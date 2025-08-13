const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Operator: Get ALL production & demand for a game
router.get('/game/:gameId/all-data', async (req, res) => {
  const { gameId } = req.params;
  try {
    const production = (await query('SELECT * FROM production WHERE game_id = $1', [gameId])).rows;
    const demand = (await query('SELECT * FROM demand WHERE game_id = $1', [gameId])).rows;
    res.json({ production, demand });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all game data' });
  }
});

// Player: Get their country's production & demand for a game
router.get('/game/:gameId/:country', async (req, res) => {
  const { gameId, country } = req.params;
  try {
    const production = (await query('SELECT * FROM production WHERE game_id = $1 AND country = $2', [gameId, country])).rows[0] || null;
    const demand = (await query('SELECT * FROM demand WHERE game_id = $1 AND country = $2', [gameId, country])).rows[0] || null;
    res.json({ production, demand });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

module.exports = router;
