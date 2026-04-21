import {
  createEmptyGuideConstraints,
  createEmptyNullTaskConstraints,
  createEmptyRouteConstraints
} from './contracts.js';
import { normalizeText } from './preprocess.js';

const CHINESE_NUMBER_MAP = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5
};

const THEME_KEYWORDS = [
  ['natural', /(自然|风光|山|森林|徒步|户外|生态)/i],
  ['red_culture', /(红色|革命|长征|瑞金|苏区)/i],
  ['hakka_culture', /(客家|围屋|家风|客家文化)/i],
  ['heritage', /(非遗|传统|戏曲|古迹|民俗|手艺)/i],
  ['food', /(美食|小吃|吃|餐|客家菜|早餐|夜宵)/i],
  ['family', /(亲子|家人|带娃|小孩|老人)/i],
  ['photography', /(拍照|摄影|出片|打卡|机位|夜景)/i]
];

const GUIDE_KEYWORDS = [
  /介绍|讲讲|了解|说说|为什么|是什么|背后|关系|历史|文化|值得看/i,
  /有哪些景点|有什么看点|怎么理解/i
];

const ROUTE_KEYWORDS = [
  /路线|行程|安排|规划|怎么走|怎么玩|几天|周末|一日游|两日游|自驾|公共交通/i,
  /帮我排|帮我顺|帮我做个安排|路线工作室/i
];

const STRONG_ROUTE_KEYWORDS = [
  /安排.*路线|规划.*路线|帮我.*行程|帮我.*路线|怎么安排|几天怎么玩/i
];

const KNOWN_ENTITY_PATTERNS = [
  /郁孤台/g,
  /通天岩/g,
  /八境台/g,
  /灶儿巷/g,
  /赣州古城/g,
  /瑞金/g,
  /三百山/g
];

function uniqStrings(items) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));
}

function parseDays(text) {
  const digitMatch = text.match(/([1-5])\s*天/);

  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const chineseMatch = text.match(/([一二两三四五])\s*天/);

  if (chineseMatch) {
    return CHINESE_NUMBER_MAP[chineseMatch[1]] || null;
  }

  if (/周末|两日游/i.test(text)) {
    return 2;
  }

  if (/一日游/i.test(text)) {
    return 1;
  }

  return null;
}

function parseDateText(text) {
  const match = text.match(/周末|五一|端午|暑假|国庆|明天|今天|下周末/i);
  return match ? match[0] : null;
}

function parseTimeBudget(text) {
  const days = parseDays(text);
  const dateText = parseDateText(text);

  if (days === null && dateText === null) {
    return null;
  }

  return {
    days,
    date_text: dateText
  };
}

function parseMoneyBudget(text) {
  const amountMatch = text.match(/预算\s*(\d+\s*元?)/i);

  if (amountMatch) {
    return {
      level: null,
      amount_text: amountMatch[1].replace(/\s+/g, '')
    };
  }

  if (/预算紧|省钱|便宜|低预算|穷游/i.test(text)) {
    return { level: 'low', amount_text: null };
  }

  if (/预算充足|不差钱|高预算|可以贵一点/i.test(text)) {
    return { level: 'high', amount_text: null };
  }

  if (/预算适中|正常预算|中等预算/i.test(text)) {
    return { level: 'medium', amount_text: null };
  }

  return null;
}

function parseTravelMode(text, conflictCodes, ruleHits) {
  const hasPublicTransport = /(公共交通|公交|高铁|火车|不开车|地铁)/i.test(text);
  const hasSelfDrive = /(自驾|开车|租车)/i.test(text);
  const hasMixed = /(混合交通|都可以|交通都行)/i.test(text);

  if ((hasPublicTransport && hasSelfDrive) || (hasMixed && (hasPublicTransport || hasSelfDrive))) {
    conflictCodes.push('travel_mode_conflict');
    ruleHits.push('conflict:travel_mode_conflict');
    return null;
  }

  if (hasMixed) {
    ruleHits.push('travel_mode:mixed');
    return 'mixed';
  }

  if (hasSelfDrive) {
    ruleHits.push('travel_mode:self_drive');
    return 'self_drive';
  }

  if (hasPublicTransport) {
    ruleHits.push('travel_mode:public_transport');
    return 'public_transport';
  }

  return null;
}

