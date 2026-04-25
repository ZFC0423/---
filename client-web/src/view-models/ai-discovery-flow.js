const OPTION_KEY_PATTERN = /^scenic:\d+$/;

const ROUTE_CONSTRAINT_ALLOWLIST = [
  'time_budget',
  'travel_mode',
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'pace_preference',
  'route_origin',
  'destination_scope',
  'theme_preferences'
];

const LIST_FIELDS = [
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'theme_preferences'
];

const FALLBACK_ROUTE_CONSTRAINTS = {
  time_budget: { days: 1 },
  travel_mode: 'public_transport',
  companions: [],
  hard_avoidances: [],
  physical_constraints: [],
  pace_preference: 'normal',
  route_origin: null,
  destination_scope: null,
  theme_preferences: []
};

export const discoveryStatusLabels = {
  ready: '已形成可选择结果',
  limited: '结果有限，需要确认',
  empty: '暂无合适候选',
  invalid: '暂无法处理'
};

export const routeWarningSuggestions = {
  locked_target_not_found: '回到发现结果重新选择景点，当前锁定项没有找到可用记录。',
  locked_target_unavailable: '减少或替换不可展示景点后再生成路线。',
  locked_targets_exceed_time_budget: '增加游玩天数，或减少本次锁定景点。',
  locked_targets_exceed_day_capacity: '增加游玩天数，或减少本次锁定景点。',
  locked_targets_conflict_with_pace: '放宽节奏偏好，或减少需要强制保留的景点。',
  locked_targets_conflict_with_physical_constraints: '调整体力约束，或改选步行强度更低的景点。',
  locked_targets_region_span_conflict: '减少跨区域锁定，或回到 Discovery 重新选择同一区域景点。',
  locked_targets_cross_region_unsupported: '减少跨区域锁定，或增加出行天数后再生成。'
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

export function buildTraceableUserQuery(userQuery) {
  const originalQuery = normalizeText(userQuery);
  const traceableQuery = originalQuery
    ? `基于 Discovery 选择生成路线：${originalQuery}`
    : '基于 Discovery 选择生成路线';

  return traceableQuery.slice(0, 500);
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean)));
  }

  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    return normalized ? [normalized] : [];
  }

  return [];
}

function normalizeTimeBudget(value) {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const days = Number(value.days);

  if (!Number.isInteger(days) || days < 1) {
    return undefined;
  }

  return { days };
}

function normalizeDestinationScope(value) {
  if (Array.isArray(value)) {
    return normalizeStringList(value)[0] || null;
  }

  const normalized = normalizeText(value);
  return normalized || null;
}

function getFirstObject(...values) {
  return values.find((value) => isPlainObject(value)) || {};
}

function assignAllowedConstraints(target, source) {
  if (!isPlainObject(source)) {
    return target;
  }

  ROUTE_CONSTRAINT_ALLOWLIST.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(source, field) || source[field] === undefined) {
      return;
    }

    if (field === 'time_budget') {
      const normalized = normalizeTimeBudget(source[field]);
      if (normalized) {
        target.time_budget = normalized;
      }
      return;
    }

    if (field === 'destination_scope') {
      target.destination_scope = normalizeDestinationScope(source[field]);
      return;
    }

    if (LIST_FIELDS.includes(field)) {
      target[field] = normalizeStringList(source[field]);
      return;
    }

    if (field === 'route_origin') {
      target.route_origin = normalizeText(source[field]) || null;
      return;
    }

    if (field === 'travel_mode' || field === 'pace_preference') {
      const normalized = normalizeText(source[field]);
      if (normalized) {
        target[field] = normalized;
      }
    }
  });

  return target;
}

