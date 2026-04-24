import {
  CAUTION_REASON_CODES,
  FIT_LEVEL_PRIORITY,
  FIT_LEVEL_THRESHOLDS,
  FIT_REASON_CODES,
  THEME_CATEGORY_CODES,
  THEME_TERMS,
  createWarning
} from './contracts.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function uniqStrings(items) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));
}

function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeHotScore(hotScore) {
  return (clamp(Number(hotScore) || 0, 0, 100) / 100) * 6;
}

export function getFitLevel(score) {
  if (score >= FIT_LEVEL_THRESHOLDS.high) {
    return 'high';
  }

  if (score >= FIT_LEVEL_THRESHOLDS.medium) {
    return 'medium';
  }

  return 'low';
}

function getCandidateJoinedText(candidate) {
  return [
    candidate.display_name,
    candidate.region,
    candidate.category_code,
    candidate.category_name,
    candidate.tags.join(' '),
    candidate.text?.intro,
    candidate.text?.culture_desc,
    candidate.text?.hero_caption,
    candidate.text?.route_label,
    candidate.text?.quote,
    candidate.text?.visit_mode,
    candidate.text?.traffic_guide
  ].map((item) => normalizeText(item)).join(' ');
}

function getThemeTerms(themePreferences = []) {
  return uniqStrings(themePreferences.flatMap((theme) => THEME_TERMS[theme] || [theme]));
}

function getThemeCategoryCodes(themePreferences = []) {
  return uniqStrings(themePreferences.flatMap((theme) => THEME_CATEGORY_CODES[theme] || []));
}

function scoreTheme(candidate, continuation) {
  const themes = continuation.theme_preferences || [];

  if (!themes.length) {
    return {
      score: 0,
      axis_score: 0,
      value_code: 'unknown',
      signal_codes: [],
      available: false
    };
  }

  const terms = getThemeTerms(themes);
  const categoryCodes = getThemeCategoryCodes(themes);
  const joinedText = getCandidateJoinedText(candidate);
  const matched = categoryCodes.includes(candidate.category_code) || includesAny(joinedText, terms);

  return {
    score: matched ? 18 : 0,
    axis_score: matched ? 3 : 1,
    value_code: matched ? 'strong_fit' : 'weak',
    signal_codes: matched ? ['theme_match'] : [],
    available: true
  };
}

function scoreRegion(candidate, continuation) {
  const hints = uniqStrings([
    ...(continuation.region_hints || []),
    ...(continuation.destination_scope || [])
  ]);

  if (!hints.length) {
    return {
      score: 0,
      axis_score: 0,
      value_code: 'unknown',
      signal_codes: [],
      available: false
    };
  }

  const matched = includesAny(candidate.region, hints) || includesAny(getCandidateJoinedText(candidate), hints);

  return {
    score: matched ? 14 : 0,
    axis_score: matched ? 3 : 1,
    value_code: matched ? 'strong_fit' : 'weak',
    signal_codes: matched ? ['region_match'] : [],
    available: true
  };
}

function isFamilyCompanion(companions = []) {
  return companions.some((item) => /family|kid|child|elder|parent/i.test(item));
}

function scoreFamily(candidate, continuation) {
  if (!isFamilyCompanion(continuation.companions || [])) {
    return {
      score: 0,
      axis_score: 0,
      value_code: 'unknown',
      signal_codes: [],
      available: false,
      caution: null
    };
  }

  if (candidate.family_friendly) {
    return {
      score: 12,
      axis_score: 3,
      value_code: 'strong_fit',
      signal_codes: ['family_friendly_supported'],
      available: true,
      caution: null
    };
  }

  return {
    score: -12,
    axis_score: 0,
    value_code: 'conflict',
    signal_codes: ['family_friendly_unsupported'],
    available: true,
    caution: 'family_friendly_unsupported'
  };
}

function classifyWalkingIntensity(value) {
  const text = lower(value);

  if (!text) {
    return 'unknown';
  }

  if (/high|steep|hard|climb|mountain|半 day|1 day|高/.test(text)) {
    return 'high';
  }

  if (/medium|normal|2-3|中/.test(text)) {
    return 'medium';
  }

  if (/low|light|easy|walk|1 hour|free|轻/.test(text)) {
    return 'low';
  }

  return 'unknown';
}

function wantsLowWalking(continuation) {
  const text = [
    ...(continuation.hard_avoidances || []),
    ...(continuation.physical_constraints || []),
    continuation.pace_preference
  ].join(' ');

  return /avoid_steep|avoid_overtiring|mobility|elder|kid|relaxed|low_walk|no_climb/i.test(text);
}

