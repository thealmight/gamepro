// routes/productRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET all products
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM products ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET product usage across all submissions
router.get('/:name/usage', async (req, res) => {
  const { name } = req.params;

  try {
    const { rows } = await query('SELECT round, player, country, tariffs FROM submissions');
    const usage = [];

    rows.forEach(sub => {
      const tariffs = sub.tariffs || {};
      if (tariffs && tariffs[name] !== undefined) {
        usage.push({
          round: sub.round,
          player: sub.player,
          country: sub.country,
          tariff: tariffs[name]
        });
      }
    });

    res.json(usage);
  } catch (err) {
    console.error('Error fetching product usage:', err);
    res.status(500).json({ error: 'Failed to fetch product usage' });
  }
});

module.exports = router;
