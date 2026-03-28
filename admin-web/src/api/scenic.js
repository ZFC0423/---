import request from './request';

export function getScenicListApi(params) {
  return request({
    url: '/api/admin/scenic/list',
    method: 'get',
    params
  });
}

export function getScenicDetailApi(id) {
  return request({
    url: `/api/admin/scenic/detail/${id}`,
    method: 'get'
  });
}

export function createScenicApi(data) {
  return request({
    url: '/api/admin/scenic/create',
    method: 'post',
    data
  });
}

export function updateScenicApi(id, data) {
  return request({
    url: `/api/admin/scenic/update/${id}`,
    method: 'put',
    data
  });
}

export function deleteScenicApi(id) {
  return request({
    url: `/api/admin/scenic/delete/${id}`,
    method: 'delete'
  });
}

export function updateScenicStatusApi(id, data) {
  return request({
    url: `/api/admin/scenic/status/${id}`,
    method: 'patch',
    data
  });
}
