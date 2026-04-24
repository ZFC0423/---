import { Op } from 'sequelize';

import { Category, ScenicSpot } from '../../../models/index.js';
import {
  CATEGORY_ATTRIBUTES,
  OPTION_KEY_PATTERN,
  SCENIC_OPTIONAL_FIELDS,
  SCENIC_REQUIRED_FIELDS,
  SCENIC_TEXT_FIELDS,
  THEME_TERMS
} from './contracts.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeForMatch(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[\s,.;:!?'"()[\]{}，。；：！？“”‘’（）【】]/g, '');
}

function uniqStrings(items) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));
}

function toPlainRecord(record) {
  if (record && typeof record.get === 'function') {
    return record.get({ plain: true });
  }

  return record || {};
}

function parseStringList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqStrings(value);
  }

  const text = normalizeText(value);

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? uniqStrings(parsed) : [];
  } catch (error) {
    return uniqStrings(text.split(/[,，;；|]/));
  }
}

function getModelAttributeNames(model) {
  return new Set(Object.keys(model?.rawAttributes || {}));
}

export function getSafeScenicAttributes(scenicModel = ScenicSpot) {
  const attributeNames = getModelAttributeNames(scenicModel);
  const requested = [...SCENIC_REQUIRED_FIELDS, ...SCENIC_OPTIONAL_FIELDS];

  if (!attributeNames.size) {
    return requested;
  }

  return requested.filter((field) => attributeNames.has(field));
}

function getSafeTextFields(scenicModel = ScenicSpot) {
  const attributeNames = getModelAttributeNames(scenicModel);

  if (!attributeNames.size) {
    return SCENIC_TEXT_FIELDS;
  }

  return SCENIC_TEXT_FIELDS.filter((field) => attributeNames.has(field));
}

function canIncludeCategory(scenicModel = ScenicSpot) {
  return Boolean(scenicModel?.associations?.category);
}

function buildCategoryInclude(scenicModel = ScenicSpot, categoryModel = Category) {
  if (!canIncludeCategory(scenicModel)) {
    return [];
  }

  return [
    {
      model: categoryModel,
      as: 'category',
      required: false,
      attributes: CATEGORY_ATTRIBUTES
    }
  ];
}

function buildLikeConditions(terms, fields) {
  return terms.flatMap((term) => fields.map((field) => ({ [field]: { [Op.like]: `%${term}%` } })));
}

function getThemeTerms(themePreferences = []) {
  return uniqStrings(themePreferences.flatMap((theme) => THEME_TERMS[theme] || [theme]));
}

function buildSearchTerms(continuation = {}, seedTexts = []) {
  return uniqStrings([
    ...seedTexts,
    ...getThemeTerms(continuation.theme_preferences || []),
    ...(continuation.region_hints || []),
    ...(continuation.destination_scope || [])
  ]).slice(0, 18);
}

export function toDiscoveryCandidate(record) {
  const plain = toPlainRecord(record);
  const category = plain.category || null;
  const id = Number(plain.id);

  return {
    option_key: `scenic:${id}`,
    entity_type: 'scenic',
    entity_id: id,
    display_name: normalizeText(plain.name),
    region: normalizeText(plain.region),
    category_id: plain.category_id === null || plain.category_id === undefined ? null : Number(plain.category_id),
    category_code: normalizeText(category?.code),
    category_name: normalizeText(category?.name),
    family_friendly: Number(plain.family_friendly || 0) === 1 || plain.family_friendly === true,
    tags: parseStringList(plain.tags),
    recommend_flag: Number(plain.recommend_flag || 0),
    hot_score: Number(plain.hot_score || 0),
    text: {
      name: normalizeText(plain.name),
      region: normalizeText(plain.region),
      intro: normalizeText(plain.intro),
      culture_desc: normalizeText(plain.culture_desc),
      hero_caption: normalizeText(plain.hero_caption),
      route_label: normalizeText(plain.route_label),
      quote: normalizeText(plain.quote),
      visit_mode: normalizeText(plain.visit_mode),
      walking_intensity: normalizeText(plain.walking_intensity),
      traffic_guide: normalizeText(plain.traffic_guide),
      tags: parseStringList(plain.tags).join(' ')
    },
    record: plain
  };
}

async function findScenicById({ id, scenicModel, categoryModel }) {
  const query = {
    where: {
      id,
      status: 1
    },
    attributes: getSafeScenicAttributes(scenicModel),
    include: buildCategoryInclude(scenicModel, categoryModel)
  };

  if (typeof scenicModel.findOne === 'function') {
    return scenicModel.findOne(query);
  }

  const records = await scenicModel.findAll({
    ...query,
    limit: 1
  });
  return records[0] || null;
}

export async function resolveOptionKeyToScenicCandidate(
  optionKey,
  { scenicModel = ScenicSpot, categoryModel = Category } = {}
) {
  const match = normalizeText(optionKey).match(OPTION_KEY_PATTERN);

  if (!match) {
    return {
      requested_text: normalizeText(optionKey),
      resolution_status: 'missing',
      resolution_reason: 'invalid_option_key',
      option_key: null,
      candidate: null
    };
  }

  const record = await findScenicById({
    id: Number(match[1]),
    scenicModel,
    categoryModel
  });

  if (!record) {
    return {
      requested_text: normalizeText(optionKey),
      resolution_status: 'missing',
      resolution_reason: 'option_key_not_found',
      option_key: null,
      candidate: null
    };
  }

  const candidate = toDiscoveryCandidate(record);

  return {
    requested_text: normalizeText(optionKey),
    resolution_status: 'resolved',
    resolution_reason: 'option_key',
    option_key: candidate.option_key,
    candidate
  };
}

