import request from './request';

export function getRecommendQuestionsApi() {
  return request.get('/api/front/ai/recommend-questions');
}

export function postAiChatApi(data) {
  return request.post('/api/front/ai/chat', data, {
    timeout: 30000
  });
}

export function postAiTripPlanApi(data) {
  return request.post('/api/front/ai/trip-plan', data, {
    timeout: 40000
  });
}

export function postDiscoveryQueryApi(data) {
  return request.post('/api/front/ai/discovery/query', data, {
    timeout: 30000
  });
}

export function postRoutePlanGenerateApi(data) {
  return request.post('/api/front/ai/route-plan/generate', data, {
    timeout: 40000
  });
}
