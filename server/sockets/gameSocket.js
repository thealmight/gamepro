// sockets/gameSocket.js

const countries = ['USA', 'China', 'Germany', 'Japan', 'India'];

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('chatMessage', ({ to, content }) => {
      io.to(to).emit('receiveMessage', content);
    });
  });
};
