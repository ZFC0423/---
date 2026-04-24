import { randomUUID } from 'node:crypto';

import { sendError, sendSuccess } from '../../utils/response.js';
import { chatWithGanzhouAssistant, getRecommendQuestions } from '../../services/ai-chat.service.js';
import { generateGanzhouTripPlan } from '../../services/ai-trip.service.js';
import { routeIntent } from '../../services/ai/intent-router/index.js';
import { runKnowledgeGuideAgent } from '../../services/ai/knowledge-agent/index.js';
import { generateRoutePlan, generateRoutePlanNarrative, reviseRoutePlan } from '../../services/ai/route-planner-agent/index.js';
import { runDecisionDiscoveryAgent } from '../../services/ai/decision-discovery-agent/index.js';

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

function getClientIp(req) {
  const headers = req.headers || {};
  const forwarded = headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

export function buildRequestMeta(req, { createTraceId = randomUUID } = {}) {
  const headers = req.headers || {};
  const rawTraceId = typeof headers['x-trace-id'] === 'string' ? headers['x-trace-id'].trim() : '';

  return {
    trace_id: rawTraceId || createTraceId(),
    ip: getClientIp(req),
    user_agent: typeof headers['user-agent'] === 'string' ? headers['user-agent'] : ''
  };
}

export function createRoutePlanHandlers({
  generateRoutePlanService = generateRoutePlan,
  generateRoutePlanNarrativeService = generateRoutePlanNarrative,
  reviseRoutePlanService = reviseRoutePlan,
  createTraceId = randomUUID
} = {}) {
  return {
    async routePlanGenerate(req, res, next) {
      try {
        const result = await generateRoutePlanService(req.body || {}, {
          requestMeta: buildRequestMeta(req, { createTraceId })
        });

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        sendSuccess(res, result.value);
      } catch (error) {
        next(error);
      }
    },
    async routePlanNarrative(req, res, next) {
      const abortController = new AbortController();
      const requestMeta = buildRequestMeta(req, { createTraceId });

      const abortIfClientDisconnected = () => {
        if (!res.writableEnded && !abortController.signal.aborted) {
          abortController.abort();
        }
      };
      const onRequestClosed = () => {
        if (req.aborted || (res.destroyed && !res.writableEnded)) {
          abortIfClientDisconnected();
        }
      };
      const onResponseClosed = () => {
        if (!res.writableEnded) {
          abortIfClientDisconnected();
        }
      };

      if (typeof req.on === 'function') {
        req.on('aborted', abortIfClientDisconnected);
        req.on('close', onRequestClosed);
      }

      if (typeof res.on === 'function') {
        res.on('close', onResponseClosed);
      }

      try {
        const result = await generateRoutePlanNarrativeService(req.body || {}, {
          requestMeta,
          signal: abortController.signal
        });

        if (result.aborted || abortController.signal.aborted || res.writableEnded || res.headersSent) {
          return;
        }

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        const data = {
          narrative: result.value.narrative
        };

        if (shouldExposeIntentMeta(req)) {
          data._meta = {
            generation: result.value.generation_meta
          };
        }

        sendSuccess(res, data);
      } catch (error) {
        if (abortController.signal.aborted || res.writableEnded || res.headersSent) {
          return;
        }

        next(error);
      } finally {
        if (typeof req.off === 'function') {
          req.off('aborted', abortIfClientDisconnected);
          req.off('close', onRequestClosed);
        }

        if (typeof res.off === 'function') {
          res.off('close', onResponseClosed);
        }
      }
    },
    async routePlanRevise(req, res, next) {
      try {
        const result = await reviseRoutePlanService(req.body || {}, {
          requestMeta: buildRequestMeta(req, { createTraceId })
        });

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        sendSuccess(res, result.value);
      } catch (error) {
        next(error);
      }
    }
  };
}

const routePlanHandlers = createRoutePlanHandlers();
export const routePlanGenerate = routePlanHandlers.routePlanGenerate;
export const routePlanNarrative = routePlanHandlers.routePlanNarrative;
export const routePlanRevise = routePlanHandlers.routePlanRevise;

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

export async function discovery(req, res, next) {
  try {
    const result = await runDecisionDiscoveryAgent(req.body || {}, {
      requestMeta: buildRequestMeta(req)
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
