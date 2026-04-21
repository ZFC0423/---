import {
  INTENT_CONTRACT,
  createEmptyGuideConstraints,
  createEmptyNullTaskConstraints,
  createEmptyRouteConstraints
} from './contracts.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqStrings(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const sourceItems = Array.isArray(value) ? value : typeof value === 'string' ? [value] : null;

  if (!sourceItems) {
    return null;
  }

  const normalized = Array.from(new Set(sourceItems.map((item) => normalizeText(item)).filter(Boolean)));

  if (!normalized.length) {
    return Array.isArray(value) ? [] : null;
  }

  return normalized;
}

function clampConfidence(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric));
}

function createSchemaViolation(message, code = 'schema_violation') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeEnum(value, enumValues) {
  const normalized = normalizeText(value);
  return enumValues.includes(normalized) ? normalized : null;
}

function normalizeFieldByRule(rule, value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (rule.type === 'string') {
    const normalized = normalizeText(value);
    return normalized || null;
  }

  if (rule.type === 'integer') {
    const numeric = Number(value);
    return Number.isInteger(numeric) ? numeric : null;
  }

  if (rule.type === 'boolean') {
    return typeof value === 'boolean' ? value : null;
  }

  if (rule.type === 'string_array') {
    return uniqStrings(value);
  }

  if (rule.type === 'enum') {
    return normalizeEnum(value, rule.values || []);
  }

  if (rule.type === 'object') {
    if (!isPlainObject(value)) {
      return null;
    }

    const normalized = {};

    Object.keys(rule.shape || {}).forEach((key) => {
      normalized[key] = normalizeFieldByRule(rule.shape[key], value[key]);
    });

    const hasAnyValue = Object.values(normalized).some((item) => item !== null);
    return hasAnyValue ? normalized : null;
  }

  return null;
}

function getEmptyConstraints(taskType, userQuery) {
  if (taskType === 'guide_understand') {
    return createEmptyGuideConstraints(userQuery);
  }

  if (taskType === 'plan_route') {
    return createEmptyRouteConstraints(userQuery);
  }

  return createEmptyNullTaskConstraints(userQuery);
}

function getConstraintRules(taskType) {
  if (taskType === null) {
    return INTENT_CONTRACT.NULL_TASKTYPE_CONSTRAINT_RULES;
  }

  return INTENT_CONTRACT.CONSTRAINT_FIELD_RULES[taskType];
}

function getAllowedFields(taskType) {
  if (taskType === null) {
    return INTENT_CONTRACT.NULL_TASKTYPE_CONSTRAINT_ALLOWLIST;
  }

  return INTENT_CONTRACT.ALLOWED_CONSTRAINT_FIELDS_BY_TASK_TYPE[taskType];
}

function hasStructuredValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return true;
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => hasStructuredValue(item));
  }

  return true;
}

function validateRequiredTopLevelFields(output) {
  if (INTENT_CONTRACT.MISSING_VALUE_ENCODING.omit_fields !== false) {
    return;
  }

  const missingFields = INTENT_CONTRACT.TOP_LEVEL_FIELDS.filter((field) => !Object.prototype.hasOwnProperty.call(output, field));

  if (missingFields.length) {
    throw createSchemaViolation(`missing top-level fields: ${missingFields.join(', ')}`);
  }
}

function validateTopLevelNullability(output) {
  Object.entries(INTENT_CONTRACT.NULLABLE_RULES).forEach(([field, nullable]) => {
    if (!Object.prototype.hasOwnProperty.call(output, field)) {
      return;
    }

    if (output[field] === undefined) {
      throw createSchemaViolation(`top-level field must not be undefined: ${field}`);
    }

    if (output[field] === null && nullable === false) {
      throw createSchemaViolation(`top-level field must not be null: ${field}`);
    }
  });
}

export function validateTopLevel(output, options = {}) {
  if (!isPlainObject(output)) {
    throw createSchemaViolation('intent router result must be an object');
  }

  const { allowPartial = false } = options;
  const extraFields = Object.keys(output).filter((key) => !INTENT_CONTRACT.TOP_LEVEL_FIELDS.includes(key) && key !== '_meta');

  if (extraFields.length) {
    throw createSchemaViolation(`unsupported top-level fields: ${extraFields.join(', ')}`);
  }

  if (!allowPartial) {
    validateRequiredTopLevelFields(output);
    validateTopLevelNullability(output);
  }
}

export function validateTaskType(taskType) {
  if (taskType === null || taskType === undefined || taskType === '') {
    return null;
  }

  const normalized = normalizeText(taskType);

  if (!INTENT_CONTRACT.TASK_TYPES.includes(normalized)) {
    throw createSchemaViolation(`unsupported task_type: ${normalized}`);
  }

  if (!INTENT_CONTRACT.PR1_RUNTIME_TASK_TYPES.includes(normalized)) {
    return null;
  }

  return normalized;
}

export function validateConstraintsByTaskType(taskType, constraints, userQuery) {
  const rawConstraints = isPlainObject(constraints) ? constraints : {};
  const allowedFields = getAllowedFields(taskType);
  const extraFields = Object.keys(rawConstraints).filter((key) => !allowedFields.includes(key));

  if (extraFields.length) {
    throw createSchemaViolation(`unsupported constraint fields: ${extraFields.join(', ')}`);
  }

  const rules = getConstraintRules(taskType);
  const normalized = getEmptyConstraints(taskType, userQuery);

  Object.keys(normalized).forEach((key) => {
    if (key === 'user_query') {
      normalized[key] = normalizeText(userQuery || rawConstraints.user_query || '');
      return;
    }

    const rule = rules[key];
    normalized[key] = normalizeFieldByRule(rule, rawConstraints[key]);
  });

  return normalized;
}

