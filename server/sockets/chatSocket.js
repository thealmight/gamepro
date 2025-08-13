// sockets/chatSocket.js
const insertChatMessage = require('../services/insertChatMessage');

module.exports = function(io) {
  io.on('connection', (socket) => {
    // --- Handle sending a chat message ---
    socket.on('sendMessage', async (data) => {
      try {
        const { gameId, content, messageType = 'group', recipientCountry } = data;
        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        const message = await insertChatMessage({
          game_id: gameId,
          sender_id: socket.userId,
          sender_country: socket.country,
          message_type: messageType,
          recipient_country: recipientCountry,
          content: content.trim(),
        });

        const messageData = {
          id: message.id,
          gameId,
          senderCountry: socket.country,
          messageType,
          recipientCountry,
          content: message.content,
          sentAt: message.sent_at
        };

        if (messageType === 'group') {
          io.emit('newMessage', messageData);
        } else if (messageType === 'private' && recipientCountry) {
          io.to(`country_${recipientCountry}`).emit('newMessage', messageData);
          socket.emit('newMessage', messageData); // Echo back to sender
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  });
};
