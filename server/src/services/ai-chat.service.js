import axios from 'axios';
import { Op } from 'sequelize';

import { env } from '../config/env.js';
import { AiChatLog, Article, Category, ScenicSpot } from '../models/index.js';
import { buildChatMessages } from '../prompts/chat.prompt.js';

const RECOMMEND_QUESTIONS = [
  '赣州有哪些适合周末游玩的地方？',
  '第一次来赣州，有哪些经典景点值得去？',
  '赣州有哪些特色美食值得尝试？',
  '想了解赣州的非遗文化，有哪些推荐？',
  '赣州有哪些适合城市慢游的历史文化景点？',
  '赣州红色文化景点有哪些？',
  '如果只安排一天，赣州怎么逛比较合适？'
];

const keywordRules = [
  { pattern: /周末|一日|两日|休闲|轻松|慢游|city ?walk/i, terms: ['weekend', 'citywalk'] },
  { pattern: /景点|打卡|游玩|地方|路线|第一次|经典/i, terms: ['history', 'nature', 'landmark'] },
  { pattern: /美食|吃|小吃|餐馆|菜/i, terms: ['food', 'snack', 'dish', 'hakka'] },
  { pattern: /非遗|戏曲|传统|民俗|客家/i, terms: ['heritage', 'opera', 'folk-art', 'hakka', 'tea'] },
  { pattern: /红色|革命|长征|瑞金/i, terms: ['red-culture', 'history', 'long-march', 'study-tour'] },
  { pattern: /自然|山|森林|生态|风景/i, terms: ['nature', 'forest', 'eco-tour', 'vacation'] },
  { pattern: /历史|古城|古迹|文化/i, terms: ['history', 'old-city', 'grotto', 'culture'] }
];

const regionRules = [
  { pattern: /章贡/, term: 'Zhanggong' },
  { pattern: /安远/, term: 'Anyuan' },
  { pattern: /赣县/, term: 'Ganxian' },
  { pattern: /大余/, term: 'Dayu' },
  { pattern: /宁都/, term: 'Ningdu' },
  { pattern: /瑞金/, term: 'Ruijin' }
];

function normalizeText(value) {
  return String(value || '').trim();
}

function shortenText(value, maxLength = 160) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
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

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function sanitizeStringArray(value, maxItems = 4, maxLength = 64) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniq(
    value
      .map((item) => shortenText(item, maxLength))
      .filter(Boolean)
  ).slice(0, maxItems);
}

