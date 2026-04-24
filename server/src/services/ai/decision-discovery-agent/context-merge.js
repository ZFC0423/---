import { createHash } from 'node:crypto';

import {
  CONTINUATION_FIELDS,
  DISCOVERY_CONTEXT_VERSION,
  OPTION_KEY_PATTERN,
  createDefaultContinuation,
  createWarning
} from './contracts.js';
import { DISCOVERY_VALIDATE_PRIVATE, normalizeOptionLimit } from './validate.js';

const { isPlainObject, normalizeStringArray, normalizeText } = DISCOVERY_VALIDATE_PRIVATE;

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = sortObjectKeys(value[key]);
      return accumulator;
    }, {});
}

export function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}

export function createContextFingerprint({ context_version, continuation }) {
  const payload = {
    context_version,
    continuation: sortObjectKeys(continuation)
  };

  return `sha256:${createHash('sha256').update(stableStringify(payload)).digest('hex')}`;
}

export function buildDecisionContext(continuation) {
  const normalizedContinuation = normalizeContinuation(continuation);
  const context = {
    context_version: DISCOVERY_CONTEXT_VERSION,
    fingerprint: '',
    continuation: normalizedContinuation
  };

  context.fingerprint = createContextFingerprint(context);
  return context;
}

function normalizeOptionKey(value) {
  const normalized = normalizeText(value);
  return OPTION_KEY_PATTERN.test(normalized) ? normalized : null;
}

function normalizeOptionKeys(value) {
  return normalizeStringArray(value)
    .map((item) => normalizeOptionKey(item))
    .filter(Boolean);
}

function normalizeTimeBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const days = Number(value.days);
  const dateText = normalizeText(value.date_text);

  return {
    days: Number.isInteger(days) && days > 0 ? days : null,
    date_text: dateText || null
  };
}

export function normalizeContinuation(value = {}) {
  const defaults = createDefaultContinuation();
  const source = isPlainObject(value) ? value : {};

  return {
    current_selection_key: normalizeOptionKey(source.current_selection_key),
    exclude_option_keys: normalizeOptionKeys(source.exclude_option_keys),
    theme_preferences: normalizeStringArray(source.theme_preferences),
    region_hints: normalizeStringArray(source.region_hints),
    travel_mode: ['public_transport', 'self_drive', 'mixed'].includes(normalizeText(source.travel_mode))
      ? normalizeText(source.travel_mode)
      : null,
    companions: normalizeStringArray(source.companions),
    hard_avoidances: normalizeStringArray(source.hard_avoidances),
    physical_constraints: normalizeStringArray(source.physical_constraints),
    time_budget: normalizeTimeBudget(source.time_budget),
    pace_preference: ['relaxed', 'normal', 'compact'].includes(normalizeText(source.pace_preference))
      ? normalizeText(source.pace_preference)
      : null,
    route_origin: normalizeText(source.route_origin) || null,
    destination_scope: normalizeStringArray(source.destination_scope),
    option_limit: normalizeOptionLimit(source.option_limit ?? defaults.option_limit)
  };
}

function readPreviousContinuation(decisionContext) {
  if (!isPlainObject(decisionContext) || !isPlainObject(decisionContext.continuation)) {
    return {
      continuation: null,
      fingerprintValid: false,
      used: false
    };
  }

  const continuation = normalizeContinuation(decisionContext.continuation);
  const candidateContext = {
    context_version: DISCOVERY_CONTEXT_VERSION,
    continuation
  };
  const expectedFingerprint = createContextFingerprint(candidateContext);

  return {
    continuation,
    fingerprintValid: normalizeText(decisionContext.fingerprint) === expectedFingerprint,
    used: true
  };
}

function extractPreviousPublicOptionKeys(previousPublicResult) {
  if (!isPlainObject(previousPublicResult)) {
    return [];
  }

  const rankedKeys = Array.isArray(previousPublicResult.ranked_options)
    ? previousPublicResult.ranked_options.map((option) => option?.option_key)
    : [];
  const targetKeys = Array.isArray(previousPublicResult.comparison?.targets)
    ? previousPublicResult.comparison.targets.map((target) => target?.option_key)
    : [];

  return normalizeOptionKeys([...rankedKeys, ...targetKeys]);
}

function applyConstraints(continuation, constraints) {
  return {
    ...continuation,
    theme_preferences: [...constraints.theme_preferences],
    region_hints: [...constraints.region_hints],
    travel_mode: constraints.travel_mode,
    companions: [...constraints.companions],
    hard_avoidances: [...constraints.hard_avoidances],
    physical_constraints: [...constraints.physical_constraints],
    time_budget: constraints.time_budget,
    pace_preference: constraints.pace_preference,
    route_origin: constraints.route_origin,
    destination_scope: [...constraints.destination_scope],
    option_limit: constraints.option_limit
  };
}

function applyAction(continuation, action) {
  if (!action) {
    return continuation;
  }

  const payload = action.payload || {};

  if (action.action_type === 'discovery.refine') {
    return {
      ...continuation,
      region_hints: payload.focused_region_key ? [payload.focused_region_key] : continuation.region_hints,
      option_limit: payload.option_limit ?? continuation.option_limit
    };
  }

  if (action.action_type === 'discovery.alternative') {
    return {
      ...continuation,
      current_selection_key: payload.current_selection_key || continuation.current_selection_key,
      option_limit: payload.option_limit ?? continuation.option_limit
    };
  }

  return continuation;
}

function getActionOptionKeys(action) {
  if (!action) {
    return [];
  }

  if (Array.isArray(action.payload?.option_keys)) {
    return normalizeOptionKeys(action.payload.option_keys);
  }

  return [];
}

function getActionCurrentSelectionKey(action) {
  if (action?.payload?.current_selection_key) {
    return normalizeOptionKey(action.payload.current_selection_key);
  }

  if (action?.payload?.option_key) {
    return normalizeOptionKey(action.payload.option_key);
  }

  return null;
}

export function mergeDiscoveryContext(normalizedPayload) {
  const warnings = [];
  const previous = readPreviousContinuation(normalizedPayload.decision_context);
  let continuation = createDefaultContinuation();

  if (previous.used && previous.fingerprintValid) {
    continuation = previous.continuation;
  } else if (previous.used) {
    warnings.push(createWarning({
      code: 'context_fingerprint_mismatch',
      scope: 'global',
      severity: 'warning'
    }));
  }

  const previousPublicOptionKeys = extractPreviousPublicOptionKeys(normalizedPayload.previous_public_result);
  continuation = applyConstraints(continuation, normalizedPayload.constraints);
  continuation = applyAction(continuation, normalizedPayload.action);
  continuation = normalizeContinuation(continuation);

  const actionOptionKeys = getActionOptionKeys(normalizedPayload.action);
  const actionCurrentSelectionKey = getActionCurrentSelectionKey(normalizedPayload.action);
  const seedTexts = [
    ...normalizedPayload.constraints.subject_entities,
    ...normalizedPayload.constraints.scenic_hints
  ];
  const executionExcludeOptionKeys = [
    ...continuation.exclude_option_keys,
    ...(normalizedPayload.task_type === 'suggest_alternatives' && continuation.current_selection_key
      ? [continuation.current_selection_key]
      : [])
  ];

  return {
    continuation,
    decisionContext: buildDecisionContext(continuation),
    warnings,
    previousPublicOptionKeys,
    actionOptionKeys,
    actionCurrentSelectionKey,
    seedTexts,
    targetTexts: seedTexts,
    executionExcludeOptionKeys: Array.from(new Set(executionExcludeOptionKeys)),
    continuationFields: CONTINUATION_FIELDS
  };
}
