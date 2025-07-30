const { Game, GameRound, Production, Demand, TariffRate, User } = require('../models');
const { Op } = require('sequelize');

// Constants
const COUNTRIES = ['USA', 'China', 'Germany', 'Japan', 'India'];
const PRODUCTS = ['Steel', 'Grain', 'Oil', 'Electronics', 'Textiles'];

// Create a new game
const createGame = async (req, res) => {
  try {
    const { totalRounds = 5 } = req.body;
    const operatorId = req.user.userId;

    const game = await Game.create({
      totalRounds,
      operatorId,
      status: 'waiting'
    });

    // Initialize game data (production, demand, initial tariffs)
    await initializeGameData(game.id);

    res.json({
      success: true,
      game: {
        id: game.id,
        totalRounds: game.totalRounds,
        currentRound: game.currentRound,
        status: game.status
      }
    });

  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

// Initialize game data (production, demand, tariffs)
const initializeGameData = async (gameId) => {
  try {
    // For each product, assign production and demand
    for (const product of PRODUCTS) {
      // Randomly select 2-3 countries for production
      const shuffledCountries = [...COUNTRIES].sort(() => Math.random() - 0.5);
      const productionCountries = shuffledCountries.slice(0, 2 + Math.floor(Math.random() * 2)); // 2-3 countries
      const demandCountries = shuffledCountries.filter(c => !productionCountries.includes(c));

      // Assign production values (sum = 100)
      let remainingProduction = 100;
      for (let i = 0; i < productionCountries.length; i++) {
        const country = productionCountries[i];
        let quantity;
        
        if (i === productionCountries.length - 1) {
          // Last country gets remaining amount
          quantity = remainingProduction;
        } else {
          // Random amount between 20-50
          quantity = Math.max(20, Math.min(50, Math.floor(Math.random() * 31) + 20));
          if (quantity > remainingProduction - 20) {
            quantity = remainingProduction - 20;
          }
        }

        await Production.create({
          gameId,
          country,
          product,
          quantity
        });

        remainingProduction -= quantity;
      }

      // Assign demand values (sum = 100)
      let remainingDemand = 100;
      for (let i = 0; i < demandCountries.length; i++) {
        const country = demandCountries[i];
        let quantity;
        
        if (i === demandCountries.length - 1) {
          // Last country gets remaining amount
          quantity = remainingDemand;
        } else {
          // Random amount between 15-40
          quantity = Math.max(15, Math.min(40, Math.floor(Math.random() * 26) + 15));
          if (quantity > remainingDemand - 15) {
            quantity = remainingDemand - 15;
          }
        }

        await Demand.create({
          gameId,
          country,
          product,
          quantity
        });

        remainingDemand -= quantity;
      }

      // Initialize tariff rates (0 for same country, random 0-100 for others)
      for (const fromCountry of productionCountries) {
        for (const toCountry of demandCountries) {
          const rate = fromCountry === toCountry ? 0 : Math.floor(Math.random() * 101);
          
          await TariffRate.create({
            gameId,
            roundNumber: 0, // Initial round
            product,
            fromCountry,
            toCountry,
            rate
          });
        }
      }
    }

    console.log(`Game ${gameId} initialized with production, demand, and tariff data`);
  } catch (error) {
    console.error('Initialize game data error:', error);
    throw error;
  }
};

// Start the game
const startGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.operatorId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the game operator can start the game' });
    }

    // Check if all 5 players are online
    const onlinePlayers = await User.count({
      where: { role: 'player', isOnline: true }
    });

    if (onlinePlayers < 5) {
      return res.status(400).json({ 
        error: `Cannot start game. Need 5 players online, currently have ${onlinePlayers}` 
      });
    }

    // Update game status and start first round
    await game.update({
      status: 'active',
      currentRound: 1,
      startedAt: new Date()
    });

    // Create first round
    await GameRound.create({
      gameId,
      roundNumber: 1,
      startTime: new Date(),
      status: 'active'
    });

    res.json({
      success: true,
      message: 'Game started successfully',
      game: {
        id: game.id,
        currentRound: game.currentRound,
        status: game.status
      }
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
};

// Start next round
const startNextRound = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.operatorId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the game operator can control rounds' });
    }

    if (game.currentRound >= game.totalRounds) {
      return res.status(400).json({ error: 'Game has already ended' });
    }

    // End current round
    await GameRound.update(
      { status: 'completed', endTime: new Date() },
      { where: { gameId, roundNumber: game.currentRound } }
    );

    // Start next round
    const nextRound = game.currentRound + 1;
    await game.update({ currentRound: nextRound });

    await GameRound.create({
      gameId,
      roundNumber: nextRound,
      startTime: new Date(),
      status: 'active'
    });

    res.json({
      success: true,
      message: `Round ${nextRound} started`,
      currentRound: nextRound
    });

  } catch (error) {
    console.error('Start next round error:', error);
    res.status(500).json({ error: 'Failed to start next round' });
  }
};

