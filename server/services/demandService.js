// services/demandService.js
const { query } = require('../db');

async function getDemand(gameId, country = null) {
  if (country) {
    const { rows } = await query('SELECT * FROM demand WHERE game_id = $1 AND country = $2', [gameId, country]);
    return rows;
  }
  const { rows } = await query('SELECT * FROM demand WHERE game_id = $1', [gameId]);
  return rows;
}

module.exports = { getDemand };
