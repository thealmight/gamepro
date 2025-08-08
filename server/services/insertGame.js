// services/insertGame.js
const supabase = require('../db');

/**
 * Insert a game row.
 * @param {Object} params
 * @param {number} params.total_rounds
 * @param {string} params.operator_id
 */
async function insertGame({ total_rounds, operator_id }) {
  const { data, error } = await supabase
    .from('games')
    .insert([{ total_rounds, operator_id, status: 'waiting' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertGame;