export function normalizeMissingValues(taskType, constraints, userQuery) {
  return validateConstraintsByTaskType(taskType, constraints, userQuery);
}

export function deriveMissingRequiredFields(taskType, constraints) {
  if (taskType !== 'plan_route') {
    return [];
  }

  return INTENT_CONTRACT.REQUIRED_FIELDS_BY_TASK_TYPE.plan_route.filter((key) => !hasStructuredValue(constraints[key]));
}

function buildClarificationQuestions(reason, missingRequiredFields, meta = {}) {
  if (reason === 'intent_ambiguous') {
    return INTENT_CONTRACT.INTENT_DISAMBIGUATION_QUESTIONS.slice(0, 2);
  }

  if (reason === 'constraint_conflict') {
    const conflictCodes = Array.isArray(meta.conflict_codes) ? meta.conflict_codes : [];
    const questions = conflictCodes.map((code) => INTENT_CONTRACT.CONFLICT_QUESTION_TEMPLATES[code]).filter(Boolean);

    if (!questions.length) {
      questions.push(INTENT_CONTRACT.CONFLICT_QUESTION_TEMPLATES.generic);
    }

    return questions.slice(0, 2);
  }

  if (reason === 'missing_slots') {
    return INTENT_CONTRACT.CLARIFY_FIELD_PRIORITY
      .filter((field) => missingRequiredFields.includes(field))
      .map((field) => INTENT_CONTRACT.CLARIFY_FIELD_TEMPLATES[field])
      .filter(Boolean)
      .slice(0, 3);
  }

  return [];
}

export function validateClarificationConsistency(output) {
  const next = { ...output };
  const missingRequiredFields = Array.isArray(next.missing_required_fields)
    ? Array.from(new Set(next.missing_required_fields.map((item) => normalizeText(item)).filter(Boolean)))
    : [];
  const meta = isPlainObject(next._meta) ? next._meta : {};

  next.missing_required_fields = missingRequiredFields;

  if (next.task_type === 'guide_understand') {
    next.clarification_needed = false;
    next.clarification_reason = null;
    next.missing_required_fields = [];
    next.clarification_questions = [];
    next.next_agent = 'ai_chat';
    return next;
  }

  if (next.task_type === 'plan_route') {
    if (next.clarification_reason === 'constraint_conflict') {
      next.clarification_needed = true;
      next.next_agent = 'safe_clarify';
      next.clarification_questions = buildClarificationQuestions('constraint_conflict', missingRequiredFields, meta);
      return next;
    }

    if (missingRequiredFields.length) {
      next.clarification_needed = true;
      next.clarification_reason = 'missing_slots';
      next.next_agent = 'safe_clarify';
      next.clarification_questions = buildClarificationQuestions('missing_slots', missingRequiredFields, meta);
      return next;
    }

    next.clarification_needed = false;
    next.clarification_reason = null;
    next.clarification_questions = [];
    next.next_agent = 'ai_trip';
    return next;
  }

  next.task_type = null;
  next.clarification_needed = true;
  next.clarification_reason = next.clarification_reason === 'constraint_conflict'
    ? 'constraint_conflict'
    : 'intent_ambiguous';
  next.next_agent = 'safe_clarify';
  next.clarification_questions = buildClarificationQuestions(next.clarification_reason, missingRequiredFields, meta);
  return next;
}

export function validateAndNormalizeIntentResult(rawResult, options = {}) {
  validateTopLevel(rawResult, { allowPartial: true });

  const rawTaskType = normalizeText(rawResult.task_type);
  const taskType = validateTaskType(rawResult.task_type);
  const taskConfidence = clampConfidence(rawResult.task_confidence);
  const userQuery = normalizeText(options.userQuery || rawResult?.constraints?.user_query || '');
  const constraints = normalizeMissingValues(taskType, rawResult.constraints, userQuery);
  const missingRequiredFields = deriveMissingRequiredFields(taskType, constraints);
  const normalized = {
    task_type: taskType,
    task_confidence: taskConfidence,
    constraints,
    clarification_needed: Boolean(rawResult.clarification_needed),
    clarification_reason: normalizeEnum(rawResult.clarification_reason, INTENT_CONTRACT.CLARIFICATION_REASONS),
    missing_required_fields: missingRequiredFields,
    clarification_questions: [],
    next_agent: normalizeEnum(rawResult.next_agent, INTENT_CONTRACT.NEXT_AGENTS) || 'safe_clarify',
    _meta: {
      decision_source: rawResult?._meta?.decision_source || 'fallback',
      prior_state_usage: rawResult?._meta?.prior_state_usage || 'none',
      fallback_reason: rawResult?._meta?.fallback_reason || null,
      missing_required_fields: [],
      rule_hits: Array.isArray(rawResult?._meta?.rule_hits) ? rawResult._meta.rule_hits : [],
      conflict_codes: Array.isArray(rawResult?._meta?.conflict_codes) ? rawResult._meta.conflict_codes : [],
      fallback_resolution: rawResult?._meta?.fallback_resolution || null,
      model_name: rawResult?._meta?.model_name || null,
      token_usage: rawResult?._meta?.token_usage || 0
    }
  };

  if (rawTaskType && INTENT_CONTRACT.TASK_TYPES.includes(rawTaskType) && !INTENT_CONTRACT.PR1_RUNTIME_TASK_TYPES.includes(rawTaskType)) {
    normalized._meta.rule_hits = [...normalized._meta.rule_hits, `reserved_task_type:${rawTaskType}`];
    normalized.clarification_reason = 'intent_ambiguous';
  }

  const clarified = validateClarificationConsistency(normalized);
  validateTopLevel(clarified);
  clarified._meta = {
    ...clarified._meta,
    missing_required_fields: clarified.missing_required_fields
  };

  return clarified;
}
