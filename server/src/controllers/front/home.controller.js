import { sendSuccess } from '../../utils/response.js';
import { getHomeData } from '../../services/home.service.js';

export async function getHome(req, res, next) {
  try {
    const result = await getHomeData();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
