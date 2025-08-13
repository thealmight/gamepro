// controllers/chatController.js

const insertChatMessage = require('../services/insertChatMessage');
const fetchChatMessages = require('../services/fetchChatMessages');
const { updatePlayerRound } = require('../services/updatePlayerRound');

// POST /api/chat/message
exports.sendMessage = async (req, res) => {
  try {
    const sender_id = req.user.id;
    const sender_country = req.user.country;

    const { game_id, message_type, recipient_country, content } = req.body;

    if (!sender_id || !sender_country) {
      return res.status(401).json({ error: 'Sender authentication required' });
    }

    const data = await insertChatMessage({
      game_id,
      sender_id,
      sender_country,
      message_type,
      recipient_country,
      content
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/chat/:gameId
exports.getMessages = async (req, res) => {
  try {
    const data = await fetchChatMessages(req.params.gameId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
