import axios from 'axios';
import { Op } from 'sequelize';

import { env } from '../config/env.js';
import { AiCopywritingLog, Article, ScenicSpot } from '../models/index.js';
import { buildScenicCopywritingMessages } from '../prompts/copywriting.prompt.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function shortenText(value, maxLength) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function sanitizeInput(payload = {}) {
  return {
    targetId: payload.targetId === null || payload.targetId === undefined || payload.targetId === ''
      ? null
      : Number(payload.targetId),
    name: normalizeText(payload.name).slice(0, 100),
    region: normalizeText(payload.region).slice(0, 100),
    tags: parseTags(payload.tags),
    notes: normalizeText(payload.notes).slice(0, 200)
  };
}

function assertValidInput(input) {
  if (!input.name) {
    const error = new Error('name is required');
    error.statusCode = 400;
    throw error;
  }

  if (input.targetId !== null && (!Number.isInteger(input.targetId) || input.targetId < 1)) {
    const error = new Error('targetId must be a positive integer');
    error.statusCode = 400;
    throw error;
  }
}

function buildSearchTerms(input) {
  const terms = new Set();

  terms.add(input.name);

  if (input.region) {
    terms.add(input.region);
  }

  input.tags.forEach((tag) => terms.add(tag));

  input.notes
    .split(/[\s,，。！？、；;()（）【】“”"'`]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 6)
    .forEach((item) => terms.add(item));

  return Array.from(terms).filter(Boolean).slice(0, 12);
}

function buildScenicConditions(terms) {
  return terms.flatMap((term) => ([
    { name: { [Op.like]: `%${term}%` } },
    { region: { [Op.like]: `%${term}%` } },
    { tags: { [Op.like]: `%${term}%` } },
    { intro: { [Op.like]: `%${term}%` } },
    { culture_desc: { [Op.like]: `%${term}%` } }
  ]));
}

function buildArticleConditions(terms) {
  return terms.flatMap((term) => ([
    { title: { [Op.like]: `%${term}%` } },
    { summary: { [Op.like]: `%${term}%` } },
    { tags: { [Op.like]: `%${term}%` } },
    { content: { [Op.like]: `%${term}%` } }
  ]));
}

function parseStringList(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch (error) {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function formatScenicContext(item) {
  return {
    type: 'scenic',
    id: Number(item.id),
    title: item.name,
    region: item.region || '',
    tags: parseStringList(item.tags),
    summary: shortenText(item.intro || item.culture_desc, 140)
  };
}

function formatArticleContext(item) {
  return {
    type: 'article',
    id: Number(item.id),
    title: item.title,
    tags: parseStringList(item.tags),
    summary: shortenText(item.summary || item.content, 140)
  };
}

function dedupeContextItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.type}-${item.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function recallMatchedContext(input) {
  const terms = buildSearchTerms(input);
  const scenicWhere = terms.length ? { status: 1, [Op.or]: buildScenicConditions(terms) } : { status: 1 };
  const articleWhere = terms.length ? { status: 1, [Op.or]: buildArticleConditions(terms) } : { status: 1 };

  const [targetScenic, scenicRows, articleRows] = await Promise.all([
    input.targetId ? ScenicSpot.findByPk(input.targetId) : null,
    ScenicSpot.findAll({
      where: scenicWhere,
      order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'DESC']],
      limit: 2
    }),
    Article.findAll({
      where: articleWhere,
      order: [['recommend_flag', 'DESC'], ['view_count', 'DESC'], ['id', 'DESC']],
      limit: 2
    })
  ]);

  return dedupeContextItems([
    ...(targetScenic ? [formatScenicContext(targetScenic)] : []),
    ...scenicRows.map(formatScenicContext),
    ...articleRows.map(formatArticleContext)
  ]).slice(0, 4);
}

function buildContextText(matchedContext) {
  if (!matchedContext.length) {
    return '';
  }

  return matchedContext.map((item, index) => {
    const parts = [
      `${index + 1}. Type: ${item.type}`,
      `Title: ${item.title}`
    ];

    if (item.region) {
      parts.push(`Region: ${item.region}`);
    }

    if (item.tags.length) {
      parts.push(`Tags: ${item.tags.join(', ')}`);
    }

    if (item.summary) {
      parts.push(`Summary: ${item.summary}`);
    }

    return parts.join('\n');
  }).join('\n\n');
}

function serializeMessages(messages) {
  return messages
    .map((item) => `[${item.role}]\n${item.content}`)
    .join('\n\n');
}

function getAiConfigState() {
  return {
    baseUrl: env.aiBaseUrl || '',
    model: env.aiModel || '',
    hasApiKey: Boolean(env.aiApiKey)
  };
}

function logAiInfo(message, extra = {}) {
  console.info('[ai-copywriting]', message, extra);
}

function logAiWarn(message, extra = {}) {
  console.warn('[ai-copywriting]', message, extra);
}

function logAiError(message, extra = {}) {
  console.error('[ai-copywriting]', message, extra);
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

function ensureScenicName(text, scenicName, maxLength) {
  const normalized = shortenText(text, maxLength);

  if (!normalized) {
    return '';
  }

  if (normalized.includes(scenicName)) {
    return normalized;
  }

  const trimmedBody = normalized.replace(/^(该景点|该处景观|该处|这一景点|这里)/, '').replace(/^[，。；、\s]+/, '');
  return shortenText(`${scenicName}${trimmedBody ? `，${trimmedBody}` : ''}`, maxLength);
}

function normalizeCopywritingResult(rawResult, input, modelName) {
  const intro = ensureScenicName(rawResult?.intro, input.name, 140);
  const cultureDesc = ensureScenicName(rawResult?.culture_desc || rawResult?.cultureDesc, input.name, 220);

  if (!intro || !cultureDesc) {
    throw new Error('copywriting result is incomplete');
  }

  return {
    intro,
    culture_desc: cultureDesc,
    model_name: modelName
  };
}

function buildFallbackIntro(input, matchedContext) {
  const tagText = input.tags.length ? input.tags.slice(0, 3).join('、') : '';
  const contextHint = matchedContext.find((item) => item.type === 'scenic')?.summary || '';
  const parts = [];

  parts.push(`${input.name}${input.region ? `位于${input.region}` : '是赣州值得关注的景点之一'}`);

  if (tagText) {
    parts.push(`以${tagText}等特点受到关注`);
  } else {
    parts.push('适合作为赣州旅游文化体验中的一站');
  }

  if (contextHint) {
    parts.push(`基于当前资料，它常被作为兼顾观光与文化体验的点位提及`);
  }

  return shortenText(`${parts.join('，')}。`, 140);
}

function buildFallbackCultureDesc(input, matchedContext) {
  const tagText = input.tags.length ? input.tags.slice(0, 4).join('、') : '地方文化与景观特色';
  const relatedArticle = matchedContext.find((item) => item.type === 'article')?.title || '';
  const noteHint = input.notes ? `结合“${input.notes}”这一要求，文案应更偏向游客易读的表达。` : '';

  return shortenText(
    `基于当前资料，${input.name}${input.region ? `与${input.region}的在地文化语境相关，` : '具有一定的赣州地方文化辨识度，'}可重点从${tagText}等角度展开介绍。${relatedArticle ? `站内相关内容还可与“${relatedArticle}”这类主题形成补充理解。` : ''}${noteHint}`,
    220
  );
}

function buildFallbackCopywriting(input, matchedContext) {
  return {
    intro: buildFallbackIntro(input, matchedContext),
    culture_desc: buildFallbackCultureDesc(input, matchedContext),
    model_name: 'fallback-local'
  };
}

async function requestCopywritingCompletion(input, matchedContext, messages) {
  const aiConfig = getAiConfigState();

  if (!aiConfig.baseUrl || !aiConfig.hasApiKey || !aiConfig.model) {
    logAiWarn('remote model skipped because AI env is incomplete', {
      baseUrl: aiConfig.baseUrl || '(empty)',
      model: aiConfig.model || '(empty)',
      hasApiKey: aiConfig.hasApiKey,
      fallback: true
    });

    return {
      result: buildFallbackCopywriting(input, matchedContext),
      tokenUsage: 0
    };
  }

  try {
    const requestUrl = `${aiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    logAiInfo('calling remote copywriting model', {
      baseUrl: aiConfig.baseUrl,
      requestUrl,
      model: aiConfig.model,
      matchedCount: matchedContext.length
    });

    const response = await axios.post(
      requestUrl,
      {
        model: aiConfig.model,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.aiApiKey}`
        }
      }
    );

    const content = extractMessageContent(response.data?.choices?.[0]?.message?.content);
    const parsed = JSON.parse(extractJsonText(content));
    const normalizedResult = normalizeCopywritingResult(parsed, input, response.data?.model || aiConfig.model);

    logAiInfo('remote copywriting model responded successfully', {
      model: normalizedResult.model_name,
      tokenUsage: getTokenUsage(response.data?.usage),
      fallback: false
    });

    return {
      result: normalizedResult,
      tokenUsage: getTokenUsage(response.data?.usage)
    };
  } catch (error) {
    const upstreamStatus = error.response?.status || null;
    const reason = error.response?.data?.error?.message || error.message || 'copywriting request failed';

    logAiError('remote copywriting request failed, switching to fallback-local', {
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
      upstreamStatus,
      message: reason,
      fallback: true
    });

    return {
      result: buildFallbackCopywriting(input, matchedContext),
      tokenUsage: 0
    };
  }
}

async function writeCopywritingLog(input, output, promptText, tokenUsage) {
  try {
    await AiCopywritingLog.create({
      target_type: 'scenic',
      target_id: input.targetId,
      input_data: JSON.stringify({
        name: input.name,
        region: input.region,
        tags: input.tags,
        notes: input.notes
      }),
      output_content: JSON.stringify(output),
      prompt_text: promptText,
      model_name: output.model_name,
      token_usage: tokenUsage || 0
    });
  } catch (error) {
    console.error('[ai-copywriting] failed to write log:', error.message);
  }
}

export async function generateScenicCopywriting(payload) {
  const input = sanitizeInput(payload);
  assertValidInput(input);

  const matchedContext = await recallMatchedContext(input);
  const contextText = buildContextText(matchedContext);
  const messages = buildScenicCopywritingMessages({ input, contextText });
  const promptText = serializeMessages(messages);
  const aiResult = await requestCopywritingCompletion(input, matchedContext, messages);

  await writeCopywritingLog(input, aiResult.result, promptText, aiResult.tokenUsage);

  return aiResult.result;
}
