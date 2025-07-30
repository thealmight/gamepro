const { TariffRate, Production, User, Game } = require('../models');
const { Op } = require('sequelize');

// Submit tariff changes
const submitTariffChanges = async (req, res) => {
  try {
    const { gameId, roundNumber, tariffChanges } = req.body;
    const userId = req.user.userId;
    const userCountry = req.user.country;

    if (!userCountry) {
      return res.status(400).json({ error: 'Player country not assigned' });
    }

    // Verify game exists and is active
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    if (roundNumber < 1) {
      return res.status(400).json({ error: 'Tariff changes only allowed from Round 1 onwards' });
    }

    // Get products that this country produces
    const producedProducts = await Production.findAll({
      where: { gameId, country: userCountry },
      attributes: ['product']
    });

    const producedProductNames = producedProducts.map(p => p.product);

    if (producedProductNames.length === 0) {
      return res.status(400).json({ error: 'Your country does not produce any products' });
    }

    // Process each tariff change
    const results = [];
    for (const change of tariffChanges) {
      const { product, toCountry, rate } = change;

      // Validate that the player's country produces this product
      if (!producedProductNames.includes(product)) {
        results.push({
          product,
          toCountry,
          error: `Your country (${userCountry}) does not produce ${product}`
        });
        continue;
      }

      // Validate rate
      if (rate < 0 || rate > 100) {
        results.push({
          product,
          toCountry,
          error: 'Tariff rate must be between 0 and 100'
        });
        continue;
      }

      // Set rate to 0 if it's the same country
      const finalRate = userCountry === toCountry ? 0 : rate;

      try {
        // Update or create tariff rate
        const [tariffRate, created] = await TariffRate.upsert({
          gameId,
          roundNumber,
          product,
          fromCountry: userCountry,
          toCountry,
          rate: finalRate,
          submittedBy: userId
        });

        results.push({
          product,
          toCountry,
          rate: finalRate,
          success: true,
          action: created ? 'created' : 'updated'
        });

      } catch (error) {
        console.error('Tariff update error:', error);
        results.push({
          product,
          toCountry,
          error: 'Failed to update tariff rate'
        });
      }
    }

    res.json({
      success: true,
      message: 'Tariff changes processed',
      results
    });

  } catch (error) {
    console.error('Submit tariff changes error:', error);
    res.status(500).json({ error: 'Failed to submit tariff changes' });
  }
};

// Get tariff rates for a specific game and round
const getTariffRates = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { roundNumber, product, fromCountry, toCountry } = req.query;

    const whereClause = { gameId };
    
    if (roundNumber) whereClause.roundNumber = roundNumber;
    if (product) whereClause.product = product;
    if (fromCountry) whereClause.fromCountry = fromCountry;
    if (toCountry) whereClause.toCountry = toCountry;

    const tariffRates = await TariffRate.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['username', 'country']
        }
      ],
      order: [['roundNumber', 'DESC'], ['product', 'ASC'], ['fromCountry', 'ASC']]
    });

    res.json(tariffRates);

  } catch (error) {
    console.error('Get tariff rates error:', error);
    res.status(500).json({ error: 'Failed to get tariff rates' });
  }
};

// Get tariff history for operator dashboard
const getTariffHistory = async (req, res) => {
  try {
    const { gameId } = req.params;

    const tariffHistory = await TariffRate.findAll({
      where: { gameId },
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['username', 'country']
        }
      ],
      order: [['roundNumber', 'ASC'], ['submittedAt', 'ASC']]
    });

    // Group by round and country for easier display
    const groupedHistory = {};
    
    tariffHistory.forEach(tariff => {
      const key = `${tariff.roundNumber}-${tariff.fromCountry}`;
      if (!groupedHistory[key]) {
        groupedHistory[key] = {
          round: tariff.roundNumber,
          country: tariff.fromCountry,
          submitter: tariff.submitter,
          tariffs: {},
          submittedAt: tariff.submittedAt
        };
      }
      groupedHistory[key].tariffs[tariff.product] = {
        toCountry: tariff.toCountry,
        rate: tariff.rate
      };
    });

    res.json(Object.values(groupedHistory));

  } catch (error) {
    console.error('Get tariff history error:', error);
    res.status(500).json({ error: 'Failed to get tariff history' });
  }
};

// Get player's tariff submission status for current round
const getPlayerTariffStatus = async (req, res) => {
  try {
    const { gameId, roundNumber } = req.params;
    const userCountry = req.user.country;

    if (!userCountry) {
      return res.status(400).json({ error: 'Player country not assigned' });
    }

    // Get products that this country produces
    const producedProducts = await Production.findAll({
      where: { gameId, country: userCountry },
      attributes: ['product']
    });

    if (producedProducts.length === 0) {
      return res.json({
        canSubmitTariffs: false,
        reason: 'Your country does not produce any products'
      });
    }

    // Get current tariff submissions for this round
    const currentTariffs = await TariffRate.findAll({
      where: {
        gameId,
        roundNumber,
        fromCountry: userCountry
      }
    });

    const submittedProducts = currentTariffs.map(t => t.product);
    const producedProductNames = producedProducts.map(p => p.product);

    res.json({
      canSubmitTariffs: true,
      producedProducts: producedProductNames,
      submittedProducts,
      currentTariffs: currentTariffs.map(t => ({
        product: t.product,
        toCountry: t.toCountry,
        rate: t.rate,
        submittedAt: t.submittedAt
      }))
    });

  } catch (error) {
    console.error('Get player tariff status error:', error);
    res.status(500).json({ error: 'Failed to get tariff status' });
  }
};

// Get tariff matrix for a specific product (for operator view)
const getTariffMatrix = async (req, res) => {
  try {
    const { gameId, product } = req.params;
    const { roundNumber } = req.query;

    const whereClause = { gameId, product };
    if (roundNumber) whereClause.roundNumber = roundNumber;

    const tariffRates = await TariffRate.findAll({
      where: whereClause,
      order: [['roundNumber', 'DESC'], ['fromCountry', 'ASC'], ['toCountry', 'ASC']]
    });

    // Create matrix structure
    const matrix = {};
    tariffRates.forEach(tariff => {
      if (!matrix[tariff.fromCountry]) {
        matrix[tariff.fromCountry] = {};
      }
      matrix[tariff.fromCountry][tariff.toCountry] = {
        rate: tariff.rate,
        roundNumber: tariff.roundNumber,
        submittedAt: tariff.submittedAt
      };
    });

    res.json({
      product,
      matrix
    });

  } catch (error) {
    console.error('Get tariff matrix error:', error);
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
