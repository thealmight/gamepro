const { Player } = require('../models');

async function updatePlayerRound(playerId, newRound) {
  try {
    const [count] = await Player.update(
      { round: newRound },
      { where: { id: playerId } }
    );

    if (count === 0) {
      console.warn(`No player found with ID ${playerId}`);
      return false;
    }

    console.log(`Updated round for player ${playerId} to ${newRound}`);
    return true;
  } catch (err) {
    console.error('Failed to update player round:', err);
    return false;
  }
}

module.exports = { updatePlayerRound };
