import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const SystemConfig = sequelize.define('SystemConfig', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  config_key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  config_value: {
    type: DataTypes.TEXT('long')
  },
  remark: {
    type: DataTypes.STRING(255)
  },
  created_at: {
    type: DataTypes.DATE
  },
  updated_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'system_configs'
});
