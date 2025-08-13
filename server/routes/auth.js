const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// --- LOGIN (Username + optional password) ---
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Find user by username
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    let user = rows[0];

    // Auto-create player if not found (except reserved operator username)
    if (!user) {
      const role = username === 'pavan' ? 'operator' : 'player';
      const insert = await query(
        'INSERT INTO users (username, role) VALUES ($1, $2) RETURNING *',
        [username, role]
      );
      user = insert.rows[0];
    }

    // If password provided and user has password_hash, verify
    if (password && user.password_hash) {
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, country: user.country },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        country: user.country,
        is_online: user.is_online,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- LOGOUT (client-side token discard) ---
router.post('/logout', async (_req, res) => {
  res.json({ success: true });
});

// --- JWT Middleware ---
async function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireOperator(req, res, next) {
  if (req.user?.role !== 'operator') {
    return res.status(403).json({ error: 'Operator access required' });
  }
  next();
}

function requirePlayer(req, res, next) {
  if (req.user?.role !== 'player') {
    return res.status(403).json({ error: 'Player access required' });
  }
  next();
}

// --- GET CURRENT USER PROFILE ---
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, username, role, country, is_online FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- List all players (operator only) ---
router.get('/players', authenticateToken, requireOperator, async (_req, res) => {
  try {
    const { rows } = await query(
      "SELECT id, username, role, country, is_online FROM users WHERE role = 'player' ORDER BY username ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, authenticateToken, requireOperator, requirePlayer };
