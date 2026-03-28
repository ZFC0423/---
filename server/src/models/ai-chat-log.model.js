import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const AiChatLog = sequelize.define('AiChatLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT('long')
  },
  matched_context: {
    type: DataTypes.TEXT('long')
  },
  model_name: {
    type: DataTypes.STRING(100)
  },
  token_usage: {
    type: DataTypes.INTEGER
  },
  ip: {
    type: DataTypes.STRING(100)
  },
  created_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'ai_chat_logs',
  updatedAt: false
});
