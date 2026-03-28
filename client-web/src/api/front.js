import request from './request';

export function getHomeApi() {
  return request.get('/api/front/home');
}

export function getScenicListApi(params) {
  return request.get('/api/front/scenic/list', { params });
}

export function getScenicDetailApi(id) {
  return request.get(`/api/front/scenic/detail/${id}`);
}

export function getArticleListApi(params) {
  return request.get('/api/front/article/list', { params });
}

export function getArticleDetailApi(id) {
  return request.get(`/api/front/article/detail/${id}`);
}
