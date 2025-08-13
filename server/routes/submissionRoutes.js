// routes/submissionRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// POST a new submission
router.post('/', async (req, res) => {
  try {
    const { round, player, country, tariffs } = req.body;
    await query(
      'INSERT INTO submissions (round, player, country, tariffs) VALUES ($1, $2, $3, $4)',
      [round, player, country, tariffs || null]
    );
    res.status(201).json({ message: 'Submission saved' });
  } catch (err) {
    console.error('Error saving submission:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// GET all submissions (with optional query filtering)
router.get('/', async (req, res) => {
  const { round, player, country } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;
  if (round) { conditions.push(`round = $${idx++}`); params.push(round); }
  if (player) { conditions.push(`player = $${idx++}`); params.push(player); }
  if (country) { conditions.push(`country = $${idx++}`); params.push(country); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await query(`SELECT * FROM submissions ${where} ORDER BY round ASC`, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

module.exports = router;
