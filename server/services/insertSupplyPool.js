// services/insertSupplyPool.js
const { query } = require('../db');

/**
 * Insert a supply pool row.
 * @param {Object} params
 * @param {number} params.round
 * @param {string} params.product
 * @param {number} params.quantity
 */
async function insertSupplyPool({ round, product, quantity }) {
  const { rows } = await query(
    'INSERT INTO supply_pool (round, product, quantity) VALUES ($1, $2, $3) RETURNING *',
    [round, product, quantity]
  );
  return rows[0];
}

module.exports = insertSupplyPool;
