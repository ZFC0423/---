import request from './request';

export function postScenicCopywritingApi(data) {
  return request({
    url: '/api/admin/ai/copywriting/scenic',
    method: 'post',
    data,
    timeout: 30000
  });
}
