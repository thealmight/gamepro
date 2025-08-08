const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db'); // Assumes your Supabase client is exported from db.js

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// --- LOGIN (Supabase Auth) ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Use email for Supabase Auth

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in via Supabase Auth API
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return res.status(401).json({ error: 'Invalid email or password' });

    // Get user profile from custom users table (optional, but you probably want user meta)
    const userId = authData.user.id;
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // If user row doesn't exist (first login after sign up), insert
    if (!profile) {
      const username = authData.user.user_metadata?.username || authData.user.email;
      const role = username === 'pavan' ? 'operator' : 'player';
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert([{ id: userId, username, email, role }])
        .select()
        .single();
      if (insertError) throw insertError;
      profile = newProfile;
    }

    // You get access token from Supabase; you can also issue your own JWT if you want
    res.json({
      success: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: profile
    });
  } catch (error) {
    console.error('Supabase login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- LOGOUT (Client just removes token, or you can call Supabase API to invalidate) ---
router.post('/logout', async (req, res) => {
  try {
    // You should receive the access_token or refresh_token in header/body
    // For security, best to log out from Supabase Auth
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    // This will sign out the session server-side (optional)
    await supabase.auth.signOut();

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET CURRENT USER PROFILE (from Supabase JWT) ---
router.get('/me', authenticateSupabaseToken, async (req, res) => {
  try {
    // req.user is set by authenticateSupabaseToken
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- List all players (operator only) ---
router.get('/players', authenticateSupabaseToken, requireOperator, async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('users')
      .select('id, username, email, country, is_online')
      .eq('role', 'player')
      .order('username', { ascending: true });
    if (error) throw error;
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Middleware to check Supabase Auth JWT and fetch user profile ---
async function authenticateSupabaseToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  // Validate token and get Supabase user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(403).json({ error: 'Invalid or expired token' });

  // Get user profile from custom users table
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) return res.status(403).json({ error: 'User not found in DB' });

  req.user = profile; // Attach to request
  next();
}

// --- Middleware for operator role check ---
function requireOperator(req, res, next) {
  if (req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Operator access required' });
  }
  next();
}

module.exports = { 
  router, 
  authenticateSupabaseToken, 
  requireOperator,
};
