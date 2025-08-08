// services/playerService.js
const supabase = require('../db'); // Make sure this points to your Supabase client

/**
 * Update the round for a player by userId
 * @param {string} playerId - Supabase user ID (or your users table PK)
 * @param {number} newRound
 * @returns {Promise<boolean>}
 */
async function updatePlayerRound(playerId, newRound) {
  try {
    const { data, error } = await supabase
      .from('users')           // Or 'players' if your table is named differently
      .update({ round: newRound })
      .eq('id', playerId);

    if (error) {
      console.error('Failed to update player round:', error);
      return false;
    }

    if ((data && data.length > 0) || (data && data.count > 0)) {
      console.log(`Updated round for player ${playerId} to ${newRound}`);
      return true;
    } else {
      console.warn(`No player found with ID ${playerId}`);
      return false;
    }
  } catch (err) {
    console.error('Failed to update player round:', err);
    return false;
  }
}

module.exports = { updatePlayerRound };
