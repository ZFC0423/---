import {
  ACTION_TYPES,
  AXIS_CODES,
  AXIS_FIELDS,
  AXIS_ITEM_FIELDS,
  AXIS_OUTCOMES,
  AXIS_VALUE_CODES,
  CAUTION_REASON_CODES,
  COMPARISON_FIELDS,
  COMPARISON_OUTCOMES,
  CONTINUATION_FIELDS,
  DECISION_CONTEXT_FIELDS,
  DEFAULT_OPTION_LIMIT,
  FIT_LEVELS,
  FIT_REASON_CODES,
  MAX_OPTION_LIMIT,
  MIN_OPTION_LIMIT,
  NEXT_ACTION_FIELDS,
  OPTION_KEY_PATTERN,
  PACE_PREFERENCES,
  PUBLIC_OUTPUT_FIELDS,
  RANKED_OPTION_FIELDS,
  RESULT_STATUSES,
  TARGET_FIELDS,
  TARGET_RESOLUTION_STATUSES,
  TASK_TYPES,
  TRAVEL_MODES,
  WARNING_CODES,
  WARNING_FIELDS,
  createDefaultContinuation
} from './contracts.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function uniqStrings(items) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));
}

function normalizeStringArray(value, { defaultValue = [] } = {}) {
  if (value === undefined || value === null) {
    return [...defaultValue];
  }

  if (Array.isArray(value)) {
    return uniqStrings(value);
  }

  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    return normalized ? [normalized] : [...defaultValue];
  }

  return [...defaultValue];
}

function normalizeNullableString(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeEnum(value, allowedValues) {
  const normalized = normalizeText(value);
  return allowedValues.includes(normalized) ? normalized : null;
}

export function normalizeOptionLimit(value) {
  const numeric = Number(value);

  if (!Number.isInteger(numeric)) {
    return DEFAULT_OPTION_LIMIT;
  }

  return Math.max(MIN_OPTION_LIMIT, Math.min(MAX_OPTION_LIMIT, numeric));
}

export function isOptionKey(value) {
  return OPTION_KEY_PATTERN.test(normalizeText(value));
}

export function parseOptionKey(value) {
  const match = normalizeText(value).match(OPTION_KEY_PATTERN);
  return match ? Number(match[1]) : null;
}

function normalizeOptionKey(value) {
  const normalized = normalizeText(value);
  return isOptionKey(normalized) ? normalized : null;
}

function normalizeOptionKeyArray(value) {
  return uniqStrings(Array.isArray(value) ? value : [])
    .map((item) => normalizeOptionKey(item))
    .filter(Boolean);
}

function normalizeTimeBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const days = Number(value.days);
  const dateText = normalizeNullableString(value.date_text);

  return {
    days: Number.isInteger(days) && days > 0 ? days : null,
    date_text: dateText
  };
}

function normalizeDestinationScope(value) {
  if (Array.isArray(value)) {
    return uniqStrings(value);
  }

  const normalized = normalizeText(value);
  return normalized ? [normalized] : [];
}

function normalizeConstraints(value = {}) {
  const source = isPlainObject(value) ? value : {};

  return {
    subject_entities: normalizeStringArray(source.subject_entities),
    scenic_hints: normalizeStringArray(source.scenic_hints),
    theme_preferences: normalizeStringArray(source.theme_preferences),
    region_hints: normalizeStringArray(source.region_hints),
    travel_mode: normalizeEnum(source.travel_mode, TRAVEL_MODES),
    companions: normalizeStringArray(source.companions),
    hard_avoidances: normalizeStringArray(source.hard_avoidances),
    physical_constraints: normalizeStringArray(source.physical_constraints),
    time_budget: normalizeTimeBudget(source.time_budget),
    pace_preference: normalizeEnum(source.pace_preference, PACE_PREFERENCES),
    route_origin: normalizeNullableString(source.route_origin),
    destination_scope: normalizeDestinationScope(source.destination_scope),
    option_limit: normalizeOptionLimit(source.option_limit)
  };
}

