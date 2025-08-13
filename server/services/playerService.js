// services/playerService.js
const { query } = require('../db');

/**
 * Update the round for a player by userId
 * @param {number} playerId - user ID
 * @param {number} newRound
 * @returns {Promise<boolean>}
 */
async function updatePlayerRound(playerId, newRound) {
  try {
    const result = await query('UPDATE users SET round = $1 WHERE id = $2', [newRound, playerId]);
    if (result.rowCount > 0) {
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
