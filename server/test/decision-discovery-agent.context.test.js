import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDecisionContext } from '../src/services/ai/decision-discovery-agent/context-merge.js';
import { createDecisionDiscoveryAgent } from '../src/services/ai/decision-discovery-agent/index.js';

function scenicCandidate(id) {
  return {
    option_key: `scenic:${id}`,
    entity_type: 'scenic',
    entity_id: id,
    display_name: `spot ${id}`,
    region: 'Zhanggong',
    category_id: 2,
    category_code: 'scenic_history',
    category_name: 'History Scenic',
    family_friendly: true,
    tags: ['history'],
    recommend_flag: 1,
    hot_score: 90,
    text: {
      intro: 'history',
      culture_desc: '',
      route_label: '',
      quote: '',
      visit_mode: '',
      walking_intensity: 'low',
      traffic_guide: '',
      tags: 'history'
    },
    record: {}
  };
}

test('fingerprint mismatch discards old context and adds warning', async () => {
  const decisionContext = buildDecisionContext({
    current_selection_key: 'scenic:9',
    exclude_option_keys: ['scenic:8'],
    theme_preferences: ['heritage'],
    region_hints: [],
    travel_mode: null,
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    time_budget: null,
    pace_preference: null,
    route_origin: null,
    destination_scope: [],
    option_limit: 3
  });
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => ({
      mode: 'primary',
      candidates: [scenicCandidate(1)],
      option_key_resolutions: [],
      diagnostics: []
    })
  });

  const result = await agent({
    task_type: 'discover_options',
    constraints: {},
    decision_context: {
      ...decisionContext,
      fingerprint: 'sha256:tampered'
    }
  });

  assert.equal(result.warnings.some((warning) => warning.code === 'context_fingerprint_mismatch'), true);
  assert.deepEqual(result.decision_context.continuation.exclude_option_keys, []);
});

test('suggest_alternatives execution excludes current selection without persisting it', async () => {
  let receivedExcludeKeys = null;
  const agent = createDecisionDiscoveryAgent({
    retrieve: async ({ executionExcludeOptionKeys }) => {
      receivedExcludeKeys = executionExcludeOptionKeys;
      return {
        mode: 'primary',
        candidates: [scenicCandidate(2)],
        option_key_resolutions: [],
        diagnostics: []
      };
    }
  });

  const result = await agent({
    task_type: 'suggest_alternatives',
    constraints: {},
    action: {
      action_type: 'discovery.alternative',
      payload: {
        current_selection_key: 'scenic:1',
        option_limit: 2
      }
    }
  });

  assert.deepEqual(receivedExcludeKeys, ['scenic:1']);
  assert.deepEqual(result.decision_context.continuation.exclude_option_keys, []);
  assert.equal(result.decision_context.continuation.current_selection_key, 'scenic:2');
});

test('previous_public_result contributes only regex-valid seed option keys', async () => {
  let receivedSeedKeys = null;
  const agent = createDecisionDiscoveryAgent({
    retrieve: async ({ seedOptionKeys }) => {
      receivedSeedKeys = seedOptionKeys;
      return {
        mode: 'primary',
        candidates: [scenicCandidate(2)],
        option_key_resolutions: [],
        diagnostics: []
      };
    }
  });

  await agent({
    task_type: 'narrow_options',
    constraints: {},
    previous_public_result: {
      ranked_options: [
        { option_key: 'scenic:2', display_name: 'trusted only after DB check' },
        { option_key: 'article:1' },
        { option_key: 'scenic:not-number' }
      ],
      debug_payload: {
        should_not_pass: true
      }
    }
  });

  assert.deepEqual(receivedSeedKeys, ['scenic:2']);
});
