import request from './request';

export function getAiChatLogsApi(params) {
  return request({
    url: '/api/admin/ai/logs/chat',
    method: 'get',
    params
  });
}

export function getAiTripLogsApi(params) {
  return request({
    url: '/api/admin/ai/logs/trip',
    method: 'get',
    params
  });
}

export function getAiCopywritingLogsApi(params) {
  return request({
    url: '/api/admin/ai/logs/copywriting',
    method: 'get',
    params
  });
}
