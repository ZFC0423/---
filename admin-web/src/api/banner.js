import request from './request';

export function getBannerListApi(params) {
  return request({
    url: '/api/admin/banner/list',
    method: 'get',
    params
  });
}

export function createBannerApi(data) {
  return request({
    url: '/api/admin/banner/create',
    method: 'post',
    data
  });
}

export function updateBannerApi(id, data) {
  return request({
    url: `/api/admin/banner/update/${id}`,
    method: 'put',
    data
  });
}

export function deleteBannerApi(id) {
  return request({
    url: `/api/admin/banner/delete/${id}`,
    method: 'delete'
  });
}
