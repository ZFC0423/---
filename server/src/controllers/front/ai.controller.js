import { sendSuccess } from '../../utils/response.js';
import { chatWithGanzhouAssistant, getRecommendQuestions } from '../../services/ai-chat.service.js';
import { generateGanzhouTripPlan } from '../../services/ai-trip.service.js';
import { routeIntent } from '../../services/ai/intent-router/index.js';
import { runKnowledgeGuideAgent } from '../../services/ai/knowledge-agent/index.js';

function shouldExposeIntentMeta(req) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return req.headers['x-debug-intent'] === '1' || req.query?.debug === '1';
}

function stripIntentMeta(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return result;
  }

  const { _meta, ...publicResult } = result;
  return publicResult;
}

export async function recommendQuestions(req, res, next) {
  try {
    sendSuccess(res, getRecommendQuestions());
  } catch (error) {
    next(error);
  }
}

export async function chat(req, res, next) {
  try {
    const result = await chatWithGanzhouAssistant(req);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function tripPlan(req, res, next) {
  try {
    const result = await generateGanzhouTripPlan(req);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function intent(req, res, next) {
  try {
    const result = await routeIntent(req.body || {});
    sendSuccess(res, shouldExposeIntentMeta(req) ? result : stripIntentMeta(result));
  } catch (error) {
    next(error);
  }
}

export async function knowledge(req, res, next) {
  try {
    const result = await runKnowledgeGuideAgent(req.body || {}, {
      requestMeta: {
        ip: req.ip || req.socket?.remoteAddress || ''
      }
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
