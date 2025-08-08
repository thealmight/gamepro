// controllers/tariffController.js

const supabase = require('../db');
const { updatePlayerRound } = require('../services/updatePlayerRound');

// --- Helper: Extract custom profile from Supabase Auth token ---
async function getSupabaseProfile(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  return profile || null;
}

// --- Submit Tariff Changes ---
const submitTariffChanges = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (!profile.country) return res.status(400).json({ error: 'Player country not assigned' });

    const { gameId, roundNumber, tariffChanges } = req.body;
    const userCountry = profile.country;
    const userId = profile.id;

    // Game validation
    const { data: game, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (gameError || !game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });
    if (roundNumber < 1) return res.status(400).json({ error: 'Tariff changes only allowed from Round 1 onwards' });

    // Produced products lookup
    const { data: producedProducts } = await supabase.from('production')
      .select('product')
      .eq('game_id', gameId)
      .eq('country', userCountry);
    const producedProductNames = (producedProducts || []).map(p => p.product);

    if (!producedProductNames.length) {
      return res.status(400).json({ error: 'Your country does not produce any products' });
    }

    // Upsert each tariff change
    const results = [];
    for (const change of tariffChanges) {
      const { product, toCountry, rate } = change;
      if (!producedProductNames.includes(product)) {
        results.push({ product, toCountry, error: `Your country (${userCountry}) does not produce ${product}` });
        continue;
      }
      if (rate < 0 || rate > 100) {
        results.push({ product, toCountry, error: 'Tariff rate must be between 0 and 100' });
        continue;
      }
      const finalRate = userCountry === toCountry ? 0 : rate;
      try {
        // Try update first, else insert
        const { data: existingTariff } = await supabase
          .from('tariff_rates')
          .select('id')
          .eq('game_id', gameId)
          .eq('round_number', roundNumber)
          .eq('product', product)
          .eq('from_country', userCountry)
          .eq('to_country', toCountry)
          .maybeSingle();

        if (existingTariff && existingTariff.id) {
          await supabase.from('tariff_rates').update({
            rate: finalRate,
            submitted_by: userId,
            submitted_at: new Date().toISOString()
          }).eq('id', existingTariff.id);
          results.push({ product, toCountry, rate: finalRate, success: true, action: 'updated' });
        } else {
          await supabase.from('tariff_rates').insert([{
            game_id: gameId,
            round_number: roundNumber,
            product,
            from_country: userCountry,
            to_country: toCountry,
            rate: finalRate,
            submitted_by: userId,
            submitted_at: new Date().toISOString()
          }]);
          results.push({ product, toCountry, rate: finalRate, success: true, action: 'created' });
        }
      } catch (error) {
        results.push({ product, toCountry, error: 'Failed to update tariff rate' });
      }
    }

    res.json({ success: true, message: 'Tariff changes processed', results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit tariff changes' });
  }
};

// --- Get Tariff Rates (with join) ---
const getTariffRates = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { roundNumber, product, fromCountry, toCountry } = req.query;

    let query = supabase.from('tariff_rates').select('*, users!tariff_rates_submitted_by_fkey(username, country)');
    query = query.eq('game_id', gameId);
    if (roundNumber) query = query.eq('round_number', roundNumber);
    if (product) query = query.eq('product', product);
    if (fromCountry) query = query.eq('from_country', fromCountry);
    if (toCountry) query = query.eq('to_country', toCountry);

    query = query.order('round_number', { ascending: false })
                 .order('product', { ascending: true })
                 .order('from_country', { ascending: true });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Map join result
    const result = data.map(d => ({
      ...d,
      submitter: d.users,
      users: undefined
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff rates' });
  }
};

// --- Get Tariff History (for dashboard/operator) ---
const getTariffHistory = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId } = req.params;
    const { data, error } = await supabase
      .from('tariff_rates')
      .select('*, users!tariff_rates_submitted_by_fkey(username, country)')
      .eq('game_id', gameId)
      .order('round_number', { ascending: true })
      .order('submitted_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    // Group by round and from_country
    const groupedHistory = {};
    data.forEach(tariff => {
      const key = `${tariff.round_number}-${tariff.from_country}`;
      if (!groupedHistory[key]) {
        groupedHistory[key] = {
          round: tariff.round_number,
          country: tariff.from_country,
          submitter: tariff.users,
          tariffs: {},
          submittedAt: tariff.submitted_at
        };
      }
      groupedHistory[key].tariffs[tariff.product] = {
        toCountry: tariff.to_country,
        rate: tariff.rate
      };
    });
    res.json(Object.values(groupedHistory));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff history' });
  }
};

// --- Get Player's Tariff Submission Status (per round) ---
const getPlayerTariffStatus = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (!profile.country) return res.status(400).json({ error: 'Player country not assigned' });

    const { gameId, roundNumber } = req.params;
    const { data: producedProducts } = await supabase.from('production')
      .select('product')
      .eq('game_id', gameId)
      .eq('country', profile.country);

    if (!producedProducts.length) {
      return res.json({
        canSubmitTariffs: false,
        reason: 'Your country does not produce any products'
      });
    }

    const { data: currentTariffs } = await supabase.from('tariff_rates')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .eq('from_country', profile.country);

    const submittedProducts = (currentTariffs || []).map(t => t.product);
    const producedProductNames = producedProducts.map(p => p.product);

    res.json({
      canSubmitTariffs: true,
      producedProducts: producedProductNames,
      submittedProducts,
      currentTariffs: (currentTariffs || []).map(t => ({
        product: t.product,
        toCountry: t.to_country,
        rate: t.rate,
        submittedAt: t.submitted_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff status' });
  }
};

// --- Get Tariff Matrix (operator view) ---
const getTariffMatrix = async (req, res) => {
  try {
    const profile = await getSupabaseProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { gameId, product } = req.params;
    const { roundNumber } = req.query;

    let query = supabase.from('tariff_rates')
      .select('*')
      .eq('game_id', gameId)
      .eq('product', product);
    if (roundNumber) query = query.eq('round_number', roundNumber);

    query = query.order('round_number', { ascending: false })
                 .order('from_country', { ascending: true })
                 .order('to_country', { ascending: true });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Build matrix
    const matrix = {};
    data.forEach(tariff => {
      if (!matrix[tariff.from_country]) matrix[tariff.from_country] = {};
      matrix[tariff.from_country][tariff.to_country] = {
        rate: tariff.rate,
        roundNumber: tariff.round_number,
        submittedAt: tariff.submitted_at
      };
    });
    res.json({ product, matrix });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tariff matrix' });
  }
};

module.exports = {
  submitTariffChanges,
  getTariffRates,
  getTariffHistory,
  getPlayerTariffStatus,
  getTariffMatrix
};
