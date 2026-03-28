import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Article = sequelize.define('Article', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  category_id: {
    type: DataTypes.BIGINT
  },
  cover_image: {
    type: DataTypes.STRING(255)
  },
  summary: {
    type: DataTypes.TEXT
  },
  content: {
    type: DataTypes.TEXT('long')
  },
  source: {
    type: DataTypes.STRING(255)
  },
  author: {
    type: DataTypes.STRING(100)
  },
  tags: {
    type: DataTypes.STRING(255)
  },
  recommend_flag: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  view_count: {
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
  tableName: 'articles'
});
