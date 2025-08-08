// services/insertTariffRate.js
const supabase = require('../db');

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
  const { data, error } = await supabase
    .from('tariff_rates')
    .insert([{
      game_id,
      round_number,
      product,
      from_country,
      to_country,
      rate,
      submitted_by,
      submitted_at: new Date().toISOString()
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertTariffRate;
