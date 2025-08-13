// services/insertProduct.js
const { query } = require('../db');

/**
 * Insert a new product row in DB.
 * @param {Object} params
 * @param {string} params.name
 * @returns {Promise<Object>} The inserted product row
 */
async function insertProduct({ name }) {
  const { rows } = await query('INSERT INTO products (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

module.exports = insertProduct;
