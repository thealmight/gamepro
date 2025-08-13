// server/utils/emitGameData.js
const { query } = require('../db');

/**
 * Emit all current game data (production, demand, tariff rates) for a given gameId via Socket.IO.
 * @param {import('socket.io').Server} io
 * @param {string} gameId
 */
async function emitGameData(io, gameId) {
  try {
    const [prodRes, demRes, tariffRes] = await Promise.all([
      query('SELECT * FROM production WHERE game_id = $1', [gameId]),
      query('SELECT * FROM demand WHERE game_id = $1', [gameId]),
      query('SELECT * FROM tariff_rates WHERE game_id = $1', [gameId])
    ]);

    io.emit('gameDataUpdated', {
      gameId,
      production: prodRes.rows || [],
      demand: demRes.rows || [],
      tariffRates: tariffRes.rows || []
    });
  } catch (err) {
    console.error('Error fetching game data for emit:', err);
  }
}

module.exports = emitGameData;