function fillMissingFallbacks(constraints) {
  const next = { ...constraints };

  Object.entries(FALLBACK_ROUTE_CONSTRAINTS).forEach(([key, value]) => {
    if (next[key] === undefined || next[key] === null || (Array.isArray(next[key]) && !next[key].length)) {
      next[key] = Array.isArray(value)
        ? [...value]
        : isPlainObject(value)
          ? { ...value }
          : value;
    }
  });

  return next;
}

export function unwrapFrontResponse(response) {
  if (!isPlainObject(response)) {
    throw new Error('系统返回格式异常，请稍后重试。');
  }

  if (response.code !== 200) {
    throw new Error(response.message || '系统暂时无法完成请求，请稍后重试。');
  }

  return response.data;
}

export function sanitizePriorState(data) {
  if (!isPlainObject(data)) {
    return null;
  }

  return {
    task_type: data.task_type ?? null,
    task_confidence: Number(data.task_confidence) || 0,
    constraints: isPlainObject(data.constraints) ? { ...data.constraints } : {}
  };
}

export function isSafeClarifyResult(data) {
  return Boolean(data?.clarification_needed) || data?.next_agent === 'safe_clarify';
}

export function normalizeOptionKeys(optionKeys) {
  if (!Array.isArray(optionKeys)) {
    return {
      ok: false,
      value: [],
      message: '路线生成需要后端提供可锁定的景点选项。'
    };
  }

  const seen = new Set();
  const value = [];

  for (const item of optionKeys) {
    const normalized = normalizeText(item);

    if (!OPTION_KEY_PATTERN.test(normalized)) {
      return {
        ok: false,
        value: [],
        message: '路线生成选项格式无效，请重新发起发现。'
      };
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      value.push(normalized);
    }
  }

  if (!value.length) {
    return {
      ok: false,
      value: [],
      message: '请先选择至少一个可生成路线的景点。'
    };
  }

  return { ok: true, value, message: '' };
}

export function getRoutePlanGenerateAction(discoveryResult) {
  if (!isPlainObject(discoveryResult) || isSafeClarifyResult(discoveryResult)) {
    return null;
  }

  if (['empty', 'invalid'].includes(discoveryResult.result_status)) {
    return null;
  }

  if (discoveryResult.comparison?.outcome === 'missing_target') {
    return null;
  }

  const action = Array.isArray(discoveryResult.next_actions)
    ? discoveryResult.next_actions.find((item) => item?.action_type === 'route_plan.generate')
    : null;

  if (!action) {
    return null;
  }

  const normalized = normalizeOptionKeys(action.payload?.option_keys);

  if (!normalized.ok) {
    return null;
  }

  return {
    action_type: 'route_plan.generate',
    payload: {
      option_keys: normalized.value
    }
  };
}

export function buildRoutePlanPayloadFromDiscoveryAction({
  action,
  discoveryResult,
  userQuery = '',
  localConstraints = null
} = {}) {
  const normalizedKeys = normalizeOptionKeys(action?.payload?.option_keys);

  if (!normalizedKeys.ok) {
    return normalizedKeys;
  }

  const routerConstraints = getFirstObject(
    discoveryResult?.router_constraints,
    discoveryResult?.routerResult?.constraints,
    discoveryResult?.router_result?.constraints
  );
  const continuation = isPlainObject(discoveryResult?.decision_context?.continuation)
    ? discoveryResult.decision_context.continuation
    : {};
  const dynamicConstraints = fillMissingFallbacks(
    assignAllowedConstraints(
      assignAllowedConstraints(
        assignAllowedConstraints({}, routerConstraints),
        continuation
      ),
      localConstraints
    )
  );
  return {
    ok: true,
    value: {
      routerResult: {
        task_type: 'plan_route',
        next_agent: 'ai_trip',
        clarification_needed: false,
        clarification_reason: null,
        missing_required_fields: [],
        clarification_questions: [],
        constraints: {
          ...dynamicConstraints,
          user_query: buildTraceableUserQuery(userQuery),
          locked_targets: normalizedKeys.value
        }
      }
    },
    message: ''
  };
}