function parsePacePreference(text, conflictCodes, ruleHits) {
  const wantsRelaxed = /(轻松|慢游|悠闲|别太赶)/i.test(text);
  const wantsCompact = /(紧凑|高强度|多跑几个|尽量多看|赶一点)/i.test(text);
  const wantsNormal = /(适中|平衡|正常节奏)/i.test(text);

  if ((wantsRelaxed && wantsCompact) || (wantsRelaxed && /全部|都看|全覆盖/i.test(text))) {
    conflictCodes.push('pace_vs_scope');
    ruleHits.push('conflict:pace_vs_scope');
    return null;
  }

  if (wantsRelaxed) {
    ruleHits.push('pace:relaxed');
    return 'relaxed';
  }

  if (wantsCompact) {
    ruleHits.push('pace:compact');
    return 'compact';
  }

  if (wantsNormal) {
    ruleHits.push('pace:normal');
    return 'normal';
  }

  return null;
}

function parseThemePreferences(text) {
  const themes = THEME_KEYWORDS.filter(([, pattern]) => pattern.test(text)).map(([theme]) => theme);
  return themes.length ? uniqStrings(themes) : null;
}

function parseCompanions(text) {
  const companions = [];

  if (/(一个人|独自|自己去|solo)/i.test(text)) {
    companions.push('solo');
  }

  if (/(情侣|两个人|对象)/i.test(text)) {
    companions.push('couple');
  }

  if (/(朋友|同学|闺蜜|兄弟)/i.test(text)) {
    companions.push('friends');
  }

  if (/(亲子|带娃|孩子|小孩)/i.test(text)) {
    companions.push('family_with_kids');
  }

  if (/(老人|长辈|爸妈)/i.test(text)) {
    companions.push('family_with_elders');
  }

  return companions.length ? uniqStrings(companions) : null;
}

function parseHardAvoidances(text) {
  const items = [];

  if (/(不要太累|别太赶|不想太折腾)/i.test(text)) {
    items.push('avoid_overtiring');
  }

  if (/(避开人多|别太拥挤|不想排队)/i.test(text)) {
    items.push('avoid_crowded');
  }

  if (/(不爬山|别爬坡|少走路)/i.test(text)) {
    items.push('avoid_steep_walks');
  }

  return items.length ? uniqStrings(items) : null;
}

function parsePhysicalConstraints(text) {
  const items = [];

  if (/(老人|长辈|腿脚|膝盖|行动不便)/i.test(text)) {
    items.push('mobility_sensitive');
  }

  if (/(孩子|带娃|亲子)/i.test(text)) {
    items.push('kid_friendly_needed');
  }

  return items.length ? uniqStrings(items) : null;
}

function parseStatusFlags(text) {
  if (/(已经有计划|已有路线|已经安排|想调整现有路线)/i.test(text)) {
    return { already_has_plan: true };
  }

  return null;
}

function parseRouteOrigin(text) {
  const match = text.match(/从\s*([^\s，。,；;]{2,12})\s*出发/i);
  return match ? normalizeText(match[1]) : null;
}

function parseDestinationScope(text) {
  if (/赣州/i.test(text)) {
    return 'ganzhou';
  }

  const match = text.match(/去\s*([^\s，。,；;]{2,12})/i);
  return match ? normalizeText(match[1]) : null;
}

function parseKnownEntities(text) {
  const matches = [];

  KNOWN_ENTITY_PATTERNS.forEach((pattern) => {
    const found = text.match(pattern);

    if (found) {
      matches.push(...found);
    }
  });

  return matches.length ? uniqStrings(matches) : null;
}

