// sockets/gameSocket.js

const countries = ['USA', 'China', 'Germany', 'Japan', 'India'];

// Service imports (implement or mock if needed)
const { updatePlayerRound } = require('../services/updatePlayerRound');
const { generateProduction, generateDemand, getTariffRates } = require('../services/gameDataGenerators');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // -- Per-player: update current round for the player --
    socket.on('nextRound', async ({ newRound }) => {
      if (typeof newRound !== 'number' || newRound < 1) {
        socket.emit('error', { message: 'Invalid round number' });
        return;
      }
      const success = await updatePlayerRound(socket.userId, newRound);
      if (success) {
        socket.emit('roundUpdated', { playerId: socket.userId, newRound });
      } else {
        socket.emit('error', { message: 'Failed to update round' });
      }
    });

    // -- Operator: start next round for all players --
    socket.on('startNextRound', async ({ gameId, roundNumber }) => {
      if (socket.role !== 'operator') {
        socket.emit('error', { message: 'Only operators can start rounds' });
        return;
      }

      try {
        // Fetch/generate all round data for the game
        const production = await generateProduction(gameId, roundNumber);
        const demand = await generateDemand(gameId, roundNumber);
        const tariffRates = await getTariffRates(gameId, roundNumber);

        // Emit per-country room updates
        for (const playerCountry of countries) {
          io.to(`country_${playerCountry}`).emit('gameDataUpdated', {
            production: production[playerCountry],
            demand: demand[playerCountry],
            tariffRates: tariffRates[playerCountry]
          });
        }

        // Broadcast round change to all (for dashboards/UI)
        io.emit('gameStateChanged', {
          gameId,
          currentRound: roundNumber,
          updatedBy: socket.username,
          updatedAt: new Date()
        });

        console.log(`✅ Round ${roundNumber} started for game ${gameId}`);
      } catch (error) {
        console.error('Failed to start next round:', error);
        socket.emit('error', { message: 'Failed to start next round' });
      }
    });

    // -- Example: simple chat relay (replace with chatSocket for production) --
    socket.on('chatMessage', ({ to, content }) => {
      io.to(to).emit('receiveMessage', content);
    });

    // -- Example: tariff update, broadcast to all (you should update DB first) --
    socket.on('updateTariff', ({ round, productId, from, to, value }) => {
      io.emit('tariffUpdated', { round, productId, from, to, value });
    });
  });
};
