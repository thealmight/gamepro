// Placeholder for WebSocket logic
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    const { updatePlayerRound } = require('../services/playerService');

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
socket.on('startNextRound', async ({ gameId, roundNumber }) => {
  if (socket.role !== 'operator') {
    socket.emit('error', { message: 'Only operators can start rounds' });
    return;
  }

  try {
    // Example: generate production, demand, and tariffs
    const production = await generateProduction(gameId, roundNumber);
    const demand = await generateDemand(gameId, roundNumber);
    const tariffRates = await getTariffRates(gameId, roundNumber);

    // Emit to each country
    const countries = ['USA', 'China', 'Germany', 'Japan', 'India'];
    for (const playerCountry of countries) {
      io.to(`country_${playerCountry}`).emit('gameDataUpdated', {
        production: production[playerCountry],
        demand: demand[playerCountry],
        tariffRates: tariffRates[playerCountry]
      });
    }

    // Optionally broadcast round change
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

    socket.on('chatMessage', ({ to, content }) => {
      io.to(to).emit('receiveMessage', content);
    });

    socket.on('updateTariff', ({ round, productId, from, to, value }) => {
      // Update DB then broadcast to operator
      io.emit('tariffUpdated', { round, productId, from, to, value });
    });
  });
};
