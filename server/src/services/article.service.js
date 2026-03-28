import { Op } from 'sequelize';
import { Article, Category } from '../models/index.js';

function parseStringList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatArticleItem(item) {
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
    tags: parseStringList(item.tags),
    recommendFlag: item.recommend_flag,
    viewCount: item.view_count,
    status: item.status,
    createdAt: item.created_at
  };
}

export async function getArticleList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = { status: 1 };
  const categoryWhere = { status: 1, type: 'article' };

  if (query.keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.keyword}%` } },
      { summary: { [Op.like]: `%${query.keyword}%` } },
      { tags: { [Op.like]: `%${query.keyword}%` } }
    ];
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
        where: categoryWhere
      }
    ],
    order: [['recommend_flag', 'DESC'], ['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map(formatArticleItem),
    total: result.count,
    page,
    pageSize
  };
}

export async function getArticleDetail(id) {
  const article = await Article.findOne({
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

  if (!article) {
    const error = new Error('Article not found');
    error.statusCode = 404;
    throw error;
  }

  await article.increment('view_count', { by: 1 });
  await article.reload({
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  const relatedRows = await Article.findAll({
    where: {
      id: { [Op.ne]: id },
      category_id: article.category_id,
      status: 1
    },
    order: [['recommend_flag', 'DESC'], ['id', 'DESC']],
    limit: 3
  });

  return {
    ...formatArticleItem(article),
    relatedList: relatedRows.map((item) => ({
      id: item.id,
      title: item.title,
      coverImage: item.cover_image,
      summary: item.summary,
      tags: parseStringList(item.tags)
    }))
  };
}
