// services/insertProduction.js
const supabase = require('../db');

/**
 * Insert a production row.
 * @param {Object} params
 * @param {string} params.game_id
 * @param {string} params.country
 * @param {string} params.product
 * @param {number} params.quantity
 */
async function insertProduction({ game_id, country, product, quantity }) {
  const { data, error } = await supabase
    .from('production')
    .insert([{ game_id, country, product, quantity }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertProduction;
