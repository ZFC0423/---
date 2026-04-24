import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSafeScenicAttributes,
  resolveMentionToScenic,
  resolveOptionKeyToScenicCandidate,
  retrieveDiscoveryCandidates
} from '../src/services/ai/decision-discovery-agent/retrieve.js';

function createRecord(id, overrides = {}) {
  return {
    id,
    name: `spot ${id}`,
    region: 'Zhanggong',
    category_id: 2,
    tags: 'history,old-city',
    recommend_flag: 1,
    hot_score: 90,
    status: 1,
    family_friendly: 1,
    ...overrides
  };
}

test('projection only uses fields present in rawAttributes', () => {
  const fakeModel = {
    rawAttributes: {
      id: {},
      name: {},
      region: {},
      category_id: {},
      tags: {},
      recommend_flag: {},
      hot_score: {},
      status: {}
    }
  };

  const attributes = getSafeScenicAttributes(fakeModel);

  assert.ok(attributes.includes('id'));
  assert.ok(!attributes.includes('cover_image'));
  assert.ok(!attributes.includes('traffic_guide'));
});

test('option key resolution parses scenic id and performs status-scoped DB lookup', async () => {
  let receivedWhere = null;
  const fakeModel = {
    rawAttributes: {
      id: {},
      name: {},
      region: {},
      category_id: {},
      tags: {},
      recommend_flag: {},
      hot_score: {},
      status: {}
    },
    associations: {},
    async findOne(query) {
      receivedWhere = query.where;
      return createRecord(1);
    }
  };

  const result = await resolveOptionKeyToScenicCandidate('scenic:1', {
    scenicModel: fakeModel,
    categoryModel: {}
  });

  assert.deepEqual(receivedWhere, { id: 1, status: 1 });
  assert.equal(result.resolution_status, 'resolved');
  assert.equal(result.option_key, 'scenic:1');
});

test('retrieve passes action option keys through id resolver and does not treat scenic:1 as text', async () => {
  const calls = [];
  const fakeModel = {
    rawAttributes: {
      id: {},
      name: {},
      region: {},
      category_id: {},
      tags: {},
      recommend_flag: {},
      hot_score: {},
      status: {}
    },
    associations: {},
    async findOne(query) {
      calls.push({ type: 'findOne', where: query.where });
      return createRecord(query.where.id);
    },
    async findAll(query) {
      calls.push({ type: 'findAll', where: query.where });
      return [];
    }
  };

  const result = await retrieveDiscoveryCandidates({
    continuation: {
      theme_preferences: [],
      region_hints: [],
      destination_scope: []
    },
    seedOptionKeys: ['scenic:1'],
    seedTexts: [],
    scenicModel: fakeModel,
    categoryModel: {}
  });

  assert.equal(result.candidates[0].option_key, 'scenic:1');
  assert.equal(calls.some((call) => call.type === 'findOne' && call.where.id === 1 && call.where.status === 1), true);
  assert.equal(JSON.stringify(calls).includes('scenic:1'), false);
});

test('mention resolver reports ambiguous contains matches', async () => {
  const fakeModel = {
    rawAttributes: {
      id: {},
      name: {},
      region: {},
      category_id: {},
      tags: {},
      recommend_flag: {},
      hot_score: {},
      status: {}
    },
    associations: {},
    async findAll() {
      return [
        createRecord(1, { name: 'old city east' }),
        createRecord(2, { name: 'old city west' })
      ];
    }
  };

  const result = await resolveMentionToScenic('old city', {
    scenicModel: fakeModel,
    categoryModel: {}
  });

  assert.equal(result.resolution_status, 'ambiguous');
  assert.equal(result.option_key, null);
});
