const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Find user by username
    let user = await User.findOne({ where: { username } });

    // If user doesn't exist, create them (for demo purposes)
    if (!user) {
      // Determine role based on username
      const role = username === 'pavan' ? 'operator' : 'player';
      
      // Hash password if provided, otherwise use default
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;

      user = await User.create({
        username,
        passwordHash,
        role
      });
    } else {
      // If password is provided, verify it
      if (password && user.passwordHash) {
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }
    }

    // Update user as online
    await user.update({ isOnline: true });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        country: user.country 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        country: user.country,
        isOnline: user.isOnline
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (user) {
      await user.update({ isOnline: false, socketId: null });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      country: user.country,
      isOnline: user.isOnline
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all online players (for operator)
router.get('/players', authenticateToken, requireOperator, async (req, res) => {
  try {
    const players = await User.findAll({
      where: { role: 'player' },
      attributes: ['id', 'username', 'country', 'isOnline'],
      order: [['username', 'ASC']]
    });

    res.json(players);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to require operator role
function requireOperator(req, res, next) {
  if (req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Operator access required' });
  }
  next();
}

// Middleware to require player role
function requirePlayer(req, res, next) {
  if (req.user.role !== 'player') {
    return res.status(403).json({ error: 'Player access required' });
  }
  next();
}

module.exports = { 
  router, 
  authenticateToken, 
  requireOperator, 
  requirePlayer 
};
