// services/insertUser.js
const { query } = require('../db');

/**
 * Insert a user row.
 * @param {Object} params
 * @param {string} params.username
 * @param {string} params.role
 * @param {string} [params.country]
 */
async function insertUser({ username, role, country }) {
  const { rows } = await query(
    'INSERT INTO users (username, role, country) VALUES ($1, $2, $3) RETURNING *',
    [username, role, country || null]
  );
  return rows[0];
}

module.exports = insertUser;
