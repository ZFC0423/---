import { Op } from 'sequelize';
import { Category, ScenicSpot } from '../models/index.js';

function parseListField(value) {
  if (Array.isArray(value)) {
    return value;
  }

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

function stringifyListField(value) {
  return JSON.stringify(parseListField(value));
}

function normalizeNullable(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function formatScenicRecord(item) {
  return {
    id: item.id,
    name: item.name,
    region: item.region,
    categoryId: item.category_id,
    categoryName: item.category?.name || '',
    coverImage: item.cover_image,
    galleryImages: parseListField(item.gallery_images),
    intro: item.intro,
    cultureDesc: item.culture_desc,
    openTime: item.open_time,
    ticketInfo: item.ticket_info,
    suggestedDuration: item.suggested_duration,
    address: item.address,
    trafficGuide: item.traffic_guide,
    tips: item.tips,
    tags: parseListField(item.tags),
    recommendFlag: item.recommend_flag,
    hotScore: item.hot_score,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function buildScenicPayload(payload) {
  return {
    name: payload.name,
    region: payload.region,
    category_id: normalizeNullable(payload.categoryId),
    cover_image: normalizeNullable(payload.coverImage),
    gallery_images: stringifyListField(payload.galleryImages),
    intro: normalizeNullable(payload.intro),
    culture_desc: normalizeNullable(payload.cultureDesc),
    open_time: normalizeNullable(payload.openTime),
    ticket_info: normalizeNullable(payload.ticketInfo),
    suggested_duration: normalizeNullable(payload.suggestedDuration),
    address: normalizeNullable(payload.address),
    traffic_guide: normalizeNullable(payload.trafficGuide),
    tips: normalizeNullable(payload.tips),
    tags: parseListField(payload.tags).join(','),
    recommend_flag: Number(payload.recommendFlag || 0),
    hot_score: Number(payload.hotScore || 0),
    status: payload.status === undefined ? 1 : Number(payload.status)
  };
}

async function ensureCategoryExists(categoryId) {
  if (!categoryId) {
    return;
  }

  const category = await Category.findOne({
    where: {
      id: categoryId,
      type: 'scenic',
      status: 1
    }
  });

  if (!category) {
    const error = new Error('Invalid scenic category');
    error.statusCode = 400;
    throw error;
  }
}

export async function getAdminScenicList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = {};

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

  if (query.status !== undefined && query.status !== '') {
    where.status = Number(query.status);
  }

  if (query.categoryId) {
    where.category_id = Number(query.categoryId);
  }

  const result = await ScenicSpot.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code'],
        required: false
      }
    ],
    order: [['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map(formatScenicRecord),
    total: result.count,
    page,
    pageSize
  };
}

export async function getAdminScenicDetail(id) {
  const record = await ScenicSpot.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code'],
        required: false
      }
    ]
  });

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  return formatScenicRecord(record);
}

export async function createScenic(payload) {
  await ensureCategoryExists(payload.categoryId);

  const record = await ScenicSpot.create(buildScenicPayload(payload));
  return getAdminScenicDetail(record.id);
}

export async function updateScenic(id, payload) {
  const record = await ScenicSpot.findByPk(id);

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  await ensureCategoryExists(payload.categoryId);
  await record.update(buildScenicPayload(payload));

  return getAdminScenicDetail(id);
}

export async function deleteScenic(id) {
  const record = await ScenicSpot.findByPk(id);

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  await record.destroy();

  return {
    id,
    deleted: true
  };
}

export async function updateScenicStatus(id, status) {
  const record = await ScenicSpot.findByPk(id);

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  await record.update({
    status: Number(status)
  });

  return {
    id: record.id,
    status: record.status
  };
}
