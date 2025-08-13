// services/fetchProducts.js
const { query } = require('../db');

async function fetchProducts() {
  const { rows } = await query('SELECT * FROM products ORDER BY name ASC');
  return rows;
}

module.exports = fetchProducts;
