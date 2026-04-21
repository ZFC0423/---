import { Op } from 'sequelize';

import { Article, Category, ScenicSpot } from '../../../models/index.js';
import {
  CONSTRAINT_PRIORITY,
  DIRECT_THEME_CATEGORY_CODES,
  REGION_ALIASES,
  WEAK_THEME_TERMS
} from './contracts.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function uniqStrings(items) {
  return Array.from(
    new Set(
      items
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
}

function toStringArray(value) {
  return Array.isArray(value) ? uniqStrings(value) : [];
}

function splitTerms(value) {
  return uniqStrings(
    normalizeText(value)
      .split(/[\s,，。；;、/\\|()（）【】[\]'"“”‘’：:!?！？]+/)
      .filter((item) => item.length >= 2)
  );
}

function includesAny(text, terms) {
  const haystack = normalizeText(text).toLowerCase();
  return terms.some((term) => haystack.includes(normalizeText(term).toLowerCase()));
}

function normalizeRegionHints(regionHints) {
  return uniqStrings(
    toStringArray(regionHints).flatMap((region) => {
      const alias = REGION_ALIASES[region];
      return alias ? [region, alias] : [region];
    })
  );
}

function getWeakThemeTerms(themePreferences) {
  return uniqStrings(
    toStringArray(themePreferences).flatMap((theme) => WEAK_THEME_TERMS[theme] || [])
  );
}

function getDirectThemeCodes(themePreferences) {
  return uniqStrings(
    toStringArray(themePreferences)
      .map((theme) => DIRECT_THEME_CATEGORY_CODES[theme] || '')
      .filter(Boolean)
  );
}

export function buildRetrievalSignals(constraints = {}) {
  const subjectEntities = toStringArray(constraints.subject_entities);
  const scenicHints = toStringArray(constraints.scenic_hints);
  const themePreferences = toStringArray(constraints.theme_preferences);
  const regionHints = normalizeRegionHints(constraints.region_hints);
  const userQuery = normalizeText(constraints.user_query);
  // guide 场景里保留 user_query 的低权重 lexical recall，作为结构化 hints 之外的刻意兜底，而不是待清理的历史遗留。
  const userQueryTerms = splitTerms(userQuery);
  const weakThemeTerms = getWeakThemeTerms(themePreferences);
  const directThemeCodes = getDirectThemeCodes(themePreferences);

  const scenicSearchTerms = uniqStrings([
    ...subjectEntities,
    ...scenicHints,
    ...regionHints,
    ...weakThemeTerms,
    ...userQueryTerms
  ]).slice(0, 12);

  const articleSearchTerms = uniqStrings([
    ...subjectEntities,
    ...themePreferences,
    ...weakThemeTerms,
    ...regionHints,
    ...userQueryTerms
  ]).slice(0, 12);

  return {
    subject_entities: subjectEntities,
    scenic_hints: scenicHints,
    theme_preferences: themePreferences,
    region_hints: regionHints,
    user_query: userQuery,
    user_query_terms: userQueryTerms,
    weak_theme_terms: weakThemeTerms,
    direct_theme_codes: directThemeCodes,
    scenic_search_terms: scenicSearchTerms,
    article_search_terms: articleSearchTerms,
    priority_order: CONSTRAINT_PRIORITY
  };
}

function scoreScenicRecord(record, signals) {
  const textParts = [
    record.name,
    record.region,
    record.intro,
    record.culture_desc,
    record.tags,
    record.hero_caption,
    record.quote
  ];
  const joinedText = textParts.map((item) => normalizeText(item)).join(' ').toLowerCase();
  const nameText = normalizeText(record.name).toLowerCase();
  const regionText = normalizeText(record.region).toLowerCase();
  const matchedBy = [];
  let score = 0;
  let directHit = false;

  if (signals.subject_entities.some((term) => nameText.includes(term.toLowerCase()))) {
    matchedBy.push('subject_entities');
    score += 40;
    directHit = true;
  }

  if (signals.scenic_hints.some((term) => joinedText.includes(term.toLowerCase()))) {
    matchedBy.push('scenic_hints');
    score += 24;
  }

  if (signals.region_hints.some((term) => regionText.includes(term.toLowerCase()))) {
    matchedBy.push('region_hints');
    score += 18;
  }

  if (signals.weak_theme_terms.some((term) => joinedText.includes(term.toLowerCase()))) {
    matchedBy.push('theme_preferences');
    score += 12;
  }

  if (signals.user_query_terms.some((term) => joinedText.includes(term.toLowerCase()))) {
    matchedBy.push('user_query');
    score += 6;
  }

  return {
    source_type: 'scenic',
    source_id: Number(record.id),
    source_title: record.name,
    source_label: null,
    author_label: null,
    category_code: normalizeText(record.category?.code),
    record,
    matched_by: uniqStrings(matchedBy),
    score,
    direct_hit: directHit
  };
}

function scoreArticleRecord(record, signals) {
  const textParts = [
    record.title,
    record.summary,
    record.content,
    record.tags,
    record.quote,
    record.category?.name,
    record.category?.code
  ];
  const joinedText = textParts.map((item) => normalizeText(item)).join(' ').toLowerCase();
  const titleText = normalizeText(record.title).toLowerCase();
  const categoryCode = normalizeText(record.category?.code).toLowerCase();
  const matchedBy = [];
  let score = 0;
  let directHit = false;

  if (signals.subject_entities.some((term) => titleText.includes(term.toLowerCase()))) {
    matchedBy.push('subject_entities');
    score += 32;
    directHit = true;
  }

  if (signals.direct_theme_codes.some((code) => categoryCode === code.toLowerCase())) {
    matchedBy.push('theme_preferences');
    score += 35;
    directHit = true;
  } else if (signals.theme_preferences.some((theme) => joinedText.includes(theme.toLowerCase()))) {
    matchedBy.push('theme_preferences');
    score += 18;
  }

  if (signals.region_hints.some((term) => joinedText.includes(term.toLowerCase()))) {
    matchedBy.push('region_hints');
    score += 12;
  }

  if (signals.user_query_terms.some((term) => joinedText.includes(term.toLowerCase()))) {
    matchedBy.push('user_query');
    score += 6;
  }

  return {
    source_type: 'article',
    source_id: Number(record.id),
    source_title: record.title,
    source_label: normalizeText(record.source) || null,
    author_label: normalizeText(record.author) || null,
    category_code: normalizeText(record.category?.code),
    record,
    matched_by: uniqStrings(matchedBy),
    score,
    direct_hit: directHit
  };
}

export function classifyRetrievalStatus(candidates = []) {
  if (!candidates.length) {
    return 'empty';
  }

  if (candidates.some((candidate) => candidate.direct_hit || candidate.score >= 35)) {
    return 'hit';
  }

  return 'partial';
}

export function collectKnowledgeCandidates({ scenicRecords = [], articleRecords = [], signals }) {
  const scenicCandidates = scenicRecords
    .map((record) => scoreScenicRecord(record, signals))
    .filter((candidate) => candidate.score > 0);
  const articleCandidates = articleRecords
    .map((record) => scoreArticleRecord(record, signals))
    .filter((candidate) => candidate.score > 0);

  const seen = new Set();

  const candidates = [...scenicCandidates, ...articleCandidates]
    .sort((left, right) => right.score - left.score)
    .filter((candidate) => {
      const key = `${candidate.source_type}:${candidate.source_id}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 6);

  return {
    signals,
    candidates,
    retrieval_status: classifyRetrievalStatus(candidates)
  };
}

function buildLikeConditions(terms, fields) {
  return terms.flatMap((term) => fields.map((field) => ({ [field]: { [Op.like]: `%${term}%` } })));
}

async function queryScenicRecords(signals, scenicModel) {
  if (!signals.scenic_search_terms.length) {
    return [];
  }

  return scenicModel.findAll({
    where: {
      status: 1,
      [Op.or]: buildLikeConditions(signals.scenic_search_terms, [
        'name',
        'region',
        'intro',
        'culture_desc',
        'tags',
        'hero_caption',
        'quote'
      ])
    },
    include: [
      {
        model: Category,
        as: 'category',
        required: false
      }
    ],
    limit: 12
  });
}

async function queryArticleRecords(signals, articleModel) {
  if (!signals.article_search_terms.length && !signals.direct_theme_codes.length) {
    return [];
  }

  const orConditions = [
    ...buildLikeConditions(signals.article_search_terms, ['title', 'summary', 'content', 'tags'])
  ];

  if (signals.direct_theme_codes.length) {
    orConditions.push({
      '$category.code$': {
        [Op.in]: signals.direct_theme_codes
      }
    });
  }

  return articleModel.findAll({
    where: {
      status: 1,
      [Op.or]: orConditions
    },
    include: [
      {
        model: Category,
        as: 'category',
        required: false
      }
    ],
    limit: 12,
    subQuery: false
  });
}

export async function retrieveKnowledgeCandidates(
  { routerResult, scenicModel = ScenicSpot, articleModel = Article } = {}
) {
  const signals = buildRetrievalSignals(routerResult?.constraints || {});
  const [scenicRecords, articleRecords] = await Promise.all([
    queryScenicRecords(signals, scenicModel),
    queryArticleRecords(signals, articleModel)
  ]);

  return collectKnowledgeCandidates({
    scenicRecords,
    articleRecords,
    signals
  });
}
