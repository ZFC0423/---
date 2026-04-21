import { AiChatLog } from '../../../models/index.js';
import { generateKnowledgeAnswer, getKnowledgeGuideProvider } from './generate.js';
import { buildMockKnowledgeGuideOutput } from './mock.js';
import { retrieveKnowledgeCandidates } from './retrieve.js';
import { buildEvidenceBundle } from './evidence.js';
import { KNOWLEDGE_NEXT_AGENT, KNOWLEDGE_TASK_TYPE } from './contracts.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function createKnowledgeAgentError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isStringArrayOrNull(value) {
  return value === null || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function validateRouterResult(routerResult) {
  if (!routerResult || typeof routerResult !== 'object' || Array.isArray(routerResult)) {
    throw createKnowledgeAgentError('routerResult must be an object');
  }

  if (routerResult.task_type !== KNOWLEDGE_TASK_TYPE) {
    throw createKnowledgeAgentError('routerResult.task_type must be guide_understand');
  }

  if (routerResult.clarification_needed !== false) {
    throw createKnowledgeAgentError('routerResult.clarification_needed must be false');
  }

  if (routerResult.clarification_reason !== null) {
    throw createKnowledgeAgentError('routerResult.clarification_reason must be null');
  }

  if (routerResult.next_agent !== KNOWLEDGE_NEXT_AGENT) {
    throw createKnowledgeAgentError('routerResult.next_agent must be ai_chat');
  }

  if (!Array.isArray(routerResult.missing_required_fields) || routerResult.missing_required_fields.length) {
    throw createKnowledgeAgentError('routerResult.missing_required_fields must be an empty array');
  }

  if (!Array.isArray(routerResult.clarification_questions) || routerResult.clarification_questions.length) {
    throw createKnowledgeAgentError('routerResult.clarification_questions must be an empty array');
  }

  if (typeof routerResult.task_confidence !== 'number' || Number.isNaN(routerResult.task_confidence)) {
    throw createKnowledgeAgentError('routerResult.task_confidence must be a number');
  }

  const constraints = routerResult.constraints;

  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    throw createKnowledgeAgentError('routerResult.constraints must be an object');
  }

  if (!normalizeText(constraints.user_query)) {
    throw createKnowledgeAgentError('routerResult.constraints.user_query is required');
  }

  const arrayFields = [
    'subject_entities',
    'theme_preferences',
    'region_hints',
    'scenic_hints',
    'hard_avoidances',
    'companions'
  ];

  arrayFields.forEach((field) => {
    if (!isStringArrayOrNull(constraints[field] ?? null)) {
      throw createKnowledgeAgentError(`routerResult.constraints.${field} must be a string array or null`);
    }
  });

  return {
    ...routerResult,
    constraints: {
      user_query: normalizeText(constraints.user_query),
      subject_entities: constraints.subject_entities ?? null,
      theme_preferences: constraints.theme_preferences ?? null,
      region_hints: constraints.region_hints ?? null,
      scenic_hints: constraints.scenic_hints ?? null,
      hard_avoidances: constraints.hard_avoidances ?? null,
      companions: constraints.companions ?? null
    }
  };
}

async function persistKnowledgeLog({ routerResult, result, provider, requestMeta }) {
  if (process.env.NODE_ENV === 'test' || provider === 'mock') {
    return;
  }

  try {
    await AiChatLog.create({
      question: routerResult.constraints.user_query,
      answer: JSON.stringify(result.answer),
      matched_context: JSON.stringify({
        evidence: result.evidence,
        _meta: result._meta || null
      }),
      model_name: provider === 'llm' ? (process.env.AI_MODEL || null) : provider,
      token_usage: 0,
      ip: requestMeta?.ip || ''
    });
  } catch (error) {
    console.warn('[knowledge-agent] failed to persist ai_chat_logs entry', {
      message: error?.message || 'unknown'
    });
  }
}

function normalizeGeneratedAnswerResult(generatedResult) {
  if (
    generatedResult &&
    typeof generatedResult === 'object' &&
    !Array.isArray(generatedResult) &&
    Object.prototype.hasOwnProperty.call(generatedResult, 'answer') &&
    Object.prototype.hasOwnProperty.call(generatedResult, 'generation_meta')
  ) {
    return generatedResult;
  }

  return {
    answer: generatedResult,
    generation_meta: {
      provider: 'llm',
      fallback_used: false,
      fallback_reason: null,
      raw_error_code: null,
      raw_error_message: null
    }
  };
}

export function createKnowledgeGuideAgent({
  resolveProvider = getKnowledgeGuideProvider,
  mockGuideOutput = buildMockKnowledgeGuideOutput,
  retrieveCandidates = retrieveKnowledgeCandidates,
  buildEvidence = buildEvidenceBundle,
  generateAnswer = generateKnowledgeAnswer,
  writeLog = persistKnowledgeLog
} = {}) {
  return async function runKnowledgeGuideAgent(payload = {}, { requestMeta = {} } = {}) {
    const routerResult = validateRouterResult(payload.routerResult);
    const provider = resolveProvider();

    if (provider === 'mock') {
      const mockResult = mockGuideOutput({ routerResult });
      await writeLog({ routerResult, result: mockResult, provider, requestMeta });
      return mockResult;
    }

    const retrievalResult = await retrieveCandidates({ routerResult });
    const evidenceBundle = buildEvidence({ retrievalResult });
    const generatedAnswerResult = normalizeGeneratedAnswerResult(await generateAnswer({
      routerResult,
      evidenceBundle,
      provider
    }));

    const internalResult = {
      task_type: KNOWLEDGE_TASK_TYPE,
      retrieval_status: evidenceBundle.retrieval_status,
      evidence_status: evidenceBundle.evidence_status,
      answer: generatedAnswerResult.answer,
      evidence: evidenceBundle.evidence,
      _meta: {
        answer_generation: generatedAnswerResult.generation_meta
      }
    };

    await writeLog({ routerResult, result: internalResult, provider, requestMeta });

    const { _meta, ...publicResult } = internalResult;
    return publicResult;
  };
}

export const runKnowledgeGuideAgent = createKnowledgeGuideAgent();