function detectRouteIntent(text, ruleHits) {
  const strongMatch = STRONG_ROUTE_KEYWORDS.some((pattern) => pattern.test(text));
  const routeMatchCount = ROUTE_KEYWORDS.filter((pattern) => pattern.test(text)).length;

  if (strongMatch) {
    ruleHits.push('intent:route:strong');
    return { score: 3, resolved: true };
  }

  if (routeMatchCount >= 2) {
    ruleHits.push('intent:route:multi');
    return { score: 2, resolved: true };
  }

  if (routeMatchCount === 1) {
    ruleHits.push('intent:route:weak');
    return { score: 1, resolved: false };
  }

  return { score: 0, resolved: false };
}

function detectGuideIntent(text, ruleHits) {
  const guideMatchCount = GUIDE_KEYWORDS.filter((pattern) => pattern.test(text)).length;

  if (guideMatchCount >= 2) {
    ruleHits.push('intent:guide:multi');
    return { score: 2, resolved: true };
  }

  if (guideMatchCount === 1) {
    ruleHits.push('intent:guide:weak');
    return { score: 1, resolved: false };
  }

  return { score: 0, resolved: false };
}

function buildGuideConstraints(text) {
  const constraints = createEmptyGuideConstraints(text);
  const entities = parseKnownEntities(text);
  const themes = parseThemePreferences(text);

  return {
    ...constraints,
    subject_entities: entities,
    theme_preferences: themes,
    region_hints: /章贡|赣县|瑞金|安远|宁都|大余/i.test(text)
      ? uniqStrings(text.match(/章贡|赣县|瑞金|安远|宁都|大余/gi) || [])
      : null,
    scenic_hints: entities,
    hard_avoidances: parseHardAvoidances(text),
    companions: parseCompanions(text)
  };
}

function buildRouteConstraints(text, conflictCodes, ruleHits) {
  const constraints = createEmptyRouteConstraints(text);

  return {
    ...constraints,
    time_budget: parseTimeBudget(text),
    money_budget: parseMoneyBudget(text),
    travel_mode: parseTravelMode(text, conflictCodes, ruleHits),
    companions: parseCompanions(text),
    pace_preference: parsePacePreference(text, conflictCodes, ruleHits),
    theme_preferences: parseThemePreferences(text),
    hard_avoidances: parseHardAvoidances(text),
    physical_constraints: parsePhysicalConstraints(text),
    status_flags: parseStatusFlags(text),
    route_origin: parseRouteOrigin(text),
    destination_scope: parseDestinationScope(text)
  };
}

function buildNullConstraints(text) {
  const constraints = createEmptyNullTaskConstraints(text);
  const entities = parseKnownEntities(text);

  return {
    ...constraints,
    time_budget: parseTimeBudget(text),
    money_budget: parseMoneyBudget(text),
    companions: parseCompanions(text),
    theme_preferences: parseThemePreferences(text),
    hard_avoidances: parseHardAvoidances(text),
    physical_constraints: parsePhysicalConstraints(text),
    status_flags: parseStatusFlags(text),
    route_origin: parseRouteOrigin(text),
    destination_scope: parseDestinationScope(text),
    subject_entities: entities,
    scenic_hints: entities
  };
}

