const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET all unique players from 'submissions' table
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT DISTINCT player FROM submissions WHERE player IS NOT NULL ORDER BY player ASC');
    const playerNames = rows.map(r => r.player);
    res.json(playerNames);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

module.exports = router;
