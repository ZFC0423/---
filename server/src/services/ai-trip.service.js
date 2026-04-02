import axios from 'axios';
import { Op } from 'sequelize';

import { env } from '../config/env.js';
import { AiTripLog, Article, Category, ScenicSpot } from '../models/index.js';
import { buildTripPlanMessages } from '../prompts/trip-plan.prompt.js';

const ALLOWED_INTERESTS = [
  'natural',
  'red_culture',
  'hakka_culture',
  'heritage',
  'food',
  'family',
  'photography'
];

const INTEREST_TERMS = {
  natural: ['nature', 'forest', 'eco-tour', 'vacation', 'mountain', 'photo'],
  red_culture: ['red-culture', 'history', 'long-march', 'ruijin', 'red', '革命', '红色'],
  hakka_culture: ['hakka', 'culture', 'folk', '客家'],
  heritage: ['heritage', 'opera', 'folk-art', 'tea', '非遗'],
  food: ['food', 'dish', 'snack', 'fried', '美食', '客家'],
  family: ['family', 'vacation', 'culture', '亲子'],
  photography: ['photo', 'landmark', 'old-city', 'mountain', 'bridge']
};

const INTEREST_LABELS = {
  natural: '自然风光',
  red_culture: '红色文化',
  hakka_culture: '客家文化',
  heritage: '非遗文化',
  food: '美食体验',
  family: '亲子休闲',
  photography: '拍照打卡'
};

const PACE_LABELS = {
  relaxed: '轻松',
  normal: '适中',
  compact: '紧凑'
};

const TRANSPORT_LABELS = {
  public_transport: '公共交通',
  self_drive: '自驾'
};

const SLOT_LABELS = {
  morning: '上午',
  noon: '中午',
  afternoon: '下午',
  evening: '傍晚'
};

const SLOT_CONFIG = {
  relaxed: ['morning', 'afternoon'],
  normal: ['morning', 'afternoon', 'evening'],
  compact: ['morning', 'noon', 'afternoon', 'evening']
};

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

function sanitizeStringArray(value, maxItems = 4, maxLength = 80) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniq(
    value
      .map((item) => shortenText(item, maxLength))
      .filter(Boolean)
  ).slice(0, maxItems);
}

function sanitizeInput(payload = {}) {
  const days = Number(payload.days);
  const interests = Array.isArray(payload.interests)
    ? uniq(payload.interests.map((item) => String(item).trim()).filter((item) => ALLOWED_INTERESTS.includes(item)))
    : [];
  const pace = normalizeText(payload.pace);
  const transport = normalizeText(payload.transport);
  const notes = normalizeText(payload.notes).slice(0, 300);

  return {
    days,
    interests,
    pace,
    transport,
    notes
  };
}

function assertValidInput(input) {
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 5) {
    const error = new Error('days must be an integer between 1 and 5');
    error.statusCode = 400;
    throw error;
  }

  if (!input.interests.length) {
    const error = new Error('interests is required');
    error.statusCode = 400;
    throw error;
  }

  if (!['relaxed', 'normal', 'compact'].includes(input.pace)) {
    const error = new Error('pace is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (!['public_transport', 'self_drive'].includes(input.transport)) {
    const error = new Error('transport is invalid');
    error.statusCode = 400;
    throw error;
  }
}

