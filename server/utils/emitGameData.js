// server/utils/emitGameData.js
const supabase = require('../db');

/**
 * Emit all current game data (production, demand, tariff rates) for a given gameId via Socket.IO.
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {string} gameId - The game's UUID/ID
 */
async function emitGameData(io, gameId) {
  // Fetch data from Supabase in parallel
  const [prodRes, demRes, tariffRes] = await Promise.all([
    supabase.from('production').select('*').eq('game_id', gameId),
    supabase.from('demand').select('*').eq('game_id', gameId),
    supabase.from('tariff_rates').select('*').eq('game_id', gameId)
  ]);

  // Handle errors (optional)
  if (prodRes.error || demRes.error || tariffRes.error) {
    console.error('Error fetching game data for emit:', prodRes.error || demRes.error || tariffRes.error);
    return;
  }

  // Emit to all clients in this game (customize the room/event as you wish)
  io.emit('gameDataUpdated', {
    gameId,
    production: prodRes.data || [],
    demand: demRes.data || [],
    tariffRates: tariffRes.data || []
  });
}

module.exports = emitGameData;
