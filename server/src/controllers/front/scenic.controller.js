import { sendSuccess } from '../../utils/response.js';
import { getScenicList, getScenicDetail } from '../../services/scenic.service.js';

export async function list(req, res, next) {
  try {
    const result = await getScenicList(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await getScenicDetail(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
