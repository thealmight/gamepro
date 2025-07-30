const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// GET all unique players
router.get('/', async (req, res) => {
  try {
    const players = await Submission.findAll({
      attributes: ['player'],
      group: ['player'],
    });

    const playerNames = players.map(p => p.player);
    res.json(playerNames);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

module.exports = router;
