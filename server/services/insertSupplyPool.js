// services/insertSupplyPool.js
const supabase = require('../db');

/**
 * Insert a supply pool row.
 * @param {Object} params
 * @param {number} params.round
 * @param {string} params.product
 * @param {number} params.quantity
 */
async function insertSupplyPool({ round, product, quantity }) {
  const { data, error } = await supabase
    .from('supply_pool')
    .insert([{ round, product, quantity }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertSupplyPool;
