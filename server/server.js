require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('./db');
const app = require('./app');
const chatSocket = require('./sockets/chatSocket');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const server = http.createServer(app);

// Compute allowed origins for Socket.IO
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket modules
chatSocket(io);

// ---- SOCKET.IO AUTH MIDDLEWARE ----
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No auth token provided'));

    // Validate JWT
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return next(new Error('JWT invalid'));
    }

    // Fetch user profile from DB
    const { rows } = await query('SELECT id, username, role, country FROM users WHERE id = $1', [payload.id]);
    const dbUser = rows[0];
    if (!dbUser) return next(new Error('User not found in DB'));

    socket.userId = dbUser.id;
    socket.username = dbUser.username;
    socket.role = dbUser.role;
    socket.country = dbUser.country;

    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// ---- CONNECTION HANDLER ----
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.username} (${socket.role}) from ${socket.country || 'N/A'}`);

  try {
    await query('UPDATE users SET socket_id = $1, is_online = TRUE WHERE id = $2', [socket.id, socket.userId]);

    const { rows: onlineUsers } = await query(
      "SELECT id, username, role, country, is_online FROM users WHERE is_online = TRUE"
    );
    io.emit('onlineUsers', onlineUsers || []);
  } catch (error) {
    console.error('Error updating user status:', error);
  }

  // Rooms
  if (socket.role === 'player' && socket.country) {
    socket.join(`country_${socket.country}`);
  }
  if (socket.role === 'operator') {
    socket.join('operators');
  }

  // Tariff update broadcast example
  socket.on('tariffUpdate', (data) => {
    try {
      const { gameId, roundNumber, product, fromCountry, toCountry, rate } = data;
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
      io.to('operators').emit('tariffUpdated', updateData);
      io.to(`country_${fromCountry}`).emit('tariffUpdated', updateData);
      io.to(`country_${toCountry}`).emit('tariffUpdated', updateData);
    } catch (error) {
      socket.emit('error', { message: 'Failed to update tariff' });
    }
  });

  // Game state update example
  socket.on('gameStateUpdate', async (data) => {
    if (socket.role !== 'operator') {
      socket.emit('error', { message: 'Only operators can update game state' });
      return;
    }
    try {
      io.emit('gameStateChanged', {
        ...data,
        updatedBy: socket.username,
        updatedAt: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to update game state' });
    }
  });

  // Round timer update example
  socket.on('roundTimerUpdate', (data) => {
    if (socket.role !== 'operator') {
      socket.emit('error', { message: 'Only operators can update round timer' });
      return;
    }
    try {
      const { gameId, currentRound, timeRemaining } = data;
      io.emit('roundTimerUpdated', {
        gameId,
        currentRound,
        timeRemaining,
        updatedAt: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to update round timer' });
    }
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.username}`);
    try {
      await query('UPDATE users SET is_online = FALSE, socket_id = NULL WHERE id = $1', [socket.userId]);
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

  // Error event
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// ---- START SERVER ----
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Econ Empire server running on port ${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`🔌 WebSocket: Socket.IO enabled`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
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
