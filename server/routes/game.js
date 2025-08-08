// routes/game.js
const express = require('express');
const router = express.Router();
const supabase = require('../db'); // your initialized Supabase client
const { authenticate, authorizeRole } = require('../middleware/auth'); // middleware to verify token & roles

// Create a new game (operator only)
router.post('/create', authenticate, authorizeRole('operator'), async (req, res) => {
  const { totalRounds = 5 } = req.body;

  try {
    // Generate production & demand data here or in separate service (simplified)
    // For now, just placeholders
    const production = generateProductionData();
    const demand = generateDemandData();

    const { data: game, error } = await supabase
      .from('games')
      .insert([{
        total_rounds: totalRounds,
        status: 'waiting',
        production,
        demand,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ game });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Start a game (operator only)
router.post('/:gameId/start', authenticate, authorizeRole('operator'), async (req, res) => {
  const { gameId } = req.params;

  try {
    // Check player count logic here (ensure 5 players connected)
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_online', true);

    if (playersError) throw playersError;
    if (!players || players.length < 5) {
      return res.status(400).json({ error: 'Need 5 players online to start the game' });
    }

    const { error } = await supabase
      .from('games')
      .update({ status: 'active', current_round: 1 })
      .eq('id', gameId);

    if (error) throw error;

    res.json({ message: 'Game started', currentRound: 1 });
  } catch (err) {
    console.error('Start game error:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Submit tariff changes (player only)
router.post('/tariffs/submit', authenticate, authorizeRole('player'), async (req, res) => {
  const { gameId, roundNumber, tariffChanges } = req.body;
  const userId = req.user.id;

  try {
    if (!gameId || !roundNumber || !Array.isArray(tariffChanges)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Validate tariffs here (e.g. rate 0-100, user owns product)
    const results = [];

    for (const change of tariffChanges) {
      const { product, toCountry, rate } = change;

      if (rate < 0 || rate > 100) {
        results.push({ product, toCountry, error: 'Tariff rate must be between 0 and 100' });
        continue;
      }

      // Verify user’s country produces the product
      const { data: userProfile } = await supabase
        .from('users')
        .select('country')
        .eq('id', userId)
        .single();

      const userCountry = userProfile.country;

      const { data: productionRecord } = await supabase
        .from('production')
        .select('*')
        .eq('country', userCountry)
        .eq('product', product)
        .single();

      if (!productionRecord) {
        results.push({ product, toCountry, error: `You do not produce ${product}` });
        continue;
      }

      // Upsert tariff record
      const { error: upsertError } = await supabase
        .from('tariffs')
        .upsert({
          game_id: gameId,
          round_number: roundNumber,
          product,
          from_country: userCountry,
          to_country: toCountry,
          rate,
          updated_by: userId,
          updated_at: new Date().toISOString()
        }, { onConflict: ['game_id', 'round_number', 'product', 'from_country', 'to_country'] });

      if (upsertError) {
        results.push({ product, toCountry, error: upsertError.message });
      } else {
        results.push({ product, toCountry, success: true });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('Submit tariffs error:', err);
    res.status(500).json({ error: 'Failed to submit tariffs' });
  }
});

// More routes here: next-round, end, reset, get game data, tariff history, etc.

// Export router
module.exports = router;


// Helper example for generating production/demand — should be your real logic!
function generateProductionData() {
  // Example: randomly assign 2-3 products per country, total 100 units each product
  return [];
}

function generateDemandData() {
  return [];
}
