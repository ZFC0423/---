import axios from 'axios';
import { ElMessage } from 'element-plus';
import { clearToken, getToken } from '../utils/auth';

const request = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:3000',
  timeout: 10000
});

request.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';

    if (error.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }

    ElMessage.error(message);
    return Promise.reject(error);
  }
);

export default request;