export function buildFallbackIntentResult({ normalizedInput, fallbackReason = null, extraRuleHits = [] }) {
  const text = normalizeText(normalizedInput);
  const ruleHits = [...extraRuleHits];
  const conflictCodes = [];
  const routeIntent = detectRouteIntent(text, ruleHits);
  const guideIntent = detectGuideIntent(text, ruleHits);
  const isMixedIntent = routeIntent.score > 0 && guideIntent.score > 0;

  if (isMixedIntent) {
    if (guideIntent.score > routeIntent.score) {
      ruleHits.push('intent:mixed:guide_dominant');

      return {
        task_type: 'guide_understand',
        task_confidence: guideIntent.resolved ? 0.8 : 0.64,
        constraints: buildGuideConstraints(text),
        clarification_reason: null,
        _meta: {
          decision_source: 'fallback',
          prior_state_usage: 'none',
          fallback_reason: fallbackReason,
          missing_required_fields: [],
          rule_hits: ruleHits,
          conflict_codes: [],
          fallback_resolution: guideIntent.resolved ? 'fallback_resolved' : 'fallback_tentative'
        }
      };
    }

    if (routeIntent.score > guideIntent.score) {
      ruleHits.push('intent:mixed:route_dominant');
      const constraints = buildRouteConstraints(text, conflictCodes, ruleHits);
      const hasConflict = conflictCodes.length > 0;
      const resolved = routeIntent.resolved || Boolean(constraints.time_budget) || Boolean(constraints.travel_mode);

      return {
        task_type: 'plan_route',
        task_confidence: resolved ? 0.84 : 0.61,
        constraints,
        clarification_reason: hasConflict ? 'constraint_conflict' : null,
        _meta: {
          decision_source: 'fallback',
          prior_state_usage: 'none',
          fallback_reason: fallbackReason,
          missing_required_fields: [],
          rule_hits: ruleHits,
          conflict_codes: conflictCodes,
          fallback_resolution: resolved ? 'fallback_resolved' : 'fallback_tentative'
        }
      };
    }

    ruleHits.push('intent:ambiguous:mixed');

    return {
      task_type: null,
      task_confidence: 0.32,
      constraints: buildNullConstraints(text),
      clarification_reason: 'intent_ambiguous',
      _meta: {
        decision_source: 'fallback',
        prior_state_usage: 'none',
        fallback_reason: fallbackReason,
        missing_required_fields: [],
        rule_hits: ruleHits,
        conflict_codes: [],
        fallback_resolution: 'fallback_tentative'
      }
    };
  }

  if (routeIntent.score > 0) {
    const constraints = buildRouteConstraints(text, conflictCodes, ruleHits);
    const hasConflict = conflictCodes.length > 0;
    const resolved = routeIntent.resolved || Boolean(constraints.time_budget) || Boolean(constraints.travel_mode);

    return {
      task_type: 'plan_route',
      task_confidence: resolved ? 0.84 : 0.61,
      constraints,
      clarification_reason: hasConflict ? 'constraint_conflict' : null,
      _meta: {
        decision_source: 'fallback',
        prior_state_usage: 'none',
        fallback_reason: fallbackReason,
        missing_required_fields: [],
        rule_hits: ruleHits,
        conflict_codes: conflictCodes,
        fallback_resolution: resolved ? 'fallback_resolved' : 'fallback_tentative'
      }
    };
  }

  if (guideIntent.score > routeIntent.score && guideIntent.score > 0) {
    return {
      task_type: 'guide_understand',
      task_confidence: guideIntent.resolved ? 0.8 : 0.64,
      constraints: buildGuideConstraints(text),
      clarification_reason: null,
      _meta: {
        decision_source: 'fallback',
        prior_state_usage: 'none',
        fallback_reason: fallbackReason,
        missing_required_fields: [],
        rule_hits: ruleHits,
        conflict_codes: [],
        fallback_resolution: guideIntent.resolved ? 'fallback_resolved' : 'fallback_tentative'
      }
    };
  }

  ruleHits.push('intent:ambiguous:insufficient_signal');

  return {
    task_type: null,
    task_confidence: 0.32,
    constraints: buildNullConstraints(text),
    clarification_reason: 'intent_ambiguous',
    _meta: {
      decision_source: 'fallback',
      prior_state_usage: 'none',
      fallback_reason: fallbackReason,
      missing_required_fields: [],
      rule_hits: ruleHits,
      conflict_codes: [],
      fallback_resolution: 'fallback_tentative'
    }
  };
}
