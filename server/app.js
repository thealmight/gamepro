const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// ----- Import routes -----
const { router: authRoutes } = require('./routes/auth');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');
const tariffRoutes = require('./routes/tariffRoutes');
const gameDataRoutes = require('./routes/gameDataRoutes');
const playerRoutes = require('./routes/playerRoutes');
const productionRoutes = require('./routes/productionRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const testRoundRoutes = require('./routes/testRoundRoutes');

const app = express();

// Compute allowed origins
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

// ----- Middleware -----
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// ----- API Routes -----
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tariff', tariffRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api', gameDataRoutes);
app.use('/api', testRoundRoutes); // Mounts at /api/test-round

// ----- General Routes -----
app.get('/', (req, res) => {
  res.send({ message: 'Econ Empire backend is live!' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Econ Empire API is running' });
});

// ----- Error Handling -----
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
