const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { syncDatabase } = require('./models');

// Import routes
const { router: authRoutes } = require('./routes/auth');
const gameRoutes = require('./routes/gameRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Econ Empire API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database
syncDatabase().then(() => {
  console.log('Database synchronized successfully');
}).catch(err => {
  console.error('Database synchronization failed:', err);
});

module.exports = app;
