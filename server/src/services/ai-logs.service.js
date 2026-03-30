import {
  AiChatLog,
  AiCopywritingLog,
  AiTripLog
} from '../models/index.js';

function normalizePositiveInt(value, defaultValue) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultValue;
  }

  return parsed;
}

function parsePagination(query = {}) {
  const page = normalizePositiveInt(query.page, 1);
  const pageSize = Math.min(normalizePositiveInt(query.pageSize, 10), 20);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

function buildPaginationData(count, page, pageSize) {
  return {
    page,
    pageSize,
    total: count
  };
}

async function findLogs(Model, attributes, query) {
  const { page, pageSize, offset } = parsePagination(query);

  const result = await Model.findAndCountAll({
    attributes,
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map((item) => item.get({ plain: true })),
    pagination: buildPaginationData(result.count, page, pageSize)
  };
}

export async function getAiChatLogs(query) {
  return findLogs(
    AiChatLog,
    ['id', 'question', 'answer', 'matched_context', 'model_name', 'token_usage', 'created_at'],
    query
  );
}

export async function getAiTripLogs(query) {
  return findLogs(
    AiTripLog,
    ['id', 'days', 'preferences', 'departure_area', 'pace', 'extra_requirement', 'result_content', 'model_name', 'token_usage', 'created_at'],
    query
  );
}

export async function getAiCopywritingLogs(query) {
  return findLogs(
    AiCopywritingLog,
    ['id', 'target_type', 'target_id', 'input_data', 'output_content', 'prompt_text', 'model_name', 'token_usage', 'created_at'],
    query
  );
}
