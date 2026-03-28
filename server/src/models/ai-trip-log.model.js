import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const AiTripLog = sequelize.define('AiTripLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  days: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  preferences: {
    type: DataTypes.STRING(255)
  },
  departure_area: {
    type: DataTypes.STRING(100)
  },
  pace: {
    type: DataTypes.STRING(50)
  },
  extra_requirement: {
    type: DataTypes.TEXT
  },
  result_content: {
    type: DataTypes.TEXT('long')
  },
  model_name: {
    type: DataTypes.STRING(100)
  },
  token_usage: {
    type: DataTypes.INTEGER
  },
  created_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'ai_trip_logs',
  updatedAt: false
});
