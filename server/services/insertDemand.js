// services/insertDemand.js
const supabase = require('../db');

/**
 * Insert a demand row.
 * @param {Object} params
 * @param {string} params.game_id
 * @param {string} params.country
 * @param {string} params.product
 * @param {number} params.quantity
 */
async function insertDemand({ game_id, country, product, quantity }) {
  const { data, error } = await supabase
    .from('demand')
    .insert([{ game_id, country, product, quantity }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertDemand;
