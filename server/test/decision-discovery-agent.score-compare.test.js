import test from 'node:test';
import assert from 'node:assert/strict';

import { buildComparison } from '../src/services/ai/decision-discovery-agent/compare.js';
import { normalizeHotScore, projectRankedOptions, scoreCandidates } from '../src/services/ai/decision-discovery-agent/score.js';

function scenicCandidate(id, overrides = {}) {
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
    recommend_flag: 0,
    hot_score: 0,
    text: {
      intro: 'history heritage',
      culture_desc: '',
      route_label: '',
      quote: '',
      visit_mode: '',
      walking_intensity: 'low',
      traffic_guide: '',
      tags: 'history'
    },
    record: {},
    ...overrides
  };
}

test('hot_score signal is clamped to 0..6', () => {
  assert.equal(normalizeHotScore(-50), 0);
  assert.equal(normalizeHotScore(0), 0);
  assert.equal(normalizeHotScore(50), 3);
  assert.equal(normalizeHotScore(500), 6);
});

test('transport signal requires explicit text and cannot be inferred from region', () => {
  const { scored_options: scored, warnings } = scoreCandidates(
    [
      scenicCandidate(1, {
        region: 'Zhanggong',
        text: {
          intro: 'history heritage',
          culture_desc: '',
          route_label: '',
          quote: '',
          visit_mode: '',
          walking_intensity: 'low',
          traffic_guide: '',
          tags: 'history'
        }
      })
    ],
    {
      theme_preferences: ['heritage'],
      region_hints: [],
      destination_scope: [],
      travel_mode: 'public_transport',
      companions: [],
      hard_avoidances: [],
      physical_constraints: [],
      pace_preference: null
    }
  );

  assert.equal(scored[0].axes.transport_fit.available, false);
  assert.equal(scored[0].fit_reasons.includes('travel_mode_text_signal'), false);
  assert.equal(warnings.some((warning) => warning.code === 'transport_signal_limited'), true);
});

test('stable sorting uses score, editorial fields, then entity_id', () => {
  const { scored_options: scored } = scoreCandidates(
    [
      scenicCandidate(3, { recommend_flag: 0, hot_score: 20 }),
      scenicCandidate(1, { recommend_flag: 1, hot_score: 20 }),
      scenicCandidate(2, { recommend_flag: 1, hot_score: 10 })
    ],
    {
      theme_preferences: [],
      region_hints: [],
      destination_scope: [],
      travel_mode: null,
      companions: [],
      hard_avoidances: [],
      physical_constraints: [],
      pace_preference: null
    }
  );

  assert.deepEqual(scored.map((item) => item.option_key), ['scenic:1', 'scenic:2', 'scenic:3']);
});

test('comparison does not allow editorial priority to be sole clear winner basis', () => {
  const { scored_options: scored } = scoreCandidates(
    [
      scenicCandidate(1, { recommend_flag: 1, hot_score: 100 }),
      scenicCandidate(2, { recommend_flag: 0, hot_score: 0 })
    ],
    {
      theme_preferences: [],
      region_hints: [],
      destination_scope: [],
      travel_mode: null,
      companions: [],
      hard_avoidances: [],
      physical_constraints: [],
      pace_preference: null
    }
  );
  const rankedOptions = projectRankedOptions(scored, 2);
  const comparison = buildComparison({
    targetResolutions: [
      { requested_text: 'scenic:1', resolution_status: 'resolved', resolution_reason: 'option_key', option_key: 'scenic:1' },
      { requested_text: 'scenic:2', resolution_status: 'resolved', resolution_reason: 'option_key', option_key: 'scenic:2' }
    ],
    rankedOptions,
    scoredOptions: scored
  });

  assert.equal(rankedOptions[0].option_key, 'scenic:1');
  assert.equal(comparison.outcome, 'tie');
});

test('comparison can clear winner when non-editorial decisive axis and margin align', () => {
  const { scored_options: scored } = scoreCandidates(
    [
      scenicCandidate(1, {
        recommend_flag: 1,
        hot_score: 100,
        text: {
          intro: 'history heritage public transport citywalk',
          culture_desc: 'heritage',
          route_label: 'citywalk',
          quote: '',
          visit_mode: 'public transport',
          walking_intensity: 'low',
          traffic_guide: '',
          tags: 'history'
        }
      }),
      scenicCandidate(2, {
        category_code: 'scenic_nature',
        tags: ['forest'],
        text: {
          intro: 'forest',
          culture_desc: '',
          route_label: '',
          quote: '',
          visit_mode: '',
          walking_intensity: 'high',
          traffic_guide: '',
          tags: 'forest'
        }
      })
    ],
    {
      theme_preferences: ['heritage'],
      region_hints: [],
      destination_scope: [],
      travel_mode: 'public_transport',
      companions: [],
      hard_avoidances: [],
      physical_constraints: [],
      pace_preference: null
    }
  );
  const rankedOptions = projectRankedOptions(scored, 2);
  const comparison = buildComparison({
    targetResolutions: [
      { requested_text: 'scenic:1', resolution_status: 'resolved', resolution_reason: 'option_key', option_key: 'scenic:1' },
      { requested_text: 'scenic:2', resolution_status: 'resolved', resolution_reason: 'option_key', option_key: 'scenic:2' }
    ],
    rankedOptions,
    scoredOptions: scored
  });

  assert.equal(comparison.outcome, 'clear_winner');
  assert.equal(rankedOptions[0].option_key, 'scenic:1');
});
