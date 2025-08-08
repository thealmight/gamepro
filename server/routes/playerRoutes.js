const express = require('express');
const router = express.Router();
const supabase = require('../db'); // your Supabase client

// GET all unique players from 'submissions' table
router.get('/', async (req, res) => {
  try {
    // Fetch all unique players
    const { data, error } = await supabase
      .from('submissions') // or your correct table name
      .select('player')
      .neq('player', null)
      .order('player', { ascending: true });

    if (error) throw error;

    // Get unique names
    const playerNames = [...new Set((data || []).map(p => p.player))];

    res.json(playerNames);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

module.exports = router;
