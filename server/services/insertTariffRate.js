// services/insertTariffRate.js
const { query } = require('../db');

/**
 * Insert a tariff rate row.
 * @param {Object} params
 * @param {string} params.game_id
 * @param {number} params.round_number
 * @param {string} params.product
 * @param {string} params.from_country
 * @param {string} params.to_country
 * @param {number} params.rate
 * @param {string} params.submitted_by (user id)
 */
async function insertTariffRate({
  game_id, round_number, product, from_country, to_country, rate, submitted_by
}) {
  const { rows } = await query(
    `INSERT INTO tariff_rates (game_id, round_number, product, from_country, to_country, rate, submitted_by, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [game_id, round_number, product, from_country, to_country, rate, submitted_by]
  );
  return rows[0];
}

module.exports = insertTariffRate;
