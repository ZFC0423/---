import { Op } from 'sequelize';
import { ScenicSpot, Category } from '../models/index.js';

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
    categoryId: item.category_id,
    categoryName: item.category?.name || '',
    coverImage: item.cover_image,
    galleryImages: parseStringList(item.gallery_images),
    intro: item.intro,
    cultureDesc: item.culture_desc,
    openTime: item.open_time,
    ticketInfo: item.ticket_info,
    suggestedDuration: item.suggested_duration,
    address: item.address,
    trafficGuide: item.traffic_guide,
    tips: item.tips,
    tags: parseStringList(item.tags),
    recommendFlag: item.recommend_flag,
    hotScore: item.hot_score,
    status: item.status,
    createdAt: item.created_at
  };
}

export async function getScenicList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = { status: 1 };

  if (query.keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.keyword}%` } },
      { intro: { [Op.like]: `%${query.keyword}%` } },
      { region: { [Op.like]: `%${query.keyword}%` } }
    ];
  }

  if (query.region) {
    where.region = query.region;
  }

  if (query.tag) {
    where.tags = {
      [Op.like]: `%${query.tag}%`
    };
  }

  const result = await ScenicSpot.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map(formatScenicItem),
    total: result.count,
    page,
    pageSize
  };
}

export async function getScenicDetail(id) {
  const scenic = await ScenicSpot.findOne({
    where: {
      id,
      status: 1
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  if (!scenic) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  const relatedRows = await ScenicSpot.findAll({
    where: {
      id: { [Op.ne]: id },
      status: 1,
      [Op.or]: [
        { region: scenic.region },
        { category_id: scenic.category_id }
      ]
    },
    order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'DESC']],
    limit: 3
  });

  return {
    ...formatScenicItem(scenic),
    relatedList: relatedRows.map((item) => ({
      id: item.id,
      name: item.name,
      coverImage: item.cover_image,
      region: item.region,
      tags: parseStringList(item.tags)
    }))
  };
}
