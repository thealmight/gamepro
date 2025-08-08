// controllers/gameController.js

const supabase = require('../db');
const { updatePlayerRound } = require('../services/updatePlayerRound');

const COUNTRIES = ['USA', 'China', 'Germany', 'Japan', 'India'];
const PRODUCTS = ['Steel', 'Grain', 'Oil', 'Electronics', 'Textiles'];

// --- Auth helper ---
async function getSupabaseProfile(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  return profile || null;
}

// --- Create Game ---
exports.createGame = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (profile.role !== 'operator')
      return res.status(403).json({ error: 'Only the operator can create games.' });

    const { totalRounds = 5 } = req.body;
    const { data: game, error } = await supabase
      .from('games')
      .insert([{ total_rounds: totalRounds, operator_id: profile.id, status: 'waiting' }])
      .select()
      .single();
    if (error || !game) throw error;

    await initializeGameData(game.id);
    res.json({
      success: true,
      game: {
        id: game.id,
        totalRounds: game.total_rounds,
        currentRound: game.current_round,
        status: game.status
      }
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

// --- Initialize Game Data ---
async function initializeGameData(gameId) {
  for (const product of PRODUCTS) {
    const shuffled = [...COUNTRIES].sort(() => Math.random() - 0.5);
    const productionCountries = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
    const demandCountries = shuffled.filter(c => !productionCountries.includes(c));

    // --- Production (sum = 100) ---
    let remainingProduction = 100;
    for (let i = 0; i < productionCountries.length; i++) {
      let quantity = (i === productionCountries.length - 1)
        ? remainingProduction
        : Math.max(20, Math.min(50, Math.floor(Math.random() * 31) + 20));
      if (i !== productionCountries.length - 1 && quantity > remainingProduction - 20)
        quantity = remainingProduction - 20;
      await supabase.from('production').insert([{ game_id: gameId, country: productionCountries[i], product, quantity }]);
      remainingProduction -= quantity;
    }

    // --- Demand (sum = 100) ---
    let remainingDemand = 100;
    for (let i = 0; i < demandCountries.length; i++) {
      let quantity = (i === demandCountries.length - 1)
        ? remainingDemand
        : Math.max(15, Math.min(40, Math.floor(Math.random() * 26) + 15));
      if (i !== demandCountries.length - 1 && quantity > remainingDemand - 15)
        quantity = remainingDemand - 15;
      await supabase.from('demand').insert([{ game_id: gameId, country: demandCountries[i], product, quantity }]);
      remainingDemand -= quantity;
    }

    // --- Tariffs ---
    for (const fromCountry of productionCountries) {
      for (const toCountry of demandCountries) {
        const rate = fromCountry === toCountry ? 0 : Math.floor(Math.random() * 101);
        await supabase.from('tariff_rates').insert([{
          game_id: gameId,
          round_number: 0,
          product,
          from_country: fromCountry,
          to_country: toCountry,
          rate
        }]);
      }
    }
  }
}

// --- Start Game ---
exports.startGame = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (error || !game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can start the game' });

    // Count online players
    const { count: onlinePlayers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'player')
      .eq('is_online', true);

    if (onlinePlayers < 5)
      return res.status(400).json({ error: `Need 5 players online, currently have ${onlinePlayers}` });

    await supabase.from('games').update({
      status: 'active',
      current_round: 1,
      started_at: new Date().toISOString()
    }).eq('id', gameId);

    await supabase.from('game_rounds').insert([{
      game_id: gameId,
      round_number: 1,
      start_time: new Date().toISOString(),
      status: 'active'
    }]);

    res.json({
      success: true,
      message: 'Game started successfully',
      game: { id: game.id, currentRound: 1, status: 'active' }
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
};

// --- Start Next Round ---
exports.startNextRound = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (error || !game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can control rounds' });
    if (game.current_round >= game.total_rounds)
      return res.status(400).json({ error: 'Game has already ended' });

    await supabase.from('game_rounds').update({
      status: 'completed',
      end_time: new Date().toISOString()
    }).eq('game_id', gameId).eq('round_number', game.current_round);

    const nextRound = game.current_round + 1;
    await supabase.from('games').update({ current_round: nextRound }).eq('id', gameId);

    await supabase.from('game_rounds').insert([{
      game_id: gameId,
      round_number: nextRound,
      start_time: new Date().toISOString(),
      status: 'active'
    }]);

    res.json({
      success: true,
      message: `Round ${nextRound} started`,
      currentRound: nextRound
    });
  } catch (error) {
    console.error('Start next round error:', error);
    res.status(500).json({ error: 'Failed to start next round' });
  }
};

// --- End Game ---
exports.endGame = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (error || !game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can end the game' });

    await supabase.from('game_rounds').update({
      status: 'completed',
      end_time: new Date().toISOString()
    }).eq('game_id', gameId).eq('status', 'active');

    await supabase.from('games').update({
      status: 'ended',
      ended_at: new Date().toISOString()
    }).eq('id', gameId);

    res.json({ success: true, message: 'Game ended successfully' });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
};

// --- Get Game Data for Operator ---
exports.getGameData = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (error || !game) return res.status(404).json({ error: 'Game not found' });

    const { data: production } = await supabase.from('production').select('*').eq('game_id', gameId);
    const { data: demand } = await supabase.from('demand').select('*').eq('game_id', gameId);
    const { data: tariffRates } = await supabase.from('tariff_rates').select('*').eq('game_id', gameId);
    const { data: rounds } = await supabase.from('game_rounds').select('*').eq('game_id', gameId);

    res.json({
      game: {
        id: game.id,
        totalRounds: game.total_rounds,
        currentRound: game.current_round,
        status: game.status,
        production,
        demand,
        tariffRates,
        rounds
      }
    });
  } catch (error) {
    console.error('Get game data error:', error);
    res.status(500).json({ error: 'Failed to get game data' });
  }
};

// --- Get Player-Specific Game Data ---
exports.getPlayerGameData = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    const playerCountry = profile.country;
    if (!playerCountry) return res.status(400).json({ error: 'Player country not assigned' });

    const { gameId } = req.params;

    const { data: production } = await supabase.from('production')
      .select('*').eq('game_id', gameId).eq('country', playerCountry);
    const { data: demand } = await supabase.from('demand')
      .select('*').eq('game_id', gameId).eq('country', playerCountry);

    const demandedProducts = (demand || []).map(d => d.product);
    let tariffRates = [];
    if (demandedProducts.length) {
      const roundLimit = req.query.currentRound || 0;
      const { data: tariffs } = await supabase.from('tariff_rates')
        .select('*')
        .eq('game_id', gameId)
        .in('product', demandedProducts)
        .lte('round_number', roundLimit)
        .order('round_number', { ascending: false });
      tariffRates = tariffs || [];
    }

    res.json({
      country: playerCountry,
      production,
      demand,
      tariffRates
    });
  } catch (error) {
    console.error('Get player game data error:', error);
    res.status(500).json({ error: 'Failed to get player game data' });
  }
};

// --- Reset Game ---
exports.resetGame = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (error || !game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can reset the game' });

    await supabase.from('production').delete().eq('game_id', gameId);
    await supabase.from('demand').delete().eq('game_id', gameId);
    await supabase.from('tariff_rates').delete().eq('game_id', gameId);
    await supabase.from('game_rounds').delete().eq('game_id', gameId);

    await supabase.from('games').update({
      current_round: 0,
      status: 'waiting',
      started_at: null,
      ended_at: null
    }).eq('id', gameId);

    await initializeGameData(gameId);

    res.json({ success: true, message: 'Game reset successfully' });
  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ error: 'Failed to reset game' });
  }
};
