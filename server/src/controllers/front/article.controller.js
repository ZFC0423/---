import { sendSuccess } from '../../utils/response.js';
import { getArticleList, getArticleDetail } from '../../services/article.service.js';

export async function list(req, res, next) {
  try {
    const result = await getArticleList(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await getArticleDetail(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
