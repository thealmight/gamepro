// services/insertProduction.js
const { query } = require('../db');

/**
 * Insert a production row.
 * @param {Object} params
 * @param {string} params.game_id
 * @param {string} params.country
 * @param {string} params.product
 * @param {number} params.quantity
 */
async function insertProduction({ game_id, country, product, quantity }) {
  const { rows } = await query(
    'INSERT INTO production (game_id, country, product, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
    [game_id, country, product, quantity]
  );
  return rows[0];
}

module.exports = insertProduction;