function extractTermsFromNotes(notes) {
  return notes
    .split(/[\s,，。！？、；;()（）【】“”"'`]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 8);
}

function buildSearchTerms(input) {
  const terms = new Set();

  input.interests.forEach((interest) => {
    (INTEREST_TERMS[interest] || []).forEach((term) => terms.add(term));
  });

  if (input.transport === 'public_transport') {
    ['Zhanggong', 'old-city', 'citywalk', 'bridge', 'history'].forEach((term) => terms.add(term));
  } else {
    ['nature', 'mountain', 'vacation', 'forest', 'Anyuan', 'Dayu'].forEach((term) => terms.add(term));
  }

  if (input.pace === 'relaxed') {
    ['culture', 'family', 'old-city'].forEach((term) => terms.add(term));
  } else if (input.pace === 'compact') {
    ['landmark', 'photo', 'history', 'nature'].forEach((term) => terms.add(term));
  }

  if (input.days >= 3) {
    ['heritage', 'food', 'nature'].forEach((term) => terms.add(term));
  }

  extractTermsFromNotes(input.notes).forEach((term) => terms.add(term));

  return Array.from(terms).slice(0, 18);
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
    region: item.region || '',
    summary: shortenText(item.intro || item.culture_desc),
    tags: parseStringList(item.tags),
    categoryName: item.category?.name || ''
  };
}

function formatArticleContext(item) {
  return {
    type: 'article_or_theme',
    id: Number(item.id),
    title: item.title,
    region: '',
    summary: shortenText(item.summary || item.content),
    tags: parseStringList(item.tags),
    categoryName: item.category?.name || ''
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

async function recallScenicItems(input) {
  const terms = buildSearchTerms(input);

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
    limit: 6
  });
}

async function recallArticleItems(input) {
  const terms = buildSearchTerms(input);

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
    order: [['recommend_flag', 'DESC'], ['view_count', 'DESC'], ['id', 'DESC']],
    limit: 6
  });
}

async function loadFallbackContext() {
  const [scenicRows, articleRows] = await Promise.all([
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
      limit: 4
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
      limit: 3
    })
  ]);

  return [
    ...scenicRows.map(formatScenicContext),
    ...articleRows.map(formatArticleContext)
  ];
}

async function recallMatchedContext(input) {
  const [scenicRows, articleRows] = await Promise.all([
    recallScenicItems(input),
    recallArticleItems(input)
  ]);

  let matchedContext = dedupeContextItems([
    ...scenicRows.map(formatScenicContext),
    ...articleRows.map(formatArticleContext)
  ]);

  if (matchedContext.length < 4) {
    const fallbackItems = await loadFallbackContext();
    matchedContext = dedupeContextItems([...matchedContext, ...fallbackItems]);
  }

  return matchedContext.slice(0, 8);
}

function buildContextText(matchedContext) {
  return matchedContext.map((item, index) => {
    const parts = [
      `${index + 1}. 类型：${item.type === 'scenic' ? '景点' : '专题内容'}`,
      `标题：${item.title}`
    ];

    if (item.region) {
      parts.push(`区域：${item.region}`);
    }

    if (item.categoryName) {
      parts.push(`分类：${item.categoryName}`);
    }

    if (item.tags.length) {
      parts.push(`标签：${item.tags.join('、')}`);
    }

    if (item.summary) {
      parts.push(`摘要：${item.summary}`);
    }

    return parts.join('\n');
  }).join('\n\n');
}

function getAiConfigState() {
  return {
    baseUrl: env.aiBaseUrl || '',
    model: env.aiModel || '',
    hasApiKey: Boolean(env.aiApiKey)
  };
}

function logAiInfo(message, extra = {}) {
  console.info('[ai-trip]', message, extra);
}

function logAiWarn(message, extra = {}) {
  console.warn('[ai-trip]', message, extra);
}

