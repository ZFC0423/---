import axios from 'axios';

import { env } from '../../../config/env.js';
import { buildKnowledgeGuideMessages } from '../../../prompts/knowledge-guide.prompt.js';
import { assertLlmMessagesContract } from '../_shared/llm-contract.js';
import { ALLOWED_BLOCK_TYPES } from './contracts.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function extractMessageContent(messageContent) {
  if (typeof messageContent === 'string') {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item?.type === 'text') {
          return item.text || '';
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function extractJsonText(rawText) {
  const normalized = normalizeText(rawText);

  if (!normalized) {
    return '';
  }

  const fencedMatch = normalized.match(/```json\s*([\s\S]*?)```/i) || normalized.match(/```\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = normalized.indexOf('{');
  const end = normalized.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    return normalized.slice(start, end + 1);
  }

  return normalized;
}

function getAiConfig() {
  return {
    baseUrl: process.env.AI_BASE_URL || env.aiBaseUrl || '',
    apiKey: process.env.AI_API_KEY || env.aiApiKey || '',
    model: process.env.AI_MODEL || env.aiModel || ''
  };
}

function createKnowledgeGenerateError(code, message, options = {}) {
  const error = new Error(message);
  error.code = code;

  if (options.cause) {
    error.cause = options.cause;
  }

  return error;
}

function createAnswerGenerationMeta({
  provider,
  fallbackUsed,
  fallbackReason,
  rawErrorCode = null,
  rawErrorMessage = null
}) {
  return {
    provider,
    fallback_used: fallbackUsed,
    fallback_reason: fallbackReason,
    raw_error_code: rawErrorCode,
    raw_error_message: rawErrorMessage
  };
}

function mapGenerationFallbackReason(error) {
  if (!error) {
    return 'unknown_error';
  }

  if (error.code === 'timeout' || error.code === 'invalid_json' || error.code === 'schema_violation') {
    return error.code;
  }

  if (error.code === 'ECONNABORTED') {
    return 'timeout';
  }

  if (error.response?.status) {
    return 'upstream_http_error';
  }

  return 'unknown_error';
}

function buildAnswerPreview(citations = []) {
  return citations
    .slice(0, 2)
    .map((citation) => `${citation.source_title}提到：${citation.excerpt}`)
    .join(' ');
}

export function getKnowledgeGuideProvider() {
  const provider = normalizeText(process.env.AI_GUIDE_PROVIDER || env.aiGuideProvider || 'mock').toLowerCase();
  return provider === 'llm' ? 'llm' : 'mock';
}

export function buildDeterministicAnswer({ routerResult, evidenceBundle }) {
  const query = normalizeText(routerResult?.constraints?.user_query) || '这个问题';
  const citations = evidenceBundle?.evidence?.citations || [];

  if (evidenceBundle?.retrieval_status === 'empty') {
    return {
      lead_title: '当前资料暂未命中',
      answer_blocks: [
        {
          type: 'uncertainty',
          title: '资料状态',
          content: `基于当前站内资料，暂未检索到能直接支撑“${query}”的内容，因此这里不能给出确定讲解。`
        }
      ],
      uncertainty_note: '当前是零命中场景，建议补充更具体的景点、主题或区域线索。'
    };
  }

  if (evidenceBundle?.evidence_status === 'insufficient') {
    return {
      lead_title: '可提供部分讲解，但证据不足',
      answer_blocks: [
        {
          type: 'direct_answer',
          title: '当前能确认的部分',
          content: buildAnswerPreview(citations) || '当前只检索到少量相关资料。'
        },
        {
          type: 'uncertainty',
          title: '不确定说明',
          content: '这些资料可以帮助理解部分背景，但不足以支撑更完整、更确定的结论。'
        }
      ],
      uncertainty_note: '当前回答基于有限证据生成，应视为保守解释而非完整定论。'
    };
  }

  return {
    lead_title: '站内资料讲解结果',
    answer_blocks: [
      {
        type: 'direct_answer',
        title: '核心讲解',
        content: buildAnswerPreview(citations) || `已结合站内资料对“${query}”生成讲解结果。`
      },
      {
        type: 'context',
        title: '证据来源',
        content: citations.map((citation) => `${citation.source_title}（${citation.source_field}）`).join('；')
      }
    ],
    uncertainty_note: null
  };
}

function validateGeneratedAnswer(answer) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    throw createKnowledgeGenerateError('schema_violation', 'knowledge answer must be an object');
  }

  if (!normalizeText(answer.lead_title)) {
    throw createKnowledgeGenerateError('schema_violation', 'knowledge answer lead_title is required');
  }

  if (!Array.isArray(answer.answer_blocks) || !answer.answer_blocks.length) {
    throw createKnowledgeGenerateError('schema_violation', 'knowledge answer_blocks must be a non-empty array');
  }

  answer.answer_blocks.forEach((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) {
      throw createKnowledgeGenerateError('schema_violation', 'knowledge answer block is invalid');
    }

    if (!ALLOWED_BLOCK_TYPES.includes(block.type)) {
      throw createKnowledgeGenerateError('schema_violation', 'knowledge answer block type is invalid');
    }

    if (!normalizeText(block.title) || !normalizeText(block.content)) {
      throw createKnowledgeGenerateError('schema_violation', 'knowledge answer block title/content is required');
    }
  });

  return {
    lead_title: normalizeText(answer.lead_title),
    answer_blocks: answer.answer_blocks.map((block) => ({
      type: block.type,
      title: normalizeText(block.title),
      content: normalizeText(block.content)
    })),
    uncertainty_note: answer.uncertainty_note == null ? null : normalizeText(answer.uncertainty_note)
  };
}

function getModelText(payload) {
  return (
    extractMessageContent(payload?.choices?.[0]?.message?.content) ||
    extractMessageContent(payload?.output?.choices?.[0]?.message?.content) ||
    extractMessageContent(payload?.data?.choices?.[0]?.message?.content)
  );
}

export async function generateKnowledgeAnswer({
  routerResult,
  evidenceBundle,
  provider = 'llm',
  axiosClient = axios,
  buildMessages = buildKnowledgeGuideMessages
} = {}) {
  if (provider !== 'llm') {
    return {
      answer: buildDeterministicAnswer({ routerResult, evidenceBundle }),
      generation_meta: createAnswerGenerationMeta({
        provider,
        fallbackUsed: false,
        fallbackReason: null
      })
    };
  }

  try {
    const messages = buildMessages({
      userQuery: routerResult?.constraints?.user_query,
      evidenceBundle
    });

    assertLlmMessagesContract(messages, {
      createError: createKnowledgeGenerateError
    });

    const config = getAiConfig();

    if (!config.baseUrl || !config.apiKey || !config.model) {
      return {
        answer: buildDeterministicAnswer({ routerResult, evidenceBundle }),
        generation_meta: createAnswerGenerationMeta({
          provider,
          fallbackUsed: true,
          fallbackReason: 'missing_ai_env'
        })
      };
    }

    const response = await axiosClient.post(
      `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        model: config.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        }
      }
    );

    const rawText = getModelText(response?.data);
    let parsed;

    try {
      parsed = JSON.parse(extractJsonText(rawText));
    } catch (error) {
      throw createKnowledgeGenerateError('invalid_json', 'knowledge guide LLM returned invalid json', {
        cause: error
      });
    }

    return {
      answer: validateGeneratedAnswer(parsed),
      generation_meta: createAnswerGenerationMeta({
        provider,
        fallbackUsed: false,
        fallbackReason: null
      })
    };
  } catch (error) {
    return {
      answer: buildDeterministicAnswer({ routerResult, evidenceBundle }),
      generation_meta: createAnswerGenerationMeta({
        provider,
        fallbackUsed: true,
        fallbackReason: mapGenerationFallbackReason(error),
        rawErrorCode: error?.code || null,
        rawErrorMessage: error?.message || null
      })
    };
  }
}
