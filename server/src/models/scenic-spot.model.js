import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const ScenicSpot = sequelize.define('ScenicSpot', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category_id: {
    type: DataTypes.BIGINT
  },
  cover_image: {
    type: DataTypes.STRING(255)
  },
  gallery_images: {
    type: DataTypes.TEXT
  },
  intro: {
    type: DataTypes.TEXT
  },
  culture_desc: {
    type: DataTypes.TEXT
  },
  open_time: {
    type: DataTypes.STRING(100)
  },
  ticket_info: {
    type: DataTypes.STRING(100)
  },
  suggested_duration: {
    type: DataTypes.STRING(50)
  },
  address: {
    type: DataTypes.STRING(255)
  },
  traffic_guide: {
    type: DataTypes.TEXT
  },
  tips: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.STRING(255)
  },
  recommend_flag: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  hot_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  created_at: {
    type: DataTypes.DATE
  },
  updated_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'scenic_spots'
});
