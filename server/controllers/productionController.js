// controllers/productionController.js

const { query } = require('../db');

// --- Create a production record (Operator only) ---
exports.createRecord = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (profile.role !== 'operator')
      return res.status(403).json({ error: 'Only operators can create production records.' });

    const recordToInsert = { ...req.body };
    const { game_id, country, product, quantity } = recordToInsert;

    const ins = await query(
      'INSERT INTO production (game_id, country, product, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [game_id, country, product, quantity]
    );
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Get production records by round (Authenticated user) ---
exports.getByRound = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = await query('SELECT * FROM production WHERE round_number = $1', [req.params.round]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Update a production record (Operator only) ---
exports.updateRecord = async (req, res) => {
  try {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });
    if (profile.role !== 'operator')
      return res.status(403).json({ error: 'Only operators can update production records.' });

    const find = await query('SELECT * FROM production WHERE id = $1', [req.params.id]);
    const record = find.rows[0];
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const { country, product, quantity } = req.body;
    const upd = await query(
      'UPDATE production SET country = $1, product = $2, quantity = $3 WHERE id = $4 RETURNING *',
      [country ?? record.country, product ?? record.product, quantity ?? record.quantity, req.params.id]
    );
    res.json(upd.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
