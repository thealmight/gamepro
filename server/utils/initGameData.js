// utils/initGameData.js
const supabase = require('../db'); // Import your Supabase client

/**
 * Initialize production and demand values for each country for a game.
 * @param {string} gameId - The game's UUID/ID.
 * @param {string[]} countries - Array of country names/codes.
 */
async function generateInitialValues(gameId, countries) {
  const prodRows = [];
  const demRows = [];

  for (const country of countries) {
    prodRows.push({
      country,
      quantity: Math.floor(Math.random() * 100 + 50), // 50-149
      game_id: gameId
    });
    demRows.push({
      country,
      value: Math.floor(Math.random() * 80 + 20), // 20-99
      game_id: gameId
    });
  }

  // Insert all at once (bulk insert)
  const { error: prodError } = await supabase.from('production').insert(prodRows);
  const { error: demError } = await supabase.from('demand').insert(demRows);

  if (prodError) console.error('Production insert error:', prodError);
  if (demError) console.error('Demand insert error:', demError);
}

module.exports = generateInitialValues;
