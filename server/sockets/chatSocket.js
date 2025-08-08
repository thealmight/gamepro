// sockets/chatSocket.js
const supabase = require('../db'); // Update the path if needed

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

        // Save the chat message to Supabase
        const { data: message, error } = await supabase
          .from('chat_messages')
          .insert([{
            game_id: gameId,
            sender_id: socket.userId,
            sender_country: socket.country,
            message_type: messageType,
            recipient_country: recipientCountry,
            content: content.trim(),
            sent_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error || !message) {
          socket.emit('error', { message: 'Failed to save message' });
          return;
        }

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