function normalizeActionPayload(actionType, payload) {
  const source = isPlainObject(payload) ? payload : {};

  if (actionType === 'knowledge.explain') {
    return {
      option_key: normalizeOptionKey(source.option_key)
    };
  }

  if (actionType === 'route_plan.generate') {
    return {
      option_keys: normalizeOptionKeyArray(source.option_keys)
    };
  }

  if (actionType === 'discovery.compare') {
    return {
      option_keys: normalizeOptionKeyArray(source.option_keys)
    };
  }

  if (actionType === 'discovery.refine') {
    return {
      option_keys: normalizeOptionKeyArray(source.option_keys),
      focused_region_key: normalizeNullableString(source.focused_region_key),
      option_limit: source.option_limit === undefined ? undefined : normalizeOptionLimit(source.option_limit)
    };
  }

  if (actionType === 'discovery.alternative') {
    return {
      current_selection_key: normalizeOptionKey(source.current_selection_key),
      option_limit: source.option_limit === undefined ? undefined : normalizeOptionLimit(source.option_limit)
    };
  }

  return {};
}

export function normalizeAction(action) {
  if (action === null || action === undefined) {
    return { ok: true, value: null };
  }

  if (!isPlainObject(action)) {
    return { ok: false, error_code: 'invalid_action_payload' };
  }

  const actionType = normalizeText(action.action_type || action.type);

  if (!ACTION_TYPES.includes(actionType)) {
    return { ok: false, error_code: 'invalid_action_payload' };
  }

  const payload = normalizeActionPayload(actionType, action.payload);

  if (actionType === 'knowledge.explain' && !payload.option_key) {
    return { ok: false, error_code: 'invalid_action_payload' };
  }

  if (actionType === 'discovery.alternative' && !payload.current_selection_key) {
    return { ok: false, error_code: 'invalid_action_payload' };
  }

  return {
    ok: true,
    value: {
      action_type: actionType,
      payload
    }
  };
}

export function normalizeDiscoveryPayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      error_code: 'invalid_action_payload',
      value: {
        task_type: 'discover_options',
        constraints: normalizeConstraints({}),
        previous_public_result: null,
        decision_context: null,
        action: null
      }
    };
  }

  const taskType = normalizeText(payload.task_type);
  const normalizedAction = normalizeAction(payload.action);

  const value = {
    task_type: TASK_TYPES.includes(taskType) ? taskType : 'discover_options',
    constraints: normalizeConstraints(payload.constraints),
    previous_public_result: isPlainObject(payload.previous_public_result) ? payload.previous_public_result : null,
    decision_context: isPlainObject(payload.decision_context) ? payload.decision_context : null,
    action: normalizedAction.ok ? normalizedAction.value : null
  };

  if (!TASK_TYPES.includes(taskType)) {
    return {
      ok: false,
      error_code: 'unsupported_task_type',
      value
    };
  }

  if (!normalizedAction.ok) {
    return {
      ok: false,
      error_code: normalizedAction.error_code,
      value
    };
  }

  return {
    ok: true,
    value
  };
}

function ensureStrictKeys(target, allowedKeys, field) {
  if (!isPlainObject(target)) {
    throw new Error(`${field} must be an object`);
  }

  const extraKeys = Object.keys(target).filter((key) => !allowedKeys.includes(key));
  if (extraKeys.length) {
    throw new Error(`${field} contains unsupported keys: ${extraKeys.join(', ')}`);
  }
}

function assertEnum(value, allowedValues, field) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${field} is invalid`);
  }
}

function assertStringArray(value, field, allowedValues = null) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be a string array`);
  }

  if (allowedValues) {
    const invalid = value.find((item) => !allowedValues.includes(item));
    if (invalid) {
      throw new Error(`${field} contains invalid value: ${invalid}`);
    }
  }
}

function assertWarningContract(warning, index) {
  ensureStrictKeys(warning, WARNING_FIELDS, `warnings[${index}]`);
  if (!WARNING_CODES.includes(warning.code)) {
    throw new Error(`warnings[${index}].code is invalid`);
  }
  assertEnum(warning.scope, ['global', 'option', 'field'], `warnings[${index}].scope`);
  assertEnum(warning.severity, ['info', 'warning'], `warnings[${index}].severity`);
}

function assertRankedOptionContract(option, index) {
  ensureStrictKeys(option, RANKED_OPTION_FIELDS, `ranked_options[${index}]`);
  if (!isOptionKey(option.option_key) || option.entity_type !== 'scenic') {
    throw new Error(`ranked_options[${index}] identity is invalid`);
  }
  if (!Number.isInteger(option.entity_id) || !Number.isInteger(option.rank)) {
    throw new Error(`ranked_options[${index}] numeric fields are invalid`);
  }
  if (!Number.isInteger(option.fit_score) || option.fit_score < 0 || option.fit_score > 100) {
    throw new Error(`ranked_options[${index}].fit_score is invalid`);
  }
  assertEnum(option.fit_level, FIT_LEVELS, `ranked_options[${index}].fit_level`);
  assertStringArray(option.fit_reasons, `ranked_options[${index}].fit_reasons`, FIT_REASON_CODES);
  assertStringArray(option.caution_reasons, `ranked_options[${index}].caution_reasons`, CAUTION_REASON_CODES);
  if (!Array.isArray(option.evidence_refs)) {
    throw new Error(`ranked_options[${index}].evidence_refs must be an array`);
  }
}

