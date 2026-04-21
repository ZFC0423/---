import {
  INTENT_CONTRACT,
  createEmptyGuideConstraints,
  createEmptyNullTaskConstraints,
  createEmptyRouteConstraints
} from './contracts.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clampConfidence(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric));
}

function uniqStrings(items) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
}

function normalizeOptionalString(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeTimeBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const days = Number(value.days);
  const dateText = normalizeOptionalString(value.date_text);
  const normalized = {
    days: Number.isInteger(days) && days > 0 ? days : null,
    date_text: dateText
  };

  if (normalized.days === null && normalized.date_text === null) {
    return null;
  }

  return normalized;
}

function normalizeMoneyBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const level = normalizeOptionalString(value.level);
  const amountText = normalizeOptionalString(value.amount_text);
  const normalized = {
    level: INTENT_CONTRACT.ENUMS.money_budget_level.includes(level) ? level : null,
    amount_text: amountText
  };

  if (normalized.level === null && normalized.amount_text === null) {
    return null;
  }

  return normalized;
}

function normalizeStatusFlags(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const alreadyHasPlan = typeof value.already_has_plan === 'boolean'
    ? value.already_has_plan
    : null;

  return alreadyHasPlan === null ? null : { already_has_plan: alreadyHasPlan };
}

function normalizeConstraintValue(key, value) {
  switch (key) {
    case 'time_budget':
      return normalizeTimeBudget(value);
    case 'money_budget':
      return normalizeMoneyBudget(value);
    case 'travel_mode': {
      const normalized = normalizeOptionalString(value);
      return INTENT_CONTRACT.ENUMS.travel_mode.includes(normalized) ? normalized : null;
    }
    case 'pace_preference': {
      const normalized = normalizeOptionalString(value);
      return INTENT_CONTRACT.ENUMS.pace_preference.includes(normalized) ? normalized : null;
    }
    case 'companions':
    case 'theme_preferences':
    case 'hard_avoidances':
    case 'physical_constraints':
    case 'subject_entities':
    case 'region_hints':
    case 'scenic_hints':
      return uniqStrings(value) || null;
    case 'route_origin':
    case 'destination_scope':
      return normalizeOptionalString(value);
    case 'status_flags':
      return normalizeStatusFlags(value);
    case 'user_query':
      return normalizeText(value);
    default:
      return null;
  }
}

function getConstraintTemplate(taskType, userQuery) {
  if (taskType === 'guide_understand') {
    return createEmptyGuideConstraints(userQuery);
  }

  if (taskType === 'plan_route') {
    return createEmptyRouteConstraints(userQuery);
  }

  return createEmptyNullTaskConstraints(userQuery);
}

function fillTemplate(taskType, rawConstraints, userQuery = '') {
  const template = getConstraintTemplate(taskType, userQuery);

  Object.keys(template).forEach((key) => {
    if (key === 'user_query') {
      template[key] = normalizeText(userQuery || rawConstraints?.user_query || '');
      return;
    }

    template[key] = normalizeConstraintValue(key, rawConstraints?.[key]);
  });

  return template;
}

export function normalizePriorState(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const rawTaskType = value.task_type === null ? null : normalizeOptionalString(value.task_type);
  const taskType = INTENT_CONTRACT.PR1_RUNTIME_TASK_TYPES.includes(rawTaskType) ? rawTaskType : null;
  const taskConfidence = clampConfidence(value.task_confidence);
  const constraints = fillTemplate(taskType, isPlainObject(value.constraints) ? value.constraints : {}, '');

  return {
    task_type: taskType,
    task_confidence: taskConfidence,
    constraints
  };
}

export function preprocessInput(payload = {}) {
  const normalizedInput = normalizeText(payload.input);

  if (!normalizedInput) {
    const error = new Error('input is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    normalizedInput,
    priorState: normalizePriorState(payload.priorState)
  };
}

function canUsePriorConstraints(result, priorState) {
  if (!priorState || !result?.task_type) {
    return false;
  }

  return result._meta?.decision_source === 'llm' && Number(result.task_confidence || 0) >= 0.75;
}

function copyMissingValues(currentValue, priorValue) {
  if (currentValue === null || currentValue === undefined || currentValue === '') {
    return priorValue ?? currentValue ?? null;
  }

  if (Array.isArray(currentValue)) {
    return currentValue;
  }

  if (isPlainObject(currentValue)) {
    if (!isPlainObject(priorValue)) {
      return currentValue;
    }

    const next = { ...currentValue };
    const keys = Array.from(new Set([...Object.keys(currentValue), ...Object.keys(priorValue)]));

    keys.forEach((key) => {
      next[key] = copyMissingValues(next[key], priorValue[key]);
    });

    return next;
  }

  return currentValue;
}

export function mergeWithPriorState(result, priorState) {
  if (!priorState) {
    return result;
  }

  const currentTaskType = result.task_type;
  const priorTaskType = priorState.task_type;
  const canUsePrior = canUsePriorConstraints(result, priorState);
  const nextMeta = {
    ...result._meta,
    prior_state_usage: 'hint_only',
    rule_hits: Array.isArray(result._meta?.rule_hits) ? [...result._meta.rule_hits] : []
  };

  if (!currentTaskType || !canUsePrior) {
    if (priorTaskType) {
      nextMeta.rule_hits.push('prior_state_hint_only');
    }

    return {
      ...result,
      _meta: nextMeta
    };
  }

  if (priorTaskType && currentTaskType !== priorTaskType) {
    nextMeta.rule_hits.push('prior_state_dropped_cross_intent');

    return {
      ...result,
      _meta: nextMeta
    };
  }

  if (priorTaskType !== currentTaskType) {
    return {
      ...result,
      _meta: nextMeta
    };
  }

  nextMeta.rule_hits.push('prior_state_constraints_merged');
  nextMeta.prior_state_usage = 'merged';

  return {
    ...result,
    constraints: copyMissingValues(result.constraints, priorState.constraints),
    _meta: nextMeta
  };
}
