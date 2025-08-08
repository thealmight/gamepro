require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');

// Shared Supabase client (from db.js)
const supabase = require('./db');

// Modular Socket.IO event handlers
const chatSocket = require('./sockets/chatSocket');
const gameSocket = require('./sockets/gameSocket');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ---- SOCKET.IO AUTH MIDDLEWARE ----
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No auth token provided'));

    // Validate with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return next(new Error('Supabase token invalid'));

    // Fetch user profile from 'users' table
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError || !dbUser) return next(new Error('User not found in DB'));

    socket.userId = dbUser.id;
    socket.username = dbUser.username;
    socket.role = dbUser.role;
    socket.country = dbUser.country;

    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// ---- PLUG IN SOCKET MODULES ----
chatSocket(io);
gameSocket(io);

// ---- CORE CONNECTION HANDLER (user status, room mgmt) ----
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.username} (${socket.role}) from ${socket.country || 'N/A'}`);

  try {
    await supabase
      .from('users')
      .update({ socket_id: socket.id, is_online: true })
      .eq('id', socket.userId);

    io.emit('userStatusUpdate', {
      userId: socket.userId,
      username: socket.username,
      country: socket.country,
      isOnline: true
    });

    const { data: onlineUsers } = await supabase
      .from('users')
      .select('id, username, role, country, is_online')
      .eq('is_online', true);

    socket.emit('onlineUsers', onlineUsers || []);
  } catch (error) {
    console.error('Error updating user status:', error);
  }

  // Room management
  if (socket.role === 'player' && socket.country) {
    socket.join(`country_${socket.country}`);
  }
  if (socket.role === 'operator') {
    socket.join('operators');
  }

  // Tariff update example (non-chat)
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
      await supabase
        .from('users')
        .update({ is_online: false, socket_id: null })
        .eq('id', socket.userId);

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
  console.log(`📊 Database: Supabase/PostgreSQL`);
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
