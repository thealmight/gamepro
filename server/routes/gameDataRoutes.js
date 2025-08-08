const express = require('express');
const router = express.Router();
const supabase = require('../db'); // Your db export: const supabase = createClient(...)

// Operator: Get ALL production & demand for a game
router.get('/game/:gameId/all-data', async (req, res) => {
  const { gameId } = req.params;
  try {
    const { data: production, error: prodError } = await supabase
      .from('production')
      .select('*')
      .eq('game_id', gameId);
    const { data: demand, error: demError } = await supabase
      .from('demand')
      .select('*')
      .eq('game_id', gameId);

    if (prodError || demError) {
      return res.status(500).json({ error: prodError?.message || demError?.message });
    }
    res.json({ production, demand });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all game data' });
  }
});

// Player: Get their country's production & demand for a game
router.get('/game/:gameId/:country', async (req, res) => {
  const { gameId, country } = req.params;
  try {
    const { data: production, error: prodError } = await supabase
      .from('production')
      .select('*')
      .eq('game_id', gameId)
      .eq('country', country)
      .single();
    const { data: demand, error: demError } = await supabase
      .from('demand')
      .select('*')
      .eq('game_id', gameId)
      .eq('country', country)
      .single();

    if (prodError || demError) {
      return res.status(500).json({ error: prodError?.message || demError?.message });
    }
    res.json({ production, demand });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

module.exports = router;
