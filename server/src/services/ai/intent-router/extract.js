import axios from 'axios';

import { env } from '../../../config/env.js';
import { buildIntentRouterMessages } from '../../../prompts/intent-router.prompt.js';
import { assertLlmMessagesContract } from '../_shared/llm-contract.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function createIntentExtractError(code, message, options = {}) {
  const error = new Error(message);
  error.code = code;

  if (options.cause) {
    error.cause = options.cause;
  }

  if (options.rawError) {
    error.rawError = options.rawError;
  }

  return error;
}

export function assertMessagesContract(messages) {
  return assertLlmMessagesContract(messages, {
    createError: createIntentExtractError
  });
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

function getTokenUsage(usage) {
  if (!usage) {
    return 0;
  }

  if (typeof usage.total_tokens === 'number') {
    return usage.total_tokens;
  }

  const promptTokens = Number(usage.prompt_tokens || usage.input_tokens || 0);
  const completionTokens = Number(usage.completion_tokens || usage.output_tokens || 0);
  return promptTokens + completionTokens;
}

async function postIntentModelRequest({ messages, timeout }) {
  assertMessagesContract(messages);

  if (!env.aiBaseUrl || !env.aiApiKey || !env.aiModel) {
    return { skipped: true };
  }

  const requestUrl = `${env.aiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await axios.post(
    requestUrl,
    {
      model: env.aiModel,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages
    },
    {
      timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.aiApiKey}`
      }
    }
  );

  return {
    skipped: false,
    data: response.data,
    model: response.data?.model || env.aiModel,
    tokenUsage: getTokenUsage(response.data?.usage)
  };
}

export async function extractIntentWithLlm({ normalizedInput, priorState }) {
  const messages = buildIntentRouterMessages({
    input: normalizedInput,
    priorState
  });

  try {
    const response = await postIntentModelRequest({
      messages,
      timeout: 20000
    });

    if (response.skipped) {
      return {
        skipped: true,
        _meta: {
          rule_hits: ['llm_skipped_missing_ai_env']
        }
      };
    }

    const content = extractMessageContent(response.data?.choices?.[0]?.message?.content);

    if (!content) {
      throw createIntentExtractError('schema_violation', 'intent router LLM returned empty content');
    }

    let parsed;

    try {
      parsed = JSON.parse(extractJsonText(content));
    } catch (error) {
      throw createIntentExtractError('invalid_json', 'intent router LLM returned invalid json');
    }

    return {
      ...parsed,
      _meta: {
        decision_source: 'llm',
        prior_state_usage: 'none',
        fallback_reason: null,
        missing_required_fields: [],
        rule_hits: ['llm_result_received'],
        conflict_codes: [],
        fallback_resolution: null,
        model_name: response.model,
        token_usage: response.tokenUsage
      }
    };
  } catch (error) {
    if (error.code === 'timeout' || error.code === 'invalid_json' || error.code === 'schema_violation') {
      throw error;
    }

    if (error.code === 'ECONNABORTED') {
      throw createIntentExtractError('timeout', 'intent router upstream request timed out', {
        cause: error,
        rawError: error
      });
    }

    if (error.response?.status) {
      throw createIntentExtractError(
        'schema_violation',
        error.response?.data?.error?.message || 'intent router upstream request failed',
        {
          cause: error,
          rawError: error
        }
      );
    }

    throw createIntentExtractError('schema_violation', error.message || 'intent router upstream request failed', {
      cause: error,
      rawError: error
    });
  }
}
