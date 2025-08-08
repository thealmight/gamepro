// controllers/userController.js

const supabase = require('../db');
const { updatePlayerRound } = require('../services/updatePlayerRound');

// --- Helper: Extract user from Supabase JWT ---
async function getSupabaseUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// --- Get or create user profile (after frontend login) ---
exports.getOrCreateProfile = async (req, res) => {
  try {
    const supaUser = await getSupabaseUser(req);
    if (!supaUser) return res.status(401).json({ error: 'Invalid or missing Supabase Auth token.' });

    let { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', supaUser.id)
      .single();

    if (!profile) {
      const username = supaUser.user_metadata?.username || supaUser.email;
      const role = username === 'pavan' ? 'operator' : 'player';

      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert([{ id: supaUser.id, username, role }])
        .select()
        .single();
      if (insertError) throw insertError;
      profile = newProfile;
      console.log('✅ User profile created:', profile.username);
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error('❌ Auth/profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// --- Get all users (operator only) ---
exports.getAllUsers = async (req, res) => {
  try {
    const supaUser = await getSupabaseUser(req);
    if (!supaUser) return res.status(401).json({ error: 'Unauthorized' });

    // Get operator profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', supaUser.id)
      .single();

    if (!profile || profile.role !== 'operator') {
      return res.status(403).json({ error: 'Access denied. Operator only.' });
    }

    const { data: users, error } = await supabase.from('users').select('*');
    if (error) throw error;
    res.json(users);
  } catch (err) {
    console.error('❌ Fetch users error:', err.message);
    res.status(500).json({ error: 'Could not fetch users' });
  }
};
