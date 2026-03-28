import { sendSuccess } from '../../utils/response.js';
import {
  createScenic,
  deleteScenic,
  getAdminScenicDetail,
  getAdminScenicList,
  updateScenic,
  updateScenicStatus
} from '../../services/admin-scenic.service.js';

export async function list(req, res, next) {
  try {
    const result = await getAdminScenicList(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await getAdminScenicDetail(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const result = await createScenic(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const result = await updateScenic(Number(req.params.id), req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await deleteScenic(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const result = await updateScenicStatus(Number(req.params.id), req.body.status);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