function assertComparisonContract(comparison) {
  if (comparison === null) {
    return;
  }

  ensureStrictKeys(comparison, COMPARISON_FIELDS, 'comparison');
  assertEnum(comparison.outcome, COMPARISON_OUTCOMES, 'comparison.outcome');

  if (!Array.isArray(comparison.targets) || !Array.isArray(comparison.axes)) {
    throw new Error('comparison targets and axes must be arrays');
  }

  comparison.targets.forEach((target, index) => {
    ensureStrictKeys(target, TARGET_FIELDS, `comparison.targets[${index}]`);
    assertEnum(target.resolution_status, TARGET_RESOLUTION_STATUSES, `comparison.targets[${index}].resolution_status`);
  });

  comparison.axes.forEach((axis, index) => {
    ensureStrictKeys(axis, AXIS_FIELDS, `comparison.axes[${index}]`);
    assertEnum(axis.axis_code, AXIS_CODES, `comparison.axes[${index}].axis_code`);
    assertEnum(axis.outcome, AXIS_OUTCOMES, `comparison.axes[${index}].outcome`);
    if (typeof axis.is_decisive !== 'boolean' || !Array.isArray(axis.items)) {
      throw new Error(`comparison.axes[${index}] is invalid`);
    }
    axis.items.forEach((item, itemIndex) => {
      ensureStrictKeys(item, AXIS_ITEM_FIELDS, `comparison.axes[${index}].items[${itemIndex}]`);
      assertEnum(item.value_code, AXIS_VALUE_CODES, `comparison.axes[${index}].items[${itemIndex}].value_code`);
      assertStringArray(item.signal_codes, `comparison.axes[${index}].items[${itemIndex}].signal_codes`);
    });
  });
}

function assertDecisionContextContract(decisionContext) {
  ensureStrictKeys(decisionContext, DECISION_CONTEXT_FIELDS, 'decision_context');
  if (decisionContext.context_version !== 1 || typeof decisionContext.fingerprint !== 'string') {
    throw new Error('decision_context identity is invalid');
  }
  ensureStrictKeys(decisionContext.continuation, CONTINUATION_FIELDS, 'decision_context.continuation');
}

function assertNextActionContract(action, index) {
  ensureStrictKeys(action, NEXT_ACTION_FIELDS, `next_actions[${index}]`);
  assertEnum(action.action_type, ACTION_TYPES, `next_actions[${index}].action_type`);
  if (!isPlainObject(action.payload)) {
    throw new Error(`next_actions[${index}].payload must be an object`);
  }
}

export function assertDiscoveryContract(output) {
  ensureStrictKeys(output, PUBLIC_OUTPUT_FIELDS, 'discovery output');
  assertEnum(output.task_type, TASK_TYPES, 'task_type');
  assertEnum(output.result_status, RESULT_STATUSES, 'result_status');

  if (!Array.isArray(output.ranked_options) || !Array.isArray(output.next_actions) || !Array.isArray(output.warnings)) {
    throw new Error('top-level arrays are invalid');
  }

  output.ranked_options.forEach(assertRankedOptionContract);
  output.next_actions.forEach(assertNextActionContract);
  output.warnings.forEach(assertWarningContract);
  assertComparisonContract(output.comparison);
  assertDecisionContextContract(output.decision_context);

  if (output.comparison?.outcome === 'missing_target') {
    if (output.result_status !== 'limited' || output.ranked_options.length || output.comparison.axes.length) {
      throw new Error('missing_target comparison must use limited status, empty ranked_options and empty axes');
    }
    const invalidAction = output.next_actions.find((action) => action.action_type !== 'discovery.refine');
    if (invalidAction) {
      throw new Error('missing_target next_actions must only contain discovery.refine');
    }
  }
}

export const DISCOVERY_VALIDATE_PRIVATE = {
  isPlainObject,
  normalizeConstraints,
  normalizeStringArray,
  normalizeText,
  normalizeOptionKey,
  normalizeOptionKeyArray,
  normalizeTimeBudget,
  createDefaultContinuation
};
