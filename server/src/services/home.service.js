import { Op } from 'sequelize';
import { Banner, HomeRecommend, ScenicSpot, Article, SystemConfig } from '../models/index.js';

function parseStringList(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function formatScenicItem(item) {
  return {
    id: item.id,
    name: item.name,
    region: item.region,
    coverImage: item.cover_image,
    intro: item.intro,
    tags: parseStringList(item.tags),
    hotScore: item.hot_score,
    recommendFlag: item.recommend_flag
  };
}

function formatArticleItem(item) {
  return {
    id: item.id,
    title: item.title,
    coverImage: item.cover_image,
    summary: item.summary,
    tags: parseStringList(item.tags),
    recommendFlag: item.recommend_flag,
    categoryId: item.category_id
  };
}

async function getModuleList(moduleName) {
  const recommends = await HomeRecommend.findAll({
    where: {
      module_name: moduleName,
      status: 1
    },
    order: [['sort', 'ASC'], ['id', 'DESC']]
  });

  const scenicIds = recommends.filter((item) => item.target_type === 'scenic').map((item) => item.target_id);
  const articleIds = recommends.filter((item) => item.target_type === 'article').map((item) => item.target_id);

  const scenicRows = scenicIds.length
    ? await ScenicSpot.findAll({ where: { id: { [Op.in]: scenicIds }, status: 1 } })
    : [];
  const articleRows = articleIds.length
    ? await Article.findAll({ where: { id: { [Op.in]: articleIds }, status: 1 } })
    : [];

  const scenicMap = new Map(scenicRows.map((item) => [Number(item.id), formatScenicItem(item)]));
  const articleMap = new Map(articleRows.map((item) => [Number(item.id), formatArticleItem(item)]));

  return recommends
    .map((item) => {
      if (item.target_type === 'scenic') {
        return scenicMap.get(Number(item.target_id));
      }

      if (item.target_type === 'article') {
        return articleMap.get(Number(item.target_id));
      }

      return null;
    })
    .filter(Boolean);
}

export async function getHomeData() {
  const [banners, siteNameConfig, siteDescriptionConfig, scenicList, foodList, heritageList, redCultureList] = await Promise.all([
    Banner.findAll({ where: { status: 1 }, order: [['sort', 'ASC'], ['id', 'DESC']] }),
    SystemConfig.findOne({ where: { config_key: 'site_name' } }),
    SystemConfig.findOne({ where: { config_key: 'site_description' } }),
    getModuleList('scenic'),
    getModuleList('food'),
    getModuleList('heritage'),
    getModuleList('red_culture')
  ]);

  return {
    siteName: siteNameConfig?.config_value || 'Ganzhou Travel Platform',
    siteDescription: siteDescriptionConfig?.config_value || 'Ganzhou travel and culture service platform',
    banners: banners.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url,
      linkType: item.link_type,
      linkTarget: item.link_target,
      sort: item.sort
    })),
    recommends: {
      scenic: scenicList,
      food: foodList,
      heritage: heritageList,
      redCulture: redCultureList
    }
  };
}
