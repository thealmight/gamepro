// utils/initGameData.js
const { query } = require('../db');

/**
 * Initialize production and demand values for each country for a game.
 * @param {string} gameId - The game's UUID/ID.
 * @param {string[]} countries - Array of country names/codes.
 */
async function generateInitialValues(gameId, countries) {
  const prodRows = [];
  const demRows = [];

  for (const country of countries) {
    prodRows.push({
      country,
      quantity: Math.floor(Math.random() * 100 + 50), // 50-149
      game_id: gameId
    });
    demRows.push({
      country,
      value: Math.floor(Math.random() * 80 + 20), // 20-99
      game_id: gameId
    });
  }

  // Insert all at once (bulk insert)
  for (const r of prodRows) {
    await query('INSERT INTO production (game_id, country, product, quantity) VALUES ($1, $2, $3, $4)', [r.game_id, r.country, r.product || 'Steel', r.quantity]);
  }
  for (const r of demRows) {
    await query('INSERT INTO demand (game_id, country, product, quantity) VALUES ($1, $2, $3, $4)', [r.game_id, r.country, r.product || 'Steel', r.value]);
  }
}

module.exports = generateInitialValues;
