// services/insertChatMessage.js

const { query } = require('../db');

/**
 * Insert a chat message into the database.
 * @param {Object} params - Message params.
 * @param {string} params.game_id
 * @param {string} params.sender_id
 * @param {string} params.sender_country
 * @param {string} [params.message_type='group']
 * @param {string|null} [params.recipient_country=null]
 * @param {string} params.content
 * @returns {Promise<Object>} - The inserted message record.
 */
async function insertChatMessage({
  game_id,
  sender_id,
  sender_country,
  message_type = 'group',
  recipient_country = null,
  content
}) {
  const { rows } = await query(
    `INSERT INTO chat_messages (game_id, sender_id, sender_country, message_type, recipient_country, content, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [game_id, sender_id, sender_country, message_type, recipient_country, content]
  );
  return rows[0];
}

module.exports = insertChatMessage;