function logAiError(message, extra = {}) {
  console.error('[ai-trip]', message, extra);
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

  logAiInfo('calling remote trip model', {
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

function inferItemType(name, matchedContext) {
  const normalized = normalizeText(name).toLowerCase();

  if (!normalized) {
    return 'article_or_theme';
  }

  const scenicMatched = matchedContext.find((item) => item.type === 'scenic' && normalizeText(item.title).toLowerCase() === normalized);

  return scenicMatched ? 'scenic' : 'article_or_theme';
}

function normalizeTimeSlot(value, index, pace) {
  const normalized = normalizeText(value).toLowerCase();

  if (['morning', 'noon', 'afternoon', 'evening'].includes(normalized)) {
    return normalized;
  }

  if (normalized.includes('早') || normalized.includes('上')) {
    return 'morning';
  }

  if (normalized.includes('午')) {
    return 'noon';
  }

  if (normalized.includes('下')) {
    return 'afternoon';
  }

  if (normalized.includes('晚') || normalized.includes('夜')) {
    return 'evening';
  }

  const slots = SLOT_CONFIG[pace] || SLOT_CONFIG.normal;
  return slots[index % slots.length];
}

function buildGenericTravelTips(input) {
  const tips = [
    '本行程基于站内旅游文化资料整理，不包含实时天气、开放时间和交通班次。',
    '出发前建议再次确认景点开放情况、交通衔接和当日体力安排。'
  ];

  if (input.transport === 'public_transport') {
    tips.push('若以公共交通出行为主，建议优先保留同一区域的核心点位，减少临时折返。');
  } else {
    tips.push('若以自驾为主，可适度放宽点位跨度，但仍建议提前确认停车与山地路况。');
  }

  if (input.pace === 'relaxed') {
    tips.push('轻松节奏更适合少量重点点位和在地停留，不建议临时增加过多站点。');
  } else if (input.pace === 'compact') {
    tips.push('紧凑节奏内容会更密集，建议预留机动时间，应对临时排队或交通变化。');
  }

  return uniq(tips).slice(0, 5);
}

function getInterestWeight(item, input) {
  const combinedText = [
    item.title,
    item.summary,
    item.categoryName,
    item.region,
    ...(item.tags || [])
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;

  input.interests.forEach((interest) => {
    const terms = INTEREST_TERMS[interest] || [];

    if (terms.some((term) => combinedText.includes(String(term).toLowerCase()))) {
      score += 16;
    }
  });

  return score;
}

function getRegionWeight(item, input) {
  if (input.transport === 'self_drive') {
    if (['Anyuan', 'Dayu', 'Ganxian'].includes(item.region)) {
      return 18;
    }

    return 8;
  }

  if (item.region === 'Zhanggong') {
    return 18;
  }

  if (!item.region) {
    return 8;
  }

  return 2;
}

function getPaceWeight(item, input) {
  const tagsText = (item.tags || []).join(' ').toLowerCase();

  if (input.pace === 'relaxed') {
    return /culture|old-city|family|vacation/.test(tagsText) ? 8 : 4;
  }

  if (input.pace === 'compact') {
    return /photo|landmark|history|nature/.test(tagsText) ? 8 : 5;
  }

  return 6;
}

function sortMatchedContext(input, matchedContext) {
  return [...matchedContext].sort((left, right) => {
    const leftScore = getInterestWeight(left, input) + getRegionWeight(left, input) + getPaceWeight(left, input);
    const rightScore = getInterestWeight(right, input) + getRegionWeight(right, input) + getPaceWeight(right, input);

    return rightScore - leftScore;
  });
}

function buildInterestLabels(input) {
  return input.interests.map((item) => INTEREST_LABELS[item] || item);
}

function buildRelatedTopics(input, matchedContext) {
  const contextTopics = matchedContext
    .filter((item) => item.type !== 'scenic')
    .map((item) => item.title);
  const categoryNames = matchedContext.map((item) => item.categoryName).filter(Boolean);
  const interestLabels = buildInterestLabels(input);

  return uniq([...contextTopics, ...categoryNames, ...interestLabels]).slice(0, 4);
}

function buildRelatedSpots(matchedContext) {
  return matchedContext
    .filter((item) => item.type === 'scenic')
    .map((item) => item.title)
    .slice(0, 5);
}

function buildAdjustmentSuggestions(input) {
  const suggestions = [
    '这是一份参考性导览路径，出发前建议结合开放情况、交通衔接和天气变化做微调。'
  ];

  if (input.transport === 'public_transport') {
    suggestions.push('如果当天换乘较多，可优先保留同一区域的核心点位，把跨区内容留到下一次展开。');
  } else {
    suggestions.push('如果自驾跨度较大，可按区域把内容拆成上下午两段，减少连续奔波。');
  }

  if (input.notes) {
    suggestions.push('如果你还想优先照顾长辈、亲子或拍照节奏，可以继续补充需求，我会在同一主题下帮你收紧路径。');
  } else {
    suggestions.push('如果你愿意补充同行人、停留时间或更想深入的主题，这条路径还可以继续细化。');
  }

  return uniq(suggestions).slice(0, 4);
}

function buildRouteHighlights(input, matchedContext) {
  const scenicTitles = buildRelatedSpots(matchedContext);
  const topicTitles = buildRelatedTopics(input, matchedContext);
  const highlights = [];

  highlights.push(`这条路径以${buildInterestLabels(input).join('、')}为主线，更强调“理解内容 + 形成游览思路”，而不是单纯赶点。`);

  if (scenicTitles.length) {
    highlights.push(`可重点串联${scenicTitles.slice(0, 3).join('、')}等内容，让景点浏览和城市文化线索放在一起理解。`);
  }

  if (topicTitles.length) {
    highlights.push(`路径会把${topicTitles.slice(0, 2).join('、')}这类主题内容自然接入，不只停留在点位罗列。`);
  }

  if (input.transport === 'public_transport') {
    highlights.push('整体点位跨度会相对收敛，更适合作为公共交通条件下的参考导览路径。');
  } else {
    highlights.push('在自驾条件下可适度放宽串联范围，更方便把不同区域的主题内容放进同一条路径。');
  }

  return uniq(highlights).slice(0, 4);
}

function buildTripGuideMetadata(input, matchedContext) {
  const interestLabels = buildInterestLabels(input);
  const scenicTitles = buildRelatedSpots(matchedContext);
  const relatedTopics = buildRelatedTopics(input, matchedContext);
  const routeHighlights = buildRouteHighlights(input, matchedContext);
  const adjustmentSuggestions = buildAdjustmentSuggestions(input);
  const paceText = PACE_LABELS[input.pace] || input.pace;
  const transportText = TRANSPORT_LABELS[input.transport] || input.transport;

  const pathPositioning = `这是一条以${interestLabels.join('、')}为主线的赣州参考性导览路径，重点帮助你在${input.days}天内把景点浏览、主题内容和旅行理解串起来。`;
  const suitableFor = `更适合${input.days}天、${paceText}节奏、${transportText}出行的游客；如果你想先形成清楚的游览思路，再按当天情况微调，这类安排会更合适。`;
  const summaryParts = [
    `这是一条围绕${interestLabels.join('、')}展开的赣州${input.days}天参考导览路径，整体节奏偏${paceText}。`
  ];

  if (scenicTitles.length) {
    summaryParts.push(`它会优先串联${scenicTitles.slice(0, 3).join('、')}这类更容易建立线索的内容。`);
  } else {
    summaryParts.push('它更适合作为理解赣州文旅主题与安排下一步浏览的起点。');
  }

  return {
    summary: summaryParts.join(''),
    pathPositioning,
    suitableFor,
    routeHighlights,
    relatedTopics,
    relatedSpots: scenicTitles,
    adjustmentSuggestions,
    travelTips: buildGenericTravelTips(input)
  };
}

function buildDayTitle(dayItems, index, input) {
  const labels = buildInterestLabels(input);
  const mainLabel = labels[index % labels.length] || '赣州文化体验';
  const firstItem = dayItems[0]?.name || '在地行程';
  return `第${index + 1}天：${mainLabel}与${firstItem}`;
}

function buildItemReason(item, input) {
  const interestLabel = INTEREST_LABELS[input.interests[0]] || '赣州文化体验';
  const regionText = item.region ? `，位于${item.region}` : '';
  return shortenText(`${item.title}${regionText}和你的“${interestLabel}”偏好较匹配，适合放进这次${input.days}天的导览路径中。${item.summary || ''}`, 180);
}

function buildItemTip(item, input) {
  const routeHint = input.transport === 'public_transport'
    ? '建议尽量和周边点位顺路安排，减少临时折返。'
    : '自驾出行可适度放宽范围，但仍建议提前确认路况。';

  if (item.type === 'scenic') {
    return shortenText(`建议优先安排在${SLOT_LABELS.morning}或${SLOT_LABELS.afternoon}体验。${routeHint}`, 120);
  }

  return shortenText(`适合作为当天的文化补充或餐食体验内容。${routeHint}`, 120);
}

function normalizeResultStructure(rawResult, input, matchedContext, modelName) {
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    throw new Error('trip plan json is invalid');
  }

  const guideMetadata = buildTripGuideMetadata(input, matchedContext);
  const slots = SLOT_CONFIG[input.pace] || SLOT_CONFIG.normal;
  const days = Array.isArray(rawResult.days)
    ? rawResult.days
        .slice(0, input.days)
        .map((day, dayIndex) => {
          const rawItems = Array.isArray(day?.items) ? day.items : [];
          const items = rawItems
            .slice(0, slots.length)
            .map((item, itemIndex) => {
              const name = normalizeText(item?.name);
              const reason = normalizeText(item?.reason);
              const tips = normalizeText(item?.tips);

              if (!name || !reason) {
                return null;
              }

              return {
                timeSlot: normalizeTimeSlot(item?.timeSlot, itemIndex, input.pace),
                name,
                type: ['scenic', 'article_or_theme'].includes(item?.type)
                  ? item.type
                  : inferItemType(name, matchedContext),
                reason: shortenText(reason, 180),
                tips: shortenText(tips || '建议结合当天时间、交通与体力灵活调整。', 120)
              };
            })
            .filter(Boolean);

          return {
            dayIndex: Number(day?.dayIndex) > 0 ? Number(day.dayIndex) : dayIndex + 1,
            title: normalizeText(day?.title) || `第${dayIndex + 1}天行程建议`,
            items
          };
        })
        .filter((day) => day.items.length)
    : [];

  if (!days.length) {
    throw new Error('trip plan days is empty');
  }

  const travelTips = sanitizeStringArray(rawResult.travelTips, 5, 120);
  const routeHighlights = sanitizeStringArray(rawResult.routeHighlights, 4, 100);
  const relatedTopics = sanitizeStringArray(rawResult.relatedTopics, 4, 64);
  const relatedSpots = sanitizeStringArray(rawResult.relatedSpots, 5, 64);
  const adjustmentSuggestions = sanitizeStringArray(rawResult.adjustmentSuggestions, 4, 120);

  return {
    summary: shortenText(rawResult.summary, 220) || guideMetadata.summary,
    pathPositioning: shortenText(rawResult.pathPositioning, 220) || guideMetadata.pathPositioning,
    suitableFor: shortenText(rawResult.suitableFor, 220) || guideMetadata.suitableFor,
    routeHighlights: routeHighlights.length ? routeHighlights : guideMetadata.routeHighlights,
    relatedTopics: relatedTopics.length ? relatedTopics : guideMetadata.relatedTopics,
    relatedSpots: relatedSpots.length ? relatedSpots : guideMetadata.relatedSpots,
    adjustmentSuggestions: adjustmentSuggestions.length ? adjustmentSuggestions : guideMetadata.adjustmentSuggestions,
    days,
    travelTips: travelTips.length ? travelTips : guideMetadata.travelTips,
    matchedContext: matchedContext.map((item) => ({
      type: item.type === 'scenic' ? 'scenic' : 'article_or_theme',
      id: item.id,
      title: item.title
    })),
    model_name: modelName
  };
}

function buildFallbackTripPlan(input, matchedContext) {
  const sortedItems = sortMatchedContext(input, matchedContext);
  const slots = SLOT_CONFIG[input.pace] || SLOT_CONFIG.normal;
  const maxItemsPerDay = input.transport === 'self_drive'
    ? Math.min(slots.length, input.pace === 'compact' ? 4 : 3)
    : Math.min(slots.length, input.pace === 'relaxed' ? 2 : 3);
  const totalNeeded = Math.min(sortedItems.length, input.days * maxItemsPerDay);
  const selectedItems = sortedItems.slice(0, totalNeeded);
  const days = [];

  for (let dayIndex = 0; dayIndex < input.days; dayIndex += 1) {
    const start = dayIndex * maxItemsPerDay;
    const currentItems = selectedItems.slice(start, start + maxItemsPerDay);

    if (!currentItems.length) {
      break;
    }

    days.push({
      dayIndex: dayIndex + 1,
      title: buildDayTitle(currentItems, dayIndex, input),
      items: currentItems.map((item, itemIndex) => ({
        timeSlot: slots[itemIndex % slots.length],
        name: item.title,
        type: item.type === 'scenic' ? 'scenic' : 'article_or_theme',
        reason: buildItemReason(item, input),
        tips: buildItemTip(item, input)
      }))
    });
  }

  const guideMetadata = buildTripGuideMetadata(input, matchedContext);

  return {
    ...guideMetadata,
    days,
    matchedContext: matchedContext.map((item) => ({
      type: item.type === 'scenic' ? 'scenic' : 'article_or_theme',
      id: item.id,
      title: item.title
    })),
    model_name: 'fallback-local'
  };
}

async function requestTripPlanCompletion(input, matchedContext) {
  const contextText = buildContextText(matchedContext);
  const messages = buildTripPlanMessages({ input, contextText });
  const aiConfig = getAiConfigState();

  try {
    const requestResult = await postGuideModelRequest({
      messages,
      timeout: 40000
    });

    if (requestResult.skipped) {
      logAiWarn('remote model skipped because AI env is incomplete', {
        baseUrl: aiConfig.baseUrl || '(empty)',
        model: aiConfig.model || '(empty)',
        hasApiKey: aiConfig.hasApiKey,
        fallback: true
      });

      return {
        result: buildFallbackTripPlan(input, matchedContext),
        tokenUsage: 0
      };
    }

    const content = extractMessageContent(requestResult.data?.choices?.[0]?.message?.content);
    const parsed = JSON.parse(extractJsonText(content));
    const normalizedResult = normalizeResultStructure(parsed, input, matchedContext, requestResult.model);

    logAiInfo('remote trip model responded successfully', {
      model: requestResult.model,
      tokenUsage: requestResult.tokenUsage,
      fallback: false
    });

    return {
      result: normalizedResult,
      tokenUsage: requestResult.tokenUsage
    };
  } catch (error) {
    const reason = error.response?.data?.error?.message || error.message || 'trip model request failed';

    logAiError('remote trip model request failed, switching to fallback-local', {
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
      upstreamStatus: error.response?.status || null,
      message: reason,
      fallback: true
    });

    return {
      result: buildFallbackTripPlan(input, matchedContext),
      tokenUsage: 0
    };
  }
}

async function writeTripLog(input, result, tokenUsage) {
  try {
    await AiTripLog.create({
      days: input.days,
      preferences: input.interests.join(','),
      departure_area: '',
      pace: input.pace,
      extra_requirement: JSON.stringify({
        transport: input.transport,
        notes: input.notes || ''
      }),
      result_content: JSON.stringify(result),
      model_name: result.model_name,
      token_usage: tokenUsage || 0
    });
  } catch (error) {
    console.error('[ai-trip] failed to write log:', error.message);
  }
}

export async function generateGanzhouTripPlan(req) {
  const input = sanitizeInput(req.body || {});
  assertValidInput(input);

  const matchedContext = await recallMatchedContext(input);
  const aiResult = await requestTripPlanCompletion(input, matchedContext);
  const result = {
    ...aiResult.result,
    matchedContext: matchedContext.map((item) => ({
      type: item.type === 'scenic' ? 'scenic' : 'article_or_theme',
      id: item.id,
      title: item.title
    })),
    model_name: aiResult.result.model_name
  };

  await writeTripLog(input, result, aiResult.tokenUsage);

  return result;
}