// End game
const endGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.operatorId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the game operator can end the game' });
    }

    // End current round if active
    await GameRound.update(
      { status: 'completed', endTime: new Date() },
      { where: { gameId, status: 'active' } }
    );

    // End game
    await game.update({
      status: 'ended',
      endedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Game ended successfully'
    });

  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
};

// Get game data for operator
const getGameData = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findByPk(gameId, {
      include: [
        { model: Production, as: 'production' },
        { model: Demand, as: 'demand' },
        { model: TariffRate, as: 'tariffRates' },
        { model: GameRound, as: 'rounds' }
      ]
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      game: {
        id: game.id,
        totalRounds: game.totalRounds,
        currentRound: game.currentRound,
        status: game.status,
        production: game.production,
        demand: game.demand,
        tariffRates: game.tariffRates,
        rounds: game.rounds
      }
    });

  } catch (error) {
    console.error('Get game data error:', error);
    res.status(500).json({ error: 'Failed to get game data' });
  }
};

// Get player-specific game data
const getPlayerGameData = async (req, res) => {
  try {
    const { gameId } = req.params;
    const playerCountry = req.user.country;

    if (!playerCountry) {
      return res.status(400).json({ error: 'Player country not assigned' });
    }

    // Get player's production data
    const production = await Production.findAll({
      where: { gameId, country: playerCountry }
    });

    // Get player's demand data
    const demand = await Demand.findAll({
      where: { gameId, country: playerCountry }
    });

    // Get tariff rates for products the player's country demands
    const demandedProducts = demand.map(d => d.product);
    const tariffRates = await TariffRate.findAll({
      where: {
        gameId,
        product: { [Op.in]: demandedProducts },
        roundNumber: { [Op.lte]: req.query.currentRound || 0 }
      },
      order: [['roundNumber', 'DESC']]
    });

    res.json({
      country: playerCountry,
      production,
      demand,
      tariffRates
    });

  } catch (error) {
    console.error('Get player game data error:', error);
    res.status(500).json({ error: 'Failed to get player game data' });
  }
};

// Reset game (regenerate values, keep player assignments)
const resetGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.operatorId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the game operator can reset the game' });
    }

    // Delete existing game data
    await Production.destroy({ where: { gameId } });
    await Demand.destroy({ where: { gameId } });
    await TariffRate.destroy({ where: { gameId } });
    await GameRound.destroy({ where: { gameId } });

    // Reset game state
    await game.update({
      currentRound: 0,
      status: 'waiting',
      startedAt: null,
      endedAt: null
    });

    // Reinitialize game data
    await initializeGameData(gameId);

    res.json({
      success: true,
      message: 'Game reset successfully'
    });

  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ error: 'Failed to reset game' });
  }
};

module.exports = {
  createGame,
  startGame,
  startNextRound,
  endGame,
  getGameData,
  getPlayerGameData,
  resetGame,
  initializeGameData
};
