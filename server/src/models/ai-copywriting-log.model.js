import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const AiCopywritingLog = sequelize.define('AiCopywritingLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  target_id: {
    type: DataTypes.BIGINT
  },
  input_data: {
    type: DataTypes.TEXT('long')
  },
  output_content: {
    type: DataTypes.TEXT('long')
  },
  prompt_text: {
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
  tableName: 'ai_copywriting_logs',
  updatedAt: false
});
