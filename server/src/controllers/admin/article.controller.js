import { sendSuccess } from '../../utils/response.js';
import {
  createArticle,
  deleteArticle,
  getAdminArticleDetail,
  getAdminArticleList,
  updateArticle,
  updateArticleStatus
} from '../../services/admin-article.service.js';

export async function list(req, res, next) {
  try {
    const result = await getAdminArticleList(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await getAdminArticleDetail(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const result = await createArticle(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const result = await updateArticle(Number(req.params.id), req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await deleteArticle(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const result = await updateArticleStatus(Number(req.params.id), req.body.status);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
