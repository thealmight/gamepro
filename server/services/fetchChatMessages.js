// services/fetchChatMessages.js

const { query } = require('../db');

/**
 * Fetch all chat messages for a specific game, ordered by sent time.
 * @param {string} gameId - The UUID of the game.
 * @returns {Promise<Array>} - Array of chat messages.
 */
async function fetchChatMessages(gameId) {
  const { rows } = await query(
    'SELECT * FROM chat_messages WHERE game_id = $1 ORDER BY sent_at ASC',
    [gameId]
  );
  return rows;
}

module.exports = fetchChatMessages;
