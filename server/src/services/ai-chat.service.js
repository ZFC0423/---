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

function buildFallbackAnswer(question, matchedContext, reason) {
  if (!matchedContext.length) {
    return [
      '基于当前资料，我暂时没有检索到足够相关的赣州旅游文化内容。',
      '你可以换个更具体的问法，例如“赣州周末适合去哪些景点”“赣州特色美食有哪些”或“赣州有哪些红色文化景点”。',
      reason ? `说明：${reason}` : ''
    ].filter(Boolean).join('\n');
  }

  const scenicItems = matchedContext.filter((item) => item.type === 'scenic');
  const articleItems = matchedContext.filter((item) => item.type === 'article');
  const lines = ['基于当前资料，我先给你一个简要建议：'];

  if (scenicItems.length) {
    lines.push(`可以优先关注这些景点：${scenicItems.map((item) => item.title).join('、')}。`);
  }

  if (articleItems.length) {
    lines.push(`如果你也想结合文化内容，可以再看看：${articleItems.map((item) => item.title).join('、')}。`);
  }

  if (/周末|一日|两日|玩|游/.test(question)) {
    lines.push('如果是周末或短时间出行，建议优先安排交通方便、内容集中的景点，再搭配一到两个美食或文化点。');
  } else if (/美食|吃/.test(question)) {
    lines.push('如果你更关注吃的体验，可以先围绕本地经典菜和客家饮食文化来安排行程。');
  } else if (/非遗|文化|戏曲|客家/.test(question)) {
    lines.push('如果你更想了解文化面，可以优先看非遗、客家文化和老城历史相关内容。');
  } else if (/红色|革命|长征/.test(question)) {
    lines.push('如果你关注红色文化，建议把革命旧址和相关历史解说内容结合起来看，会更完整。');
  }

  lines.push('以上内容是基于当前资料整理的，如果你愿意，我还可以继续按“景点”“美食”“非遗”或“红色文化”中的某一类继续细化。');

  if (reason) {
    lines.push(`说明：${reason}`);
  }

  return lines.join('\n');
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

  if (!aiConfig.baseUrl || !aiConfig.hasApiKey || !aiConfig.model) {
    logAiWarn('remote model skipped because AI env is incomplete', {
      baseUrl: aiConfig.baseUrl || '(empty)',
      model: aiConfig.model || '(empty)',
      hasApiKey: aiConfig.hasApiKey,
      fallback: true
    });

    return {
      answer: buildFallbackAnswer(question, matchedContext, '当前 AI 服务尚未完成配置，以下回答基于已检索到的资料整理。'),
      modelName: 'fallback-local',
      tokenUsage: 0
    };
  }

  try {
    const requestUrl = `${aiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    logAiInfo('calling remote model', {
      baseUrl: aiConfig.baseUrl,
      requestUrl,
      model: aiConfig.model,
      matchedCount: matchedContext.length
    });

    const response = await axios.post(
      requestUrl,
      {
        model: aiConfig.model,
        temperature: 0.4,
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

    const answer = extractMessageContent(response.data?.choices?.[0]?.message?.content);

    if (!answer) {
      throw new Error('模型返回内容为空');
    }

    logAiInfo('remote model responded successfully', {
      model: response.data?.model || aiConfig.model,
      tokenUsage: getTokenUsage(response.data?.usage),
      fallback: false
    });

    return {
      answer,
      modelName: response.data?.model || aiConfig.model,
      tokenUsage: getTokenUsage(response.data?.usage)
    };
  } catch (error) {
    const reason = error.response?.data?.error?.message || error.message || '模型服务暂时不可用';
    const upstreamStatus = error.response?.status || null;

    logAiError('remote model request failed, switching to fallback-local', {
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
      upstreamStatus,
      message: reason,
      fallback: true
    });

    return {
      answer: buildFallbackAnswer(question, matchedContext, `模型调用未成功，已切换为资料整理模式。${reason}`),
      modelName: 'fallback-local',
      tokenUsage: 0
    };
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
    model_name: aiResult.modelName,
    matchedContext: matchedContext.map((item) => ({
      type: item.type,
      id: item.id,
      title: item.title
    }))
  };
}
