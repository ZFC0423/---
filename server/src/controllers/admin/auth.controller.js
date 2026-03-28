import { sendSuccess } from '../../utils/response.js';
import { getAdminProfile, loginAdmin } from '../../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await loginAdmin(username, password);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function profile(req, res, next) {
  try {
    const result = await getAdminProfile(req.auth.adminId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
