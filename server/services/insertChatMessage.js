// services/insertChatMessage.js

const supabase = require('../db'); // Adjust path as needed

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
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      game_id,
      sender_id,
      sender_country,
      message_type,
      recipient_country,
      content,
      sent_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = insertChatMessage;
