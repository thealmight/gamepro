// controllers/tariffController.js

const { query } = require('../db');

// --- Submit Tariff Changes ---
const submitTariffChanges = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (!profile.country) return res.status(400).json({ error: 'Player country not assigned' });

    const { gameId, roundNumber, tariffChanges } = req.body;
    const userCountry = profile.country;
    const userId = profile.id;

    // Game validation
    const gameRes = await query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = gameRes.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });
    if (roundNumber < 1) return res.status(400).json({ error: 'Tariff changes only allowed from Round 1 onwards' });

    // Produced products lookup
    const producedRes = await query(
      'SELECT product FROM production WHERE game_id = $1 AND country = $2',
      [gameId, userCountry]
    );
    const producedProductNames = producedRes.rows.map(r => r.product);

    if (!producedProductNames.length) {
      return res.status(400).json({ error: 'Your country does not produce any products' });
    }

    // Upsert each tariff change
    const results = [];
    for (const change of tariffChanges) {
      const { product, toCountry, rate } = change;
      if (!producedProductNames.includes(product)) {
        results.push({ product, toCountry, error: `Your country (${userCountry}) does not produce ${product}` });
        continue;
      }
      if (rate < 0 || rate > 100) {
        results.push({ product, toCountry, error: 'Tariff rate must be between 0 and 100' });
        continue;
      }
      const finalRate = userCountry === toCountry ? 0 : rate;
      try {
        const existing = await query(
          `SELECT id FROM tariff_rates
           WHERE game_id = $1 AND round_number = $2 AND product = $3 AND from_country = $4 AND to_country = $5`,
          [gameId, roundNumber, product, userCountry, toCountry]
        );

        if (existing.rows[0]) {
          await query(
            'UPDATE tariff_rates SET rate = $1, submitted_by = $2, submitted_at = NOW() WHERE id = $3',
            [finalRate, userId, existing.rows[0].id]
          );
          results.push({ product, toCountry, rate: finalRate, success: true, action: 'updated' });
        } else {
          await query(
            `INSERT INTO tariff_rates (game_id, round_number, product, from_country, to_country, rate, submitted_by, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [gameId, roundNumber, product, userCountry, toCountry, finalRate, userId]
          );
          results.push({ product, toCountry, rate: finalRate, success: true, action: 'created' });
        }
      } catch (error) {
        results.push({ product, toCountry, error: 'Failed to update tariff rate' });
      }
    }

    res.json({ success: true, message: 'Tariff changes processed', results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit tariff changes' });
  }
};

// --- Get Tariff Rates (with submitter info) ---
const getTariffRates = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { roundNumber, product, fromCountry, toCountry } = req.query;

    const filters = ['game_id = $1'];
    const params = [gameId];
    let idx = 2;
    if (roundNumber) { filters.push('round_number = $' + idx); params.push(roundNumber); idx++; }
    if (product) { filters.push('product = $' + idx); params.push(product); idx++; }
    if (fromCountry) { filters.push('from_country = $' + idx); params.push(fromCountry); idx++; }
    if (toCountry) { filters.push('to_country = $' + idx); params.push(toCountry); idx++; }

    const sql = `SELECT tr.*, u.username AS submitter_username, u.country AS submitter_country
                 FROM tariff_rates tr
                 LEFT JOIN users u ON u.id = tr.submitted_by
                 WHERE ${filters.join(' AND ')}
                 ORDER BY tr.round_number DESC, tr.product ASC, tr.from_country ASC`;
    const { rows } = await query(sql, params);

    const result = rows.map(d => ({
      ...d,
      submitter: { username: d.submitter_username, country: d.submitter_country },
      submitter_username: undefined,
      submitter_country: undefined
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff rates' });
  }
};

// --- Get Tariff History ---
const getTariffHistory = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { rows } = await query(
      `SELECT tr.*, u.username AS submitter_username, u.country AS submitter_country
       FROM tariff_rates tr
       LEFT JOIN users u ON u.id = tr.submitted_by
       WHERE tr.game_id = $1
       ORDER BY tr.round_number ASC, tr.submitted_at ASC`,
      [gameId]
    );

    const groupedHistory = {};
    rows.forEach(tariff => {
      const key = `${tariff.round_number}-${tariff.from_country}`;
      if (!groupedHistory[key]) {
        groupedHistory[key] = {
          round: tariff.round_number,
          country: tariff.from_country,
          submitter: { username: tariff.submitter_username, country: tariff.submitter_country },
          tariffs: {},
          submittedAt: tariff.submitted_at
        };
      }
      groupedHistory[key].tariffs[tariff.product] = {
        toCountry: tariff.to_country,
        rate: tariff.rate
      };
    });
    res.json(Object.values(groupedHistory));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff history' });
  }
};

// --- Get Player's Tariff Submission Status (per round) ---
const getPlayerTariffStatus = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (!profile.country) return res.status(400).json({ error: 'Player country not assigned' });

    const { gameId, roundNumber } = req.params;
    const produced = await query(
      'SELECT product FROM production WHERE game_id = $1 AND country = $2',
      [gameId, profile.country]
    );

    if (!produced.rows.length) {
      return res.json({
        canSubmitTariffs: false,
        reason: 'Your country does not produce any products'
      });
    }

    const currentTariffs = await query(
      'SELECT * FROM tariff_rates WHERE game_id = $1 AND round_number = $2 AND from_country = $3',
      [gameId, roundNumber, profile.country]
    );

    const submittedProducts = currentTariffs.rows.map(t => t.product);
    const producedProductNames = produced.rows.map(p => p.product);

    res.json({
      canSubmitTariffs: true,
      producedProducts: producedProductNames,
      submittedProducts,
      currentTariffs: currentTariffs.rows.map(t => ({
        product: t.product,
        toCountry: t.to_country,
        rate: t.rate,
        submittedAt: t.submitted_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff status' });
  }
};

// --- Get Tariff Matrix (operator view) ---
const getTariffMatrix = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId, product } = req.params;
    const { roundNumber } = req.query;

    const filters = ['game_id = $1', 'product = $2'];
    const params = [gameId, product];
    let idx = 3;
    if (roundNumber) { filters.push('round_number = $' + idx); params.push(roundNumber); idx++; }

    const sql = `SELECT * FROM tariff_rates WHERE ${filters.join(' AND ')}
                 ORDER BY round_number DESC, from_country ASC, to_country ASC`;
    const { rows } = await query(sql, params);

    const matrix = {};
    rows.forEach(tariff => {
      if (!matrix[tariff.from_country]) matrix[tariff.from_country] = {};
      matrix[tariff.from_country][tariff.to_country] = {
        rate: tariff.rate,
        roundNumber: tariff.round_number,
        submittedAt: tariff.submitted_at
      };
    });
    res.json({ product, matrix });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff matrix' });
  }
};

module.exports = {
  submitTariffChanges,
  getTariffRates,
  getTariffHistory,
  getPlayerTariffStatus,
  getTariffMatrix
};
