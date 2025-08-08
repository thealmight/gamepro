// services/insertProduct.js
const supabase = require('../db');

/**
 * Insert a new product row in Supabase.
 * @param {Object} params
 * @param {string} params.name
 * @returns {Promise<Object>} The inserted product row
 */
async function insertProduct({ name }) {
  const { data, error } = await supabase
    .from('products')
    .insert([{ name }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertProduct;