function extractSearchTerms(question) {
  const normalizedQuestion = normalizeText(question);
  const terms = new Set();
  const directSegments = normalizedQuestion
    .split(/[\s，。,.、；;！!？?：:（）()【】"']/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  directSegments.forEach((item) => terms.add(item));

  keywordRules.forEach((rule) => {
    if (rule.pattern.test(normalizedQuestion)) {
      rule.terms.forEach((item) => terms.add(item));
    }
  });

  regionRules.forEach((rule) => {
    if (rule.pattern.test(normalizedQuestion)) {
      terms.add(rule.term);
    }
  });

  if (!terms.size) {
    terms.add(normalizedQuestion);
  }

  return Array.from(terms).slice(0, 12);
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

function formatScenicContext(item) {
  return {
    type: 'scenic',
    id: Number(item.id),
    title: item.name,
    summary: shortenText(item.intro),
    region: item.region,
    tags: parseStringList(item.tags),
    categoryName: item.category?.name || ''
  };
}

function formatArticleContext(item) {
  return {
    type: 'article',
    id: Number(item.id),
    title: item.title,
    summary: shortenText(item.summary || item.content),
    categoryName: item.category?.name || '',
    tags: parseStringList(item.tags)
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

function buildContextText(matchedContext) {
  if (!matchedContext.length) {
    return '';
  }

  return matchedContext.map((item, index) => {
    const parts = [
      `${index + 1}. 类型：${item.type === 'scenic' ? '景点' : '文章'}`,
      `标题：${item.title}`
    ];

    if (item.region) {
      parts.push(`区域：${item.region}`);
    }

    if (item.categoryName) {
      parts.push(`分类：${item.categoryName}`);
    }

    if (item.tags?.length) {
      parts.push(`标签：${item.tags.join('、')}`);
    }

    if (item.summary) {
      parts.push(`摘要：${item.summary}`);
    }

    return parts.join('\n');
  }).join('\n\n');
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

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

function getAiConfigState() {
  return {
    baseUrl: env.aiBaseUrl || '',
    model: env.aiModel || '',
    hasApiKey: Boolean(env.aiApiKey)
  };
}

function logAiInfo(message, extra = {}) {
  console.info('[ai-chat]', message, extra);
}

function logAiWarn(message, extra = {}) {
  console.warn('[ai-chat]', message, extra);
}

function logAiError(message, extra = {}) {
  console.error('[ai-chat]', message, extra);
}

function assertMessagesContract(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error('AI messages must be a non-empty array');
  }

  const invalidMessage = messages.find((message) => !message || typeof message !== 'object' || !normalizeText(message.role) || message.content === undefined);

  if (invalidMessage) {
    throw new Error('AI messages contain invalid items');
  }

  if (messages.some((message) => normalizeText(message.role) === 'assistant')) {
    throw new Error('assistant prefill is not allowed for AI requests');
  }

  if (normalizeText(messages[messages.length - 1]?.role) !== 'user') {
    throw new Error('AI messages must end with a user message');
  }
}

async function postGuideModelRequest({ messages, timeout }) {
  assertMessagesContract(messages);

  const aiConfig = getAiConfigState();

  if (!aiConfig.baseUrl || !aiConfig.hasApiKey || !aiConfig.model) {
    return {
      skipped: true,
      model: 'fallback-local'
    };
  }

  const requestUrl = `${aiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  logAiInfo('calling remote model', {
    baseUrl: aiConfig.baseUrl,
    requestUrl,
    model: aiConfig.model
  });

  const response = await axios.post(
    requestUrl,
    {
      model: aiConfig.model,
      temperature: 0.3,
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
    model: response.data?.model || aiConfig.model,
    tokenUsage: getTokenUsage(response.data?.usage)
  };
}

function pickRelatedSpots(matchedContext) {
  return matchedContext
    .filter((item) => item.type === 'scenic')
    .map((item) => item.title)
    .slice(0, 4);
}

function pickRelatedTopics(matchedContext) {
  const articleTitles = matchedContext
    .filter((item) => item.type === 'article')
    .map((item) => item.title);
  const categoryNames = matchedContext
    .map((item) => item.categoryName)
    .filter(Boolean);
  const tagNames = matchedContext
    .flatMap((item) => item.tags || [])
    .filter((item) => String(item).length >= 2);

  return uniq([...articleTitles, ...categoryNames, ...tagNames]).slice(0, 4);
}

function buildFallbackDirectAnswer(question, matchedContext) {
  if (!matchedContext.length) {
    return '基于当前平台资料，暂时没有检索到足够直接的相关内容。你可以把问题换得更具体一些，例如聚焦景点、美食、非遗或红色文化中的某一类。';
  }

  const scenicTitles = pickRelatedSpots(matchedContext);
  const topicTitles = pickRelatedTopics(matchedContext);

  if (/美食|吃|小吃|餐馆|菜/.test(question)) {
    return `如果你想从饮食角度认识赣州，可以先从${topicTitles.slice(0, 2).join('、') || '赣州在地美食'}这些内容看起，它们更能体现地方生活与客家饮食脉络。`;
  }

  if (/非遗|戏曲|传统|民俗|客家/.test(question)) {
    return `如果你想理解赣州的非遗和地方传统，可以先从${topicTitles.slice(0, 2).join('、') || '赣州非遗与客家文化'}这一类内容入手，再去看相关景点或展示空间。`;
  }

  if (/红色|革命|长征|瑞金/.test(question)) {
    return `如果你关注红色文化，可以先把${scenicTitles.slice(0, 2).join('、') || '相关红色地点'}和站内专题内容结合起来看，这样更容易建立历史线索。`;
  }

  if (/周末|一日|两日|行程|路线|安排|怎么逛/.test(question)) {
    return `如果你是在问赣州怎么逛，当前资料里更适合作为起点的内容包括${scenicTitles.slice(0, 3).join('、') || '若干核心景点'}，它们更容易串成一条清楚的城市导览思路。`;
  }

  return `基于当前平台资料，这个问题可以先从${uniq([...scenicTitles, ...topicTitles]).slice(0, 3).join('、') || '赣州文旅内容'}这些线索开始理解。`;
}

function buildFallbackCulturalContext(question) {
  if (/美食|吃|小吃|餐馆|菜/.test(question)) {
    return '在赣州，美食不只是“吃什么”，也和客家饮食习惯、地方生活节奏以及城市记忆有关，所以更适合放在在地文化语境里理解。';
  }

  if (/非遗|戏曲|传统|民俗|客家/.test(question)) {
    return '这类问题背后对应的是赣州的手艺传承、民俗习惯和客家文化结构，单看某一个项目往往不够，结合地方文化脉络会更容易理解。';
  }

  if (/红色|革命|长征|瑞金/.test(question)) {
    return '这类内容不仅和具体历史地点有关，也和赣州在红色记忆中的位置有关，所以适合把地点、历史叙事和当下参观方式放在一起看。';
  }

  if (/景点|古城|历史|文化|古迹/.test(question)) {
    return '赣州很多景点并不是孤立存在的，它们往往同时连着宋城历史、客家文化或红色记忆，理解这些线索会比单纯记住点位更有帮助。';
  }

  return '这个问题更适合从“赣州的内容线索 + 旅行语境”一起理解，先知道它属于哪类文化内容，再决定下一步去看什么、问什么。';
}

function buildNextSteps(question, matchedContext) {
  const scenicTitle = pickRelatedSpots(matchedContext)[0];
  const topicTitle = pickRelatedTopics(matchedContext)[0];
  const nextSteps = [];

  if (scenicTitle) {
    nextSteps.push(`如果你想继续细化，我可以继续说明“${scenicTitle}”适合怎么逛、看点在哪。`);
  }

  if (topicTitle) {
    nextSteps.push(`也可以继续从“${topicTitle}”这个方向往下展开，看看它和赣州其他内容怎么关联。`);
  }

  if (!/天|行程|路线|安排|怎么逛/.test(question)) {
    nextSteps.push('如果你已经有出行天数和兴趣偏好，也可以继续让我帮你整理一条参考性的赣州导览路径。');
  }

  nextSteps.push('你还可以把问题问得更具体一些，例如某个景点的看点、某类美食的代表内容，或某段历史的关联地点。');

  return uniq(nextSteps).slice(0, 3);
}

function buildRelatedContentText(relatedTopics, relatedSpots) {
  const lines = [];

  if (relatedTopics.length) {
    lines.push(`相关主题：${relatedTopics.join('、')}`);
  }

  if (relatedSpots.length) {
    lines.push(`相关景点/内容：${relatedSpots.join('、')}`);
  }

  if (!lines.length) {
    lines.push('当前可以继续从景点导览、在地美食、非遗传承或红色文化中的某一类继续细化。');
  }

  return lines.join('\n');
}

function buildNextStepsText(nextSteps) {
  if (!nextSteps.length) {
    return '你可以继续追问某个景点、某个主题，或者告诉我你的出行天数与偏好，让我继续帮你整理导览思路。';
  }

  return nextSteps.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function buildGuideAnswerText(result) {
  return [
    '[直接回答]',
    result.directAnswer,
    '',
    '[文化线索]',
    result.culturalContext,
    '',
    '[相关内容]',
    buildRelatedContentText(result.relatedTopics, result.relatedSpots),
    '',
    '[下一步探索建议]',
    buildNextStepsText(result.nextSteps)
  ].join('\n');
}

function buildFallbackChatResult(question, matchedContext) {
  const relatedTopics = pickRelatedTopics(matchedContext);
  const relatedSpots = pickRelatedSpots(matchedContext);
  const directAnswer = buildFallbackDirectAnswer(question, matchedContext);
  const culturalContext = buildFallbackCulturalContext(question);
  const nextSteps = buildNextSteps(question, matchedContext);

  const result = {
    directAnswer,
    culturalContext,
    relatedTopics,
    relatedSpots,
    nextSteps
  };

  return {
    ...result,
    answer: buildGuideAnswerText(result),
    modelName: 'fallback-local',
    tokenUsage: 0
  };
}

function normalizeChatResultStructure(rawResult, question, matchedContext, modelName) {
  const fallbackResult = buildFallbackChatResult(question, matchedContext);
  const relatedTopics = sanitizeStringArray(rawResult?.relatedTopics, 4, 48);
  const relatedSpots = sanitizeStringArray(rawResult?.relatedSpots, 4, 48);
  const nextSteps = sanitizeStringArray(rawResult?.nextSteps, 3, 96);

  const result = {
    directAnswer: shortenText(rawResult?.directAnswer, 280) || fallbackResult.directAnswer,
    culturalContext: shortenText(rawResult?.culturalContext, 240) || fallbackResult.culturalContext,
    relatedTopics: relatedTopics.length ? relatedTopics : fallbackResult.relatedTopics,
    relatedSpots: relatedSpots.length ? relatedSpots : fallbackResult.relatedSpots,
    nextSteps: nextSteps.length ? nextSteps : fallbackResult.nextSteps
  };

  return {
    ...result,
    answer: buildGuideAnswerText(result),
    modelName,
    tokenUsage: 0
  };
}

async function recallScenicItems(terms) {
  if (!terms.length) {
    return [];
  }

  return ScenicSpot.findAll({
    where: {
      status: 1,
      [Op.or]: buildScenicConditions(terms)
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'DESC']],
    limit: 4
  });
}

async function recallArticleItems(terms) {
  if (!terms.length) {
    return [];
  }

  return Article.findAll({
    where: {
      status: 1,
      [Op.or]: buildArticleConditions(terms)
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['recommend_flag', 'DESC'], ['id', 'DESC']],
    limit: 4
  });
}

async function loadFallbackContext() {
  const [fallbackScenicRows, fallbackArticleRows] = await Promise.all([
    ScenicSpot.findAll({
      where: { status: 1 },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'DESC']],
      limit: 3
    }),
    Article.findAll({
      where: { status: 1 },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['recommend_flag', 'DESC'], ['view_count', 'DESC'], ['id', 'DESC']],
      limit: 2
    })
  ]);

  return [
    ...fallbackScenicRows.map(formatScenicContext),
    ...fallbackArticleRows.map(formatArticleContext)
  ];
}

async function recallMatchedContext(question) {
  const terms = extractSearchTerms(question);
  const [scenicRows, articleRows] = await Promise.all([
    recallScenicItems(terms),
    recallArticleItems(terms)
  ]);

  let matchedContext = dedupeContextItems([
    ...scenicRows.map(formatScenicContext),
    ...articleRows.map(formatArticleContext)
  ]);

  if (matchedContext.length < 3) {
    const fallbackItems = await loadFallbackContext();
    matchedContext = dedupeContextItems([...matchedContext, ...fallbackItems]);
  }

  return matchedContext.slice(0, 6);
}

async function requestChatCompletion(question, matchedContext) {
  const contextText = buildContextText(matchedContext);
  const messages = buildChatMessages({ question, contextText });
  const aiConfig = getAiConfigState();

  try {
    const requestResult = await postGuideModelRequest({
      messages,
      timeout: 30000
    });

    if (requestResult.skipped) {
      logAiWarn('remote model skipped because AI env is incomplete', {
        baseUrl: aiConfig.baseUrl || '(empty)',
        model: aiConfig.model || '(empty)',
        hasApiKey: aiConfig.hasApiKey,
        fallback: true
      });

      return buildFallbackChatResult(question, matchedContext);
    }

    const rawContent = extractMessageContent(requestResult.data?.choices?.[0]?.message?.content);
    const parsed = JSON.parse(extractJsonText(rawContent));
    const normalizedResult = normalizeChatResultStructure(parsed, question, matchedContext, requestResult.model);

    logAiInfo('remote model responded successfully', {
      model: requestResult.model,
      tokenUsage: requestResult.tokenUsage,
      fallback: false
    });

    return {
      ...normalizedResult,
      modelName: requestResult.model,
      tokenUsage: requestResult.tokenUsage
    };
  } catch (error) {
    const reason = error.response?.data?.error?.message || error.message || '模型服务暂时不可用';

    logAiError('remote model request failed, switching to fallback-local', {
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
      upstreamStatus: error.response?.status || null,
      message: reason,
      fallback: true
    });

    return buildFallbackChatResult(question, matchedContext);
  }
}

async function writeChatLog(logData) {
  try {
    await AiChatLog.create(logData);
  } catch (error) {
    console.error('[ai-chat] failed to write log:', error.message);
  }
}

export function getRecommendQuestions() {
  return RECOMMEND_QUESTIONS;
}

export async function chatWithGanzhouAssistant(req) {
  const question = normalizeText(req.body?.question);

  if (!question) {
    const error = new Error('请输入问题后再试');
    error.statusCode = 400;
    throw error;
  }

  const matchedContext = await recallMatchedContext(question);
  const aiResult = await requestChatCompletion(question, matchedContext);

  await writeChatLog({
    question,
    answer: aiResult.answer,
    matched_context: JSON.stringify(matchedContext, null, 2),
    model_name: aiResult.modelName,
    token_usage: aiResult.tokenUsage || 0,
    ip: getClientIp(req)
  });

  return {
    answer: aiResult.answer,
    directAnswer: aiResult.directAnswer,
    culturalContext: aiResult.culturalContext,
    relatedTopics: aiResult.relatedTopics,
    relatedSpots: aiResult.relatedSpots,
    nextSteps: aiResult.nextSteps,
    model_name: aiResult.modelName,
    matchedContext: matchedContext.map((item) => ({
      type: item.type,
      id: item.id,
      title: item.title
    }))
  };
}
