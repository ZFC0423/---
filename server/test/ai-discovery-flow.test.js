import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRoutePlanPayloadFromDiscoveryAction,
  buildTraceableUserQuery,
  normalizeOptionKeys
} from '../../client-web/src/view-models/ai-discovery-flow.js';

test('buildRoutePlanPayloadFromDiscoveryAction preserves dynamic constraints and strips Discovery-only fields', () => {
  const result = buildRoutePlanPayloadFromDiscoveryAction({
    action: {
      action_type: 'route_plan.generate',
      payload: {
        option_keys: ['scenic:1', 'scenic:1', 'scenic:2']
      }
    },
    discoveryResult: {
      ranked_options: [
        {
          option_key: 'scenic:1',
          fit_score: 92,
          fit_reasons: ['elder friendly'],
          caution_reasons: []
        }
      ],
      comparison: {
        outcome: 'clear_winner'
      },
      decision_context: {
        continuation: {
          time_budget: { days: 3 },
          travel_mode: 'public_transport',
          companions: ['elders'],
          hard_avoidances: ['too_tiring'],
          physical_constraints: ['low_walking'],
          pace_preference: 'relaxed',
          route_origin: '章贡区',
          destination_scope: [],
          theme_preferences: ['history'],
          exclude_option_keys: ['scenic:9']
        }
      }
    },
    userQuery: '准备玩 3 天，带老人，想轻松一点'
  });

  assert.equal(result.ok, true);

  const routerResult = result.value.routerResult;
  const constraints = routerResult.constraints;

  assert.deepEqual(constraints.time_budget, { days: 3 });
  assert.equal(constraints.travel_mode, 'public_transport');
  assert.deepEqual(constraints.companions, ['elders']);
  assert.deepEqual(constraints.hard_avoidances, ['too_tiring']);
  assert.deepEqual(constraints.physical_constraints, ['low_walking']);
  assert.equal(constraints.pace_preference, 'relaxed');
  assert.equal(constraints.route_origin, '章贡区');
  assert.equal(constraints.destination_scope, null);
  assert.deepEqual(constraints.theme_preferences, ['history']);
  assert.deepEqual(constraints.locked_targets, ['scenic:1', 'scenic:2']);

  assert.equal(Object.hasOwn(constraints, 'scenic_hints'), false);
  assert.equal(Object.hasOwn(constraints, 'ranked_options'), false);
  assert.equal(Object.hasOwn(constraints, 'comparison'), false);
  assert.equal(Object.hasOwn(constraints, 'fit_score'), false);
  assert.equal(Object.hasOwn(constraints, 'fit_reasons'), false);
  assert.equal(Object.hasOwn(constraints, 'caution_reasons'), false);
  assert.equal(Object.hasOwn(constraints, 'exclude_option_keys'), false);
  assert.equal(Object.hasOwn(routerResult, 'ranked_options'), false);
  assert.equal(Object.hasOwn(routerResult, 'comparison'), false);
});

test('normalizeOptionKeys deduplicates in first-seen order', () => {
  const result = normalizeOptionKeys(['scenic:3', 'scenic:1', 'scenic:3', 'scenic:2']);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, ['scenic:3', 'scenic:1', 'scenic:2']);
});

test('buildRoutePlanPayloadFromDiscoveryAction rejects invalid option keys before request', () => {
  const result = buildRoutePlanPayloadFromDiscoveryAction({
    action: {
      action_type: 'route_plan.generate',
      payload: {
        option_keys: ['scenic:1', 'article:2']
      }
    },
    discoveryResult: {},
    userQuery: 'generate route'
  });

  assert.equal(result.ok, false);
});

test('buildTraceableUserQuery keeps route planner user_query traceable and bounded', () => {
  assert.equal(buildTraceableUserQuery(''), '基于 Discovery 选择生成路线');

  const longQuery = buildTraceableUserQuery('x'.repeat(800));

  assert.equal(longQuery.length, 500);
  assert.ok(longQuery.startsWith('基于 Discovery 选择生成路线：'));
});
