import { Banner } from '../models/index.js';

function normalizeNullable(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function formatBannerRecord(item) {
  return {
    id: item.id,
    title: item.title,
    imageUrl: item.image_url,
    linkType: item.link_type,
    linkTarget: item.link_target,
    sort: item.sort,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function buildBannerPayload(payload) {
  return {
    title: payload.title,
    image_url: payload.imageUrl,
    link_type: normalizeNullable(payload.linkType),
    link_target: normalizeNullable(payload.linkTarget),
    sort: Number(payload.sort || 0),
    status: payload.status === undefined ? 1 : Number(payload.status)
  };
}

export async function getAdminBannerList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = {};

  const result = await Banner.findAndCountAll({
    where,
    order: [['sort', 'ASC'], ['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map(formatBannerRecord),
    total: result.count,
    page,
    pageSize
  };
}

export async function createBanner(payload) {
  const record = await Banner.create(buildBannerPayload(payload));
  return formatBannerRecord(record);
}

export async function updateBanner(id, payload) {
  const record = await Banner.findByPk(id);

  if (!record) {
    const error = new Error('Banner not found');
    error.statusCode = 404;
    throw error;
  }

  await record.update(buildBannerPayload(payload));
  return formatBannerRecord(record);
}

export async function deleteBanner(id) {
  const record = await Banner.findByPk(id);

  if (!record) {
    const error = new Error('Banner not found');
    error.statusCode = 404;
    throw error;
  }

  await record.destroy();

  return {
    id,
    deleted: true
  };
}
