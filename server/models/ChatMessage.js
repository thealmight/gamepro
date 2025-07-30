const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gameId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'game_id',
    references: {
      model: 'games',
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sender_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  senderCountry: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'sender_country'
  },
  messageType: {
    type: DataTypes.ENUM('group', 'private'),
    defaultValue: 'group',
    field: 'message_type'
  },
  recipientCountry: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'recipient_country'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'sent_at'
  }
}, {
  tableName: 'chat_messages',
  timestamps: false
});

module.exports = ChatMessage;