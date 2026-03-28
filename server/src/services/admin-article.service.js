import { Op } from 'sequelize';
import { Article, Category } from '../models/index.js';

function parseTags(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNullable(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function formatArticleRecord(item) {
  return {
    id: item.id,
    title: item.title,
    categoryId: item.category_id,
    categoryName: item.category?.name || '',
    categoryCode: item.category?.code || '',
    coverImage: item.cover_image,
    summary: item.summary,
    content: item.content,
    source: item.source,
    author: item.author,
    tags: parseTags(item.tags),
    recommendFlag: item.recommend_flag,
    viewCount: item.view_count,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function buildArticlePayload(payload) {
  return {
    title: payload.title,
    category_id: Number(payload.categoryId),
    cover_image: normalizeNullable(payload.coverImage),
    summary: normalizeNullable(payload.summary),
    content: normalizeNullable(payload.content),
    source: normalizeNullable(payload.source),
    author: normalizeNullable(payload.author),
    tags: parseTags(payload.tags).join(','),
    recommend_flag: Number(payload.recommendFlag || 0),
    status: payload.status === undefined ? 1 : Number(payload.status)
  };
}

async function ensureArticleCategory(categoryId) {
  const category = await Category.findOne({
    where: {
      id: categoryId,
      type: 'article',
      status: 1
    }
  });

  if (!category) {
    const error = new Error('Invalid article category');
    error.statusCode = 400;
    throw error;
  }
}

export async function getAdminArticleList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = {};
  const categoryWhere = { type: 'article' };

  if (query.keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.keyword}%` } },
      { summary: { [Op.like]: `%${query.keyword}%` } },
      { tags: { [Op.like]: `%${query.keyword}%` } }
    ];
  }

  if (query.status !== undefined && query.status !== '') {
    where.status = Number(query.status);
  }

  if (query.categoryId) {
    where.category_id = Number(query.categoryId);
  }

  if (query.categoryCode) {
    categoryWhere.code = query.categoryCode;
  }

  const result = await Article.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code'],
        where: categoryWhere,
        required: true
      }
    ],
    order: [['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map(formatArticleRecord),
    total: result.count,
    page,
    pageSize
  };
}

export async function getAdminArticleDetail(id) {
  const record = await Article.findByPk(id, {
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
    const error = new Error('Article not found');
    error.statusCode = 404;
    throw error;
  }

  return formatArticleRecord(record);
}

export async function createArticle(payload) {
  await ensureArticleCategory(Number(payload.categoryId));

  const record = await Article.create(buildArticlePayload(payload));
  return getAdminArticleDetail(record.id);
}

export async function updateArticle(id, payload) {
  const record = await Article.findByPk(id);

  if (!record) {
    const error = new Error('Article not found');
    error.statusCode = 404;
    throw error;
  }

  await ensureArticleCategory(Number(payload.categoryId));
  await record.update(buildArticlePayload(payload));

  return getAdminArticleDetail(id);
}

export async function deleteArticle(id) {
  const record = await Article.findByPk(id);

  if (!record) {
    const error = new Error('Article not found');
    error.statusCode = 404;
    throw error;
  }

  await record.destroy();

  return {
    id,
    deleted: true
  };
}

export async function updateArticleStatus(id, status) {
  const record = await Article.findByPk(id);

  if (!record) {
    const error = new Error('Article not found');
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
