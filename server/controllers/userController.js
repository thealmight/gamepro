// controllers/userController.js

const { query } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Optional: login via this controller (routes currently map /users/login here)
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const find = await query('SELECT * FROM users WHERE username = $1', [username]);
    let user = find.rows[0];
    if (!user) {
      const role = username === 'pavan' ? 'operator' : 'player';
      const ins = await query('INSERT INTO users (username, role) VALUES ($1, $2) RETURNING *', [username, role]);
      user = ins.rows[0];
    }

    if (password && user.password_hash) {
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, country: user.country, is_online: user.is_online } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users (operator only)
exports.getAllUsers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const meRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const me = meRes.rows[0];
    if (!me || me.role !== 'operator') return res.status(403).json({ error: 'Access denied. Operator only.' });

    const { rows } = await query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
};