function classifyMentionMatches(requestedText, records) {
  const requestedNormalized = normalizeForMatch(requestedText);
  const candidates = records.map((record) => toDiscoveryCandidate(record));
  const ranked = candidates
    .map((candidate) => {
      const nameNormalized = normalizeForMatch(candidate.display_name);
      const tagNormalized = normalizeForMatch(candidate.tags.join(' '));
      let strength = 0;

      if (nameNormalized === requestedNormalized) {
        strength = 3;
      } else if (nameNormalized.includes(requestedNormalized) || requestedNormalized.includes(nameNormalized)) {
        strength = 2;
      } else if (tagNormalized.includes(requestedNormalized)) {
        strength = 1;
      }

      return {
        candidate,
        strength
      };
    })
    .filter((item) => item.strength > 0)
    .sort((left, right) => {
      if (right.strength !== left.strength) return right.strength - left.strength;
      if (right.candidate.recommend_flag !== left.candidate.recommend_flag) return right.candidate.recommend_flag - left.candidate.recommend_flag;
      if (right.candidate.hot_score !== left.candidate.hot_score) return right.candidate.hot_score - left.candidate.hot_score;
      return left.candidate.entity_id - right.candidate.entity_id;
    });

  if (!ranked.length) {
    return {
      resolution_status: 'missing',
      resolution_reason: 'no_match',
      option_key: null,
      candidate: null
    };
  }

  const best = ranked[0];
  const tiedBest = ranked.filter((item) => item.strength === best.strength);

  if (tiedBest.length > 1 && best.strength < 3) {
    return {
      resolution_status: 'ambiguous',
      resolution_reason: 'multiple_matches',
      option_key: null,
      candidate: null
    };
  }

  return {
    resolution_status: 'resolved',
    resolution_reason: best.strength === 3 ? 'exact' : best.strength === 2 ? 'contains' : 'tag',
    option_key: best.candidate.option_key,
    candidate: best.candidate
  };
}

export async function resolveMentionToScenic(
  requestedText,
  { scenicModel = ScenicSpot, categoryModel = Category } = {}
) {
  const text = normalizeText(requestedText);

  if (!text) {
    return {
      requested_text: '',
      resolution_status: 'missing',
      resolution_reason: 'empty_text',
      option_key: null,
      candidate: null
    };
  }

  const textFields = getSafeTextFields(scenicModel).filter((field) => ['name', 'tags'].includes(field));
  const broadFields = textFields.length ? textFields : ['name'];

  const records = await scenicModel.findAll({
    where: {
      status: 1,
      [Op.or]: buildLikeConditions([text], broadFields)
    },
    attributes: getSafeScenicAttributes(scenicModel),
    include: buildCategoryInclude(scenicModel, categoryModel),
    order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'ASC']],
    limit: 8
  });
  const resolution = classifyMentionMatches(text, records);

  return {
    requested_text: text,
    ...resolution
  };
}

function mergeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate || seen.has(candidate.option_key)) {
      return false;
    }

    seen.add(candidate.option_key);
    return true;
  });
}

async function queryCandidatePool({
  continuation,
  seedTexts = [],
  executionExcludeOptionKeys = [],
  mode = 'primary',
  scenicModel = ScenicSpot,
  categoryModel = Category
}) {
  const terms = buildSearchTerms(continuation, seedTexts);
  const textFields = getSafeTextFields(scenicModel);
  const searchableFields = textFields.filter((field) => field !== 'walking_intensity');
  const where = {
    status: 1
  };
  const excludedIds = executionExcludeOptionKeys
    .map((key) => Number(normalizeText(key).match(OPTION_KEY_PATTERN)?.[1]))
    .filter((id) => Number.isInteger(id));

  if (excludedIds.length) {
    where.id = {
      [Op.notIn]: excludedIds
    };
  }

  if (mode === 'primary' && terms.length && searchableFields.length) {
    where[Op.or] = buildLikeConditions(terms, searchableFields);
  }

  return scenicModel.findAll({
    where,
    attributes: getSafeScenicAttributes(scenicModel),
    include: buildCategoryInclude(scenicModel, categoryModel),
    order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'ASC']],
    limit: mode === 'primary' ? 30 : 60
  });
}

export async function retrieveDiscoveryCandidates({
  continuation,
  seedTexts = [],
  seedOptionKeys = [],
  executionExcludeOptionKeys = [],
  mode = 'primary',
  scenicModel = ScenicSpot,
  categoryModel = Category
} = {}) {
  const optionKeyResolutions = [];

  for (const optionKey of seedOptionKeys) {
    optionKeyResolutions.push(await resolveOptionKeyToScenicCandidate(optionKey, { scenicModel, categoryModel }));
  }

  const optionKeyCandidates = optionKeyResolutions
    .filter((resolution) => resolution.resolution_status === 'resolved')
    .map((resolution) => resolution.candidate);
  const records = await queryCandidatePool({
    continuation,
    seedTexts,
    executionExcludeOptionKeys,
    mode,
    scenicModel,
    categoryModel
  });
  const poolCandidates = records.map((record) => toDiscoveryCandidate(record));

  return {
    mode,
    candidates: mergeCandidates([...optionKeyCandidates, ...poolCandidates]),
    option_key_resolutions: optionKeyResolutions,
    diagnostics: []
  };
}

export const DISCOVERY_RETRIEVE_PRIVATE = {
  buildSearchTerms,
  canIncludeCategory,
  getSafeScenicAttributes,
  getSafeTextFields,
  normalizeForMatch,
  parseStringList,
  toDiscoveryCandidate
};
