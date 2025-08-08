// controllers/productionController.js

const supabase = require('../db');
const { updatePlayerRound } = require('../services/updatePlayerRound');

// --- Helper: Get Supabase profile from Auth token ---
async function getSupabaseProfile(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  return profile || null;
}

// --- Create a production record (Operator only) ---
exports.createRecord = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (profile.role !== 'operator')
      return res.status(403).json({ error: 'Only operators can create production records.' });

    // Insert record (optionally track creator)
    const recordToInsert = {
      ...req.body,
      created_by: profile.id // optional
    };

    const { data, error } = await supabase
      .from('production')
      .insert([recordToInsert])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Get production records by round (Authenticated user) ---
exports.getByRound = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    // Add further filtering as needed (game_id, country, etc)
    const { data, error } = await supabase
      .from('production')
      .select('*')
      .eq('round_number', req.params.round);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Update a production record (Operator only) ---
exports.updateRecord = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (profile.role !== 'operator')
      return res.status(403).json({ error: 'Only operators can update production records.' });

    // Check record existence
    const { data: record, error: findError } = await supabase
      .from('production')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (findError || !record)
      return res.status(404).json({ error: 'Record not found' });

    // Update
    const { data, error } = await supabase
      .from('production')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
