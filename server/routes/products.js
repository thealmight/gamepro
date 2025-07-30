const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

const Submission = require('../models/Submission');

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET product usage
router.get('/:name/usage', async (req, res) => {
  const { name } = req.params;

  try {
    const submissions = await Submission.findAll();
    const usage = [];

    submissions.forEach(sub => {
      if (sub.tariffs && sub.tariffs[name] !== undefined) {
        usage.push({
          round: sub.round,
          player: sub.player,
          country: sub.country,
          tariff: sub.tariffs[name]
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
