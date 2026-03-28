import { sequelize } from '../config/db.js';
import { Admin } from './admin.model.js';
import { Category } from './category.model.js';
import { ScenicSpot } from './scenic-spot.model.js';
import { Article } from './article.model.js';
import { Banner } from './banner.model.js';
import { HomeRecommend } from './home-recommend.model.js';
import { AiChatLog } from './ai-chat-log.model.js';
import { AiTripLog } from './ai-trip-log.model.js';
import { AiCopywritingLog } from './ai-copywriting-log.model.js';
import { SystemConfig } from './system-config.model.js';

Category.hasMany(ScenicSpot, {
  foreignKey: 'category_id',
  as: 'scenicSpots'
});

ScenicSpot.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

Category.hasMany(Article, {
  foreignKey: 'category_id',
  as: 'articles'
});

Article.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

export {
  sequelize,
  Admin,
  Category,
  ScenicSpot,
  Article,
  Banner,
  HomeRecommend,
  AiChatLog,
  AiTripLog,
  AiCopywritingLog,
  SystemConfig
};
