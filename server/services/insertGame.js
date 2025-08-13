// services/insertGame.js
const { query } = require('../db');

/**
 * Insert a game row.
 * @param {Object} params
 * @param {number} params.total_rounds
 * @param {number} params.operator_id
 */
async function insertGame({ total_rounds, operator_id }) {
  const { rows } = await query(
    'INSERT INTO games (total_rounds, operator_id, status) VALUES ($1, $2, $3) RETURNING *',
    [total_rounds, operator_id, 'waiting']
  );
  return rows[0];
}

module.exports = insertGame;
