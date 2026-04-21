import test from 'node:test';
import assert from 'node:assert/strict';

import { INTENT_CONTRACT } from '../src/services/ai/intent-router/contracts.js';
import { createIntentRouter } from '../src/services/ai/intent-router/index.js';

function createTimeoutError() {
  const error = new Error('timeout');
  error.code = 'timeout';
  return error;
}

test('top-level normalization snapshot: plan_route missing-value encoding is stable', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        user_query: '周末两天，公共交通，节奏适中',
        time_budget: { days: 2, date_text: '周末' },
        travel_mode: 'public_transport',
        pace_preference: 'normal'
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '周末两天，公共交通，节奏适中',
    priorState: null
  });

  assert.deepStrictEqual(result, {
    task_type: 'plan_route',
    task_confidence: 0.91,
    constraints: {
      user_query: '周末两天，公共交通，节奏适中',
      time_budget: { days: 2, date_text: '周末' },
      money_budget: null,
      travel_mode: 'public_transport',
      companions: null,
      pace_preference: 'normal',
      theme_preferences: null,
      hard_avoidances: null,
      physical_constraints: null,
      status_flags: null,
      route_origin: null,
      destination_scope: null
    },
    clarification_needed: false,
    clarification_reason: null,
    missing_required_fields: [],
    clarification_questions: [],
    next_agent: 'ai_trip',
    _meta: {
      decision_source: 'llm',
      prior_state_usage: 'none',
      fallback_reason: null,
      missing_required_fields: [],
      rule_hits: ['llm_result_received'],
      conflict_codes: [],
      fallback_resolution: null,
      model_name: null,
      token_usage: 0
    }
  });
});

test('top-level normalization snapshot: null task keeps all protocol fields and unknowns as null', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: null,
      task_confidence: 0.23,
      constraints: {
        user_query: '推荐一个吧'
      },
      clarification_reason: 'intent_ambiguous'
    })
  });

  const result = await routeIntent({
    input: '推荐一个吧',
    priorState: null
  });

  assert.deepStrictEqual(result, {
    task_type: null,
    task_confidence: 0.23,
    constraints: {
      user_query: '推荐一个吧',
      time_budget: null,
      money_budget: null,
      travel_mode: null,
      companions: null,
      pace_preference: null,
      theme_preferences: null,
      hard_avoidances: null,
      physical_constraints: null,
      status_flags: null,
      route_origin: null,
      destination_scope: null,
      subject_entities: null,
      region_hints: null,
      scenic_hints: null
    },
    clarification_needed: true,
    clarification_reason: 'intent_ambiguous',
    missing_required_fields: [],
    clarification_questions: [
      '你这一步更想先听讲解，还是直接让我帮你排路线？',
      '如果你想做路线，我会继续按几天、交通方式和节奏把信息补齐。'
    ],
    next_agent: 'safe_clarify',
    _meta: {
      decision_source: 'llm',
      prior_state_usage: 'none',
      fallback_reason: null,
      missing_required_fields: [],
      rule_hits: ['llm_result_received'],
      conflict_codes: [],
      fallback_resolution: null,
      model_name: null,
      token_usage: 0
    }
  });
});

test('array runtime semantics: null means unknown_or_not_provided', async () => {
  assert.equal(
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.array_runtime_semantics.null,
    'unknown_or_not_provided'
  );

  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.9,
      constraints: {
        user_query: '周末两天，公共交通，节奏适中',
        time_budget: { days: 2, date_text: '周末' },
        travel_mode: 'public_transport',
        pace_preference: 'normal',
        theme_preferences: null
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '周末两天，公共交通，节奏适中',
    priorState: null
  });

  assert.strictEqual(
    result.constraints.theme_preferences,
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.list_unknown
  );
});

test('array runtime semantics: [] means explicit_empty and must not be overwritten by prior merge', async () => {
  assert.deepStrictEqual(
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.list_explicit_empty,
    []
  );
  assert.equal(
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.array_runtime_semantics.empty_array,
    'explicit_empty'
  );

  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.94,
      constraints: {
        user_query: '还是两天，公共交通，节奏适中，这次主题都可以',
        time_budget: { days: 2, date_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'normal',
        theme_preferences: []
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '还是两天，公共交通，节奏适中，这次主题都可以',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        theme_preferences: ['food', 'heritage']
      }
    }
  });

  assert.deepStrictEqual(
    result.constraints.theme_preferences,
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.list_explicit_empty
  );
});

test('trace meta keeps decision source and prior state usage orthogonal for llm merge', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.92,
      constraints: {
        user_query: '还是两天，节奏适中',
        time_budget: { days: 2, date_text: null },
        pace_preference: 'normal'
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '还是两天，节奏适中',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.88,
      constraints: {
        travel_mode: 'self_drive',
        theme_preferences: ['natural']
      }
    }
  });

  assert.equal(result._meta.decision_source, 'llm');
  assert.equal(result._meta.prior_state_usage, 'merged');
  assert.ok(result._meta.rule_hits.includes('prior_state_constraints_merged'));
  assert.equal(result.constraints.travel_mode, 'self_drive');
  assert.deepStrictEqual(result.constraints.theme_preferences, ['natural']);
});

test('trace meta keeps decision source and prior state usage orthogonal for fallback hint-only path', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => {
      throw createTimeoutError();
    }
  });

  const result = await routeIntent({
    input: '推荐一个吧',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        travel_mode: 'self_drive',
        time_budget: { days: 2, date_text: null }
      }
    }
  });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.equal(result._meta.prior_state_usage, 'hint_only');
  assert.ok(result._meta.rule_hits.includes('prior_state_hint_only'));
  assert.equal(result.constraints.travel_mode, null);
  assert.equal(result.constraints.time_budget, null);
});

test('fallback reason is timeout when llm extract throws timeout', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => {
      throw createTimeoutError();
    }
  });

  const result = await routeIntent({
    input: '周末两天，自驾，节奏适中',
    priorState: null
  });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.equal(result._meta.fallback_reason, 'timeout');
});

test('fallback reason is invalid_json when llm extract throws invalid_json', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => {
      const error = new Error('invalid json');
      error.code = 'invalid_json';
      throw error;
    }
  });

  const result = await routeIntent({
    input: '介绍一下赣州为什么适合先从老城看起',
    priorState: null
  });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.equal(result._meta.fallback_reason, 'invalid_json');
});
