// services/demandService.js
const supabase = require('../db');

async function getDemand(gameId, country = null) {
  let query = supabase.from('demand').select('*').eq('game_id', gameId);
  if (country) query = query.eq('country', country);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

module.exports = { getDemand };
