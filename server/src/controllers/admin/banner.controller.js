import { sendSuccess } from '../../utils/response.js';
import {
  createBanner,
  deleteBanner,
  getAdminBannerList,
  updateBanner
} from '../../services/admin-banner.service.js';

export async function list(req, res, next) {
  try {
    const result = await getAdminBannerList(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const result = await createBanner(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const result = await updateBanner(Number(req.params.id), req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await deleteBanner(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