function scoreWalking(candidate, continuation) {
  const intensity = classifyWalkingIntensity(candidate.text?.walking_intensity);
  const constrained = wantsLowWalking(continuation);

  if (!constrained) {
    return {
      score: 0,
      axis_score: intensity === 'unknown' ? 0 : 2,
      value_code: intensity === 'unknown' ? 'unknown' : 'partial',
      signal_codes: [],
      available: intensity !== 'unknown',
      caution: null,
      hardConflict: false
    };
  }

  if (intensity === 'unknown') {
    return {
      score: -2,
      axis_score: 0,
      value_code: 'unknown',
      signal_codes: ['walking_intensity_unknown'],
      available: true,
      caution: 'walking_intensity_unknown',
      hardConflict: false
    };
  }

  if (intensity === 'high') {
    return {
      score: -18,
      axis_score: 0,
      value_code: 'conflict',
      signal_codes: ['walking_intensity_conflict'],
      available: true,
      caution: 'walking_intensity_conflict',
      hardConflict: true
    };
  }

  return {
    score: intensity === 'low' ? 10 : 5,
    axis_score: intensity === 'low' ? 3 : 2,
    value_code: intensity === 'low' ? 'strong_fit' : 'fit',
    signal_codes: ['walking_intensity_match'],
    available: true,
    caution: null,
    hardConflict: false
  };
}

const TRANSPORT_TERMS = {
  public_transport: ['public_transport', 'public transport', 'bus', 'transit', 'walk', 'walking', 'citywalk', 'on foot'],
  self_drive: ['self_drive', 'self-drive', 'self drive', 'drive', 'driving', 'car', 'parking']
};

function scoreTransport(candidate, continuation) {
  const mode = continuation.travel_mode;

  if (!mode) {
    return {
      score: 0,
      axis_score: 0,
      value_code: 'unknown',
      signal_codes: [],
      available: false,
      caution: null
    };
  }

  const text = [
    candidate.text?.visit_mode,
    candidate.text?.route_label,
    candidate.text?.tags,
    candidate.text?.intro,
    candidate.text?.culture_desc,
    candidate.text?.traffic_guide
  ].join(' ');
  const publicHit = includesAny(text, TRANSPORT_TERMS.public_transport);
  const driveHit = includesAny(text, TRANSPORT_TERMS.self_drive);
  const modeHit = mode === 'mixed'
    ? publicHit || driveHit
    : mode === 'public_transport'
      ? publicHit
      : driveHit;
  const oppositeHit = mode === 'public_transport' ? driveHit : mode === 'self_drive' ? publicHit : false;

  if (modeHit) {
    return {
      score: 8,
      axis_score: 3,
      value_code: 'fit',
      signal_codes: ['travel_mode_text_signal'],
      available: true,
      caution: null
    };
  }

  if (oppositeHit) {
    return {
      score: -3,
      axis_score: 1,
      value_code: 'partial',
      signal_codes: ['transport_signal_conflict'],
      available: true,
      caution: 'transport_signal_conflict'
    };
  }

  return {
    score: 0,
    axis_score: 0,
    value_code: 'unknown',
    signal_codes: [],
    available: false,
    caution: 'transport_signal_limited'
  };
}

function scoreDestination(candidate, continuation) {
  const hints = continuation.destination_scope || [];

  if (!hints.length) {
    return 0;
  }

  return includesAny(candidate.region, hints) || includesAny(getCandidateJoinedText(candidate), hints) ? 8 : 0;
}

function scoreEditorial(candidate) {
  const hotSignal = normalizeHotScore(candidate.hot_score);
  const recommendSignal = candidate.recommend_flag ? 6 : 0;
  const axisScore = candidate.recommend_flag ? 3 : candidate.hot_score >= 80 ? 2 : candidate.hot_score > 0 ? 1 : 0;

  return {
    score: recommendSignal + hotSignal,
    axis_score: axisScore,
    value_code: axisScore >= 3 ? 'editorial_high' : axisScore >= 2 ? 'editorial_medium' : 'editorial_low',
    signal_codes: [
      ...(candidate.recommend_flag ? ['recommend_flag'] : []),
      ...(hotSignal > 0 ? ['hot_score_signal'] : [])
    ],
    available: true
  };
}

function filterAllowedCodes(codes, allowed) {
  return uniqStrings(codes).filter((code) => allowed.includes(code));
}

