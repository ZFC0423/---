import request from './request';

export function getArticleListApi(params) {
  return request({
    url: '/api/admin/article/list',
    method: 'get',
    params
  });
}

export function getArticleDetailApi(id) {
  return request({
    url: `/api/admin/article/detail/${id}`,
    method: 'get'
  });
}

export function createArticleApi(data) {
  return request({
    url: '/api/admin/article/create',
    method: 'post',
    data
  });
}

export function updateArticleApi(id, data) {
  return request({
    url: `/api/admin/article/update/${id}`,
    method: 'put',
    data
  });
}

export function deleteArticleApi(id) {
  return request({
    url: `/api/admin/article/delete/${id}`,
    method: 'delete'
  });
}

export function updateArticleStatusApi(id, data) {
  return request({
    url: `/api/admin/article/status/${id}`,
    method: 'patch',
    data
  });
}
