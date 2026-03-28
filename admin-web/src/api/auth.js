import request from './request';

export function loginApi(data) {
  return request({
    url: '/api/admin/auth/login',
    method: 'post',
    data
  });
}

export function getProfileApi() {
  return request({
    url: '/api/admin/auth/profile',
    method: 'get'
  });
}
