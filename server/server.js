const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const { User, ChatMessage } = require('./models');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user.id;
    socket.username = user.username;
    socket.role = user.role;
    socket.country = user.country;
    
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.username} (${socket.role}) from ${socket.country || 'N/A'}`);

  // Update user's socket ID and online status
  try {
    await User.update(
      { socketId: socket.id, isOnline: true },
      { where: { id: socket.userId } }
    );

    // Notify all clients about user connection
    io.emit('userStatusUpdate', {
      userId: socket.userId,
      username: socket.username,
      country: socket.country,
      isOnline: true
    });

    // Send current online users to the newly connected user
    const onlineUsers = await User.findAll({
      where: { isOnline: true },
      attributes: ['id', 'username', 'role', 'country', 'isOnline']
    });
    
    socket.emit('onlineUsers', onlineUsers);

  } catch (error) {
    console.error('Error updating user status:', error);
  }

  // Join country-specific room for players
  if (socket.role === 'player' && socket.country) {
    socket.join(`country_${socket.country}`);
  }

  // Join operator room
  if (socket.role === 'operator') {
    socket.join('operators');
  }

  // Handle chat messages
  socket.on('sendMessage', async (data) => {
    try {
      const { gameId, content, messageType = 'group', recipientCountry } = data;

      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content cannot be empty' });
        return;
      }

      // Save message to database
      const message = await ChatMessage.create({
        gameId,
        senderId: socket.userId,
        senderCountry: socket.country,
        messageType,
        recipientCountry,
        content: content.trim()
      });

      const messageData = {
        id: message.id,
        gameId,
        senderCountry: socket.country,
        messageType,
        recipientCountry,
        content: message.content,
        sentAt: message.sentAt
      };

      if (messageType === 'group') {
        // Broadcast to all players and operators
        io.emit('newMessage', messageData);
      } else if (messageType === 'private' && recipientCountry) {
        // Send to specific country and sender
        io.to(`country_${recipientCountry}`).emit('newMessage', messageData);
        socket.emit('newMessage', messageData); // Echo back to sender
      }

    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle tariff updates
  socket.on('tariffUpdate', (data) => {
    try {
      const { gameId, roundNumber, product, fromCountry, toCountry, rate } = data;

      // Broadcast tariff update to operators and relevant players
      const updateData = {
        gameId,
        roundNumber,
        product,
        fromCountry,
        toCountry,
        rate,
        updatedBy: socket.username,
        updatedAt: new Date()
      };

      // Send to operators
      io.to('operators').emit('tariffUpdated', updateData);

      // Send to affected countries
      io.to(`country_${fromCountry}`).emit('tariffUpdated', updateData);
      io.to(`country_${toCountry}`).emit('tariffUpdated', updateData);

    } catch (error) {
      console.error('Tariff update error:', error);
      socket.emit('error', { message: 'Failed to update tariff' });
    }
  });

  // Handle game state updates
  socket.on('gameStateUpdate', (data) => {
    if (socket.role !== 'operator') {
      socket.emit('error', { message: 'Only operators can update game state' });
      return;
    }

    try {
      // Broadcast game state changes to all connected clients
      io.emit('gameStateChanged', {
        ...data,
        updatedBy: socket.username,
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Game state update error:', error);
      socket.emit('error', { message: 'Failed to update game state' });
    }
  });

  // Handle round timer updates
  socket.on('roundTimerUpdate', (data) => {
    if (socket.role !== 'operator') {
      socket.emit('error', { message: 'Only operators can update round timer' });
      return;
    }

    try {
      const { gameId, currentRound, timeRemaining } = data;
      
      // Broadcast timer update to all clients
      io.emit('roundTimerUpdated', {
        gameId,
        currentRound,
        timeRemaining,
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Round timer update error:', error);
      socket.emit('error', { message: 'Failed to update round timer' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.username}`);

    try {
      // Update user's online status
      await User.update(
        { isOnline: false, socketId: null },
        { where: { id: socket.userId } }
      );

      // Notify all clients about user disconnection
      io.emit('userStatusUpdate', {
        userId: socket.userId,
        username: socket.username,
        country: socket.country,
        isOnline: false
      });

    } catch (error) {
      console.error('Error updating user status on disconnect:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Econ Empire server running on port ${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`🔌 WebSocket: Socket.IO enabled`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { server, io };
