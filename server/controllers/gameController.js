// controllers/gameController.js

const { query } = require('../db');

const COUNTRIES = ['USA', 'China', 'Germany', 'Japan', 'India'];
const PRODUCTS = ['Steel', 'Grain', 'Oil', 'Electronics', 'Textiles'];

// --- Create Game ---
exports.createGame = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (profile.role !== 'operator')
      return res.status(403).json({ error: 'Only the operator can create games.' });

    const { totalRounds = 5 } = req.body;

    const insertGame = await query(
      'INSERT INTO games (total_rounds, operator_id, status) VALUES ($1, $2, $3) RETURNING *',
      [totalRounds, profile.id, 'waiting']
    );
    const game = insertGame.rows[0];

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
      await query(
        'INSERT INTO production (game_id, country, product, quantity) VALUES ($1, $2, $3, $4)',
        [gameId, productionCountries[i], product, quantity]
      );
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
      await query(
        'INSERT INTO demand (game_id, country, product, quantity) VALUES ($1, $2, $3, $4)',
        [gameId, demandCountries[i], product, quantity]
      );
      remainingDemand -= quantity;
    }

    // --- Tariffs ---
    for (const fromCountry of productionCountries) {
      for (const toCountry of demandCountries) {
        const rate = fromCountry === toCountry ? 0 : Math.floor(Math.random() * 101);
        await query(
          'INSERT INTO tariff_rates (game_id, round_number, product, from_country, to_country, rate) VALUES ($1, $2, $3, $4, $5, $6)',
          [gameId, 0, product, fromCountry, toCountry, rate]
        );
      }
    }
  }
}

// --- Start Game ---
exports.startGame = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const gameRes = await query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = gameRes.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can start the game' });

    const countRes = await query("SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'player' AND is_online = TRUE");
    const onlinePlayers = countRes.rows[0]?.cnt || 0;
    if (onlinePlayers < 5)
      return res.status(400).json({ error: `Need 5 players online, currently have ${onlinePlayers}` });

    await query('UPDATE games SET status = $1, current_round = 1, started_at = NOW() WHERE id = $2', ['active', gameId]);
    await query('INSERT INTO game_rounds (game_id, round_number, start_time, status) VALUES ($1, 1, NOW(), $2)', [gameId, 'active']);

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
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const gameRes = await query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = gameRes.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can control rounds' });
    if (game.current_round >= game.total_rounds)
      return res.status(400).json({ error: 'Game has already ended' });

    await query('UPDATE game_rounds SET status = $1, end_time = NOW() WHERE game_id = $2 AND round_number = $3', ['completed', gameId, game.current_round]);

    const nextRound = game.current_round + 1;
    await query('UPDATE games SET current_round = $1 WHERE id = $2', [nextRound, gameId]);

    await query('INSERT INTO game_rounds (game_id, round_number, start_time, status) VALUES ($1, $2, NOW(), $3)', [gameId, nextRound, 'active']);

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
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const gameRes = await query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = gameRes.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can end the game' });

    await query('UPDATE game_rounds SET status = $1, end_time = NOW() WHERE game_id = $2 AND status = $3', ['completed', gameId, 'active']);
    await query('UPDATE games SET status = $1, ended_at = NOW() WHERE id = $2', ['ended', gameId]);

    res.json({ success: true, message: 'Game ended successfully' });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
};

// --- Get Game Data for Operator ---
exports.getGameData = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const gameRes = await query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = gameRes.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const production = (await query('SELECT * FROM production WHERE game_id = $1', [gameId])).rows;
    const demand = (await query('SELECT * FROM demand WHERE game_id = $1', [gameId])).rows;
    const tariffRates = (await query('SELECT * FROM tariff_rates WHERE game_id = $1', [gameId])).rows;
    const rounds = (await query('SELECT * FROM game_rounds WHERE game_id = $1', [gameId])).rows;

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
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    const playerCountry = profile.country;
    if (!playerCountry) return res.status(400).json({ error: 'Player country not assigned' });

    const { gameId } = req.params;

    const production = (await query('SELECT * FROM production WHERE game_id = $1 AND country = $2', [gameId, playerCountry])).rows;
    const demand = (await query('SELECT * FROM demand WHERE game_id = $1 AND country = $2', [gameId, playerCountry])).rows;

    const demandedProducts = (demand || []).map(d => d.product);
    let tariffRates = [];
    if (demandedProducts.length) {
      const roundLimit = req.query.currentRound || 0;
      const placeholders = demandedProducts.map((_, i) => `$${i + 3}`).join(',');
      const params = [gameId, roundLimit, ...demandedProducts];
      const tariffs = await query(
        `SELECT * FROM tariff_rates
         WHERE game_id = $1 AND round_number <= $2 AND product IN (${placeholders})
         ORDER BY round_number DESC`,
        params
      );
      tariffRates = tariffs.rows || [];
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
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const gameRes = await query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = gameRes.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.operator_id !== profile.id)
      return res.status(403).json({ error: 'Only the operator can reset the game' });

    await query('DELETE FROM production WHERE game_id = $1', [gameId]);
    await query('DELETE FROM demand WHERE game_id = $1', [gameId]);
    await query('DELETE FROM tariff_rates WHERE game_id = $1', [gameId]);
    await query('DELETE FROM game_rounds WHERE game_id = $1', [gameId]);

    await query('UPDATE games SET current_round = 0, status = $1, started_at = NULL, ended_at = NULL WHERE id = $2', ['waiting', gameId]);

    await initializeGameData(gameId);

    res.json({ success: true, message: 'Game reset successfully' });
  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ error: 'Failed to reset game' });
  }
};
