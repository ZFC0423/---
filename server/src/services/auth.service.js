import { Admin } from '../models/index.js';
import { verifyPassword } from '../utils/password.js';
import { signAdminToken } from '../utils/jwt.js';

function formatAdminProfile(admin) {
  return {
    id: admin.id,
    username: admin.username,
    nickname: admin.nickname,
    avatar: admin.avatar,
    role: admin.role,
    status: admin.status,
    createdAt: admin.created_at
  };
}

export async function loginAdmin(username, password) {
  const admin = await Admin.findOne({
    where: {
      username,
      status: 1
    }
  });

  if (!admin) {
    const error = new Error('Admin account not found or disabled');
    error.statusCode = 401;
    throw error;
  }

  if (!verifyPassword(password, admin.password)) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  return {
    token: signAdminToken(admin),
    adminInfo: formatAdminProfile(admin)
  };
}

export async function getAdminProfile(adminId) {
  const admin = await Admin.findByPk(adminId);

  if (!admin || admin.status !== 1) {
    const error = new Error('Admin profile not found');
    error.statusCode = 401;
    throw error;
  }

  return formatAdminProfile(admin);
}