function shouldHardFilter(candidate, continuation, walkingScore) {
  const strictAvoidance = (continuation.hard_avoidances || []).some((item) => /avoid_steep|avoid_overtiring|no_climb/i.test(item));
  const mobilityConstraint = (continuation.physical_constraints || []).some((item) => /mobility|elder/i.test(item));

  return walkingScore.hardConflict && (strictAvoidance || mobilityConstraint);
}

export function scoreCandidate(candidate, continuation = {}, { seedOptionKeys = [] } = {}) {
  const theme = scoreTheme(candidate, continuation);
  const region = scoreRegion(candidate, continuation);
  const family = scoreFamily(candidate, continuation);
  const walking = scoreWalking(candidate, continuation);
  const transport = scoreTransport(candidate, continuation);
  const editorial = scoreEditorial(candidate);
  const explicitSeed = seedOptionKeys.includes(candidate.option_key) ? 10 : 0;
  const destination = scoreDestination(candidate, continuation);

  if (shouldHardFilter(candidate, continuation, walking)) {
    return null;
  }

  const score = clamp(
    Math.round(
      50
      + theme.score
      + region.score
      + family.score
      + walking.score
      + transport.score
      + destination
      + explicitSeed
      + editorial.score
    ),
    0,
    100
  );
  const fitReasons = filterAllowedCodes([
    ...theme.signal_codes,
    ...region.signal_codes,
    ...family.signal_codes,
    ...walking.signal_codes,
    ...transport.signal_codes,
    ...(destination > 0 ? ['destination_scope_match'] : []),
    ...(explicitSeed ? ['explicit_mention_seed'] : []),
    ...editorial.signal_codes
  ], FIT_REASON_CODES);
  const cautionReasons = filterAllowedCodes([
    family.caution,
    walking.caution,
    transport.caution
  ], CAUTION_REASON_CODES);
  const warnings = [];

  if (walking.caution === 'walking_intensity_unknown') {
    warnings.push(createWarning({
      code: 'walking_intensity_unknown',
      scope: 'option',
      option_key: candidate.option_key,
      severity: 'info'
    }));
  }

  if (transport.caution === 'transport_signal_limited') {
    warnings.push(createWarning({
      code: 'transport_signal_limited',
      scope: 'global',
      severity: 'info'
    }));
  }

  return {
    ...candidate,
    fit_score: score,
    fit_level: getFitLevel(score),
    fit_reasons: fitReasons,
    caution_reasons: cautionReasons,
    warnings,
    axes: {
      theme_fit: theme,
      region_fit: region,
      transport_fit: transport,
      walking_fit: walking,
      family_fit: family,
      editorial_priority: editorial
    }
  };
}

export function compareScoredOptions(left, right) {
  if (right.fit_score !== left.fit_score) return right.fit_score - left.fit_score;
  if (FIT_LEVEL_PRIORITY[right.fit_level] !== FIT_LEVEL_PRIORITY[left.fit_level]) {
    return FIT_LEVEL_PRIORITY[right.fit_level] - FIT_LEVEL_PRIORITY[left.fit_level];
  }
  if (right.recommend_flag !== left.recommend_flag) return right.recommend_flag - left.recommend_flag;
  if (right.hot_score !== left.hot_score) return right.hot_score - left.hot_score;
  return left.entity_id - right.entity_id;
}

export function scoreCandidates(candidates = [], continuation = {}, options = {}) {
  const scored = candidates
    .map((candidate) => scoreCandidate(candidate, continuation, options))
    .filter(Boolean)
    .sort(compareScoredOptions);
  const warnings = scored.flatMap((candidate) => candidate.warnings);

  if (continuation.route_origin) {
    warnings.push(createWarning({
      code: 'route_origin_no_distance_scoring',
      scope: 'field',
      field: 'constraints.route_origin',
      severity: 'info'
    }));
  }

  return {
    scored_options: scored,
    warnings
  };
}

export function projectRankedOptions(scoredOptions = [], optionLimit = 3) {
  return scoredOptions.slice(0, optionLimit).map((option, index) => ({
    option_key: option.option_key,
    entity_type: 'scenic',
    entity_id: option.entity_id,
    rank: index + 1,
    display_name: option.display_name,
    region: option.region,
    category_id: option.category_id,
    fit_score: option.fit_score,
    fit_level: option.fit_level,
    fit_reasons: option.fit_reasons,
    caution_reasons: option.caution_reasons,
    evidence_refs: []
  }));
}

export const DISCOVERY_SCORE_PRIVATE = {
  classifyWalkingIntensity,
  compareScoredOptions,
  getCandidateJoinedText,
  scoreTransport,
  scoreWalking
};
