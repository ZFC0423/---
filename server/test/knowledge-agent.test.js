import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEvidenceBundle } from '../src/services/ai/knowledge-agent/evidence.js';
import { buildRetrievalSignals, collectKnowledgeCandidates } from '../src/services/ai/knowledge-agent/retrieve.js';

function createGuideConstraints(overrides = {}) {
  return {
    user_query: '给我讲讲这个地方为什么值得看',
    subject_entities: null,
    theme_preferences: null,
    region_hints: null,
    scenic_hints: null,
    hard_avoidances: null,
    companions: null,
    ...overrides
  };
}

test('subject_entities can drive scenic retrieval even when user_query is generic', () => {
  const signals = buildRetrievalSignals(
    createGuideConstraints({
      subject_entities: ['郁孤台']
    })
  );

  const retrievalResult = collectKnowledgeCandidates({
    signals,
    scenicRecords: [
      {
        id: 11,
        name: '郁孤台',
        region: 'Zhanggong',
        intro: '郁孤台是赣州老城的重要地标，与宋城记忆密切相关。',
        culture_desc: '这里常被用来理解赣州古城的历史层次。',
        hero_caption: '台上能望见城市的纹理。',
        quote: '看城，也看时间。',
        tags: 'heritage,old-city',
        category: { code: 'heritage' }
      }
    ],
    articleRecords: []
  });

  assert.equal(retrievalResult.retrieval_status, 'hit');
  assert.equal(retrievalResult.candidates[0].source_type, 'scenic');
  assert.ok(retrievalResult.candidates[0].matched_by.includes('subject_entities'));

  const evidenceBundle = buildEvidenceBundle({ retrievalResult });
  assert.equal(evidenceBundle.evidence.citations[0].path, '/scenic/11');
  assert.ok(evidenceBundle.evidence.citations[0].matched_by.includes('subject_entities'));
});

test('theme_preferences can drive article retrieval and citation matching', () => {
  const signals = buildRetrievalSignals(
    createGuideConstraints({
      user_query: '想理解这条文化脉络',
      theme_preferences: ['heritage']
    })
  );

  const retrievalResult = collectKnowledgeCandidates({
    signals,
    scenicRecords: [],
    articleRecords: [
      {
        id: 7,
        title: '赣州古城与遗产阅读',
        summary: '这篇文章用于解释赣州古城的 heritage 脉络与观看方式。',
        content: 'heritage 线索可以帮助理解城墙、楼台和历史空间之间的关系。',
        quote: '先理解遗产脉络，再进入现场。',
        tags: 'heritage,old-city',
        source: 'editorial',
        author: 'curator',
        category: { code: 'heritage', name: '遗产' }
      }
    ]
  });

  assert.equal(retrievalResult.retrieval_status, 'hit');
  assert.equal(retrievalResult.candidates[0].source_type, 'article');
  assert.ok(retrievalResult.candidates[0].matched_by.includes('theme_preferences'));

  const evidenceBundle = buildEvidenceBundle({ retrievalResult });
  assert.equal(evidenceBundle.evidence.citations[0].source_type, 'article');
  assert.ok(evidenceBundle.evidence.citations[0].matched_by.includes('theme_preferences'));
});

test('secondary-only evidence is marked as insufficient', () => {
  const signals = buildRetrievalSignals(
    createGuideConstraints({
      subject_entities: ['浮桥']
    })
  );

  const retrievalResult = collectKnowledgeCandidates({
    signals,
    scenicRecords: [
      {
        id: 21,
        name: '古浮桥',
        region: 'Zhanggong',
        intro: null,
        culture_desc: null,
        hero_caption: '桥不是单纯的通行设施，更像老城的生活界面。',
        quote: '先过桥，再进城。',
        tags: 'bridge,heritage',
        category: { code: 'heritage' }
      }
    ],
    articleRecords: []
  });

  const evidenceBundle = buildEvidenceBundle({ retrievalResult });
  assert.equal(evidenceBundle.retrieval_status, 'hit');
  assert.equal(evidenceBundle.evidence_status, 'insufficient');
  assert.equal(evidenceBundle.evidence.citations[0].source_field, 'hero_caption');
});

test('empty retrieval never fabricates citations', () => {
  const signals = buildRetrievalSignals(createGuideConstraints());
  const retrievalResult = collectKnowledgeCandidates({
    signals,
    scenicRecords: [],
    articleRecords: []
  });
  const evidenceBundle = buildEvidenceBundle({ retrievalResult });

  assert.equal(evidenceBundle.retrieval_status, 'empty');
  assert.equal(evidenceBundle.evidence_status, 'not_applicable');
  assert.deepEqual(evidenceBundle.evidence.citations, []);
  assert.ok(evidenceBundle.evidence.gap_note);
});

test('non-empty retrieval with zero citations is always insufficient', () => {
  for (const retrievalStatus of ['hit', 'partial']) {
    const evidenceBundle = buildEvidenceBundle({
      retrievalResult: {
        retrieval_status: retrievalStatus,
        signals: {
          subject_entities: ['郁孤台'],
          scenic_hints: [],
          theme_preferences: [],
          region_hints: [],
          user_query_terms: ['郁孤台']
        },
        candidates: [
          {
            source_type: 'scenic',
            source_id: 41,
            source_title: '郁孤台',
            source_label: null,
            author_label: null,
            category_code: 'heritage',
            matched_by: ['subject_entities'],
            score: retrievalStatus === 'hit' ? 40 : 12,
            direct_hit: retrievalStatus === 'hit',
            record: {
              intro: null,
              culture_desc: null,
              hero_caption: null,
              quote: null
            }
          }
        ]
      }
    });

    assert.equal(evidenceBundle.retrieval_status, retrievalStatus);
    assert.equal(evidenceBundle.evidence.citations.length, 0);
    assert.equal(evidenceBundle.evidence_status, 'insufficient');
  }
});

test('disallowed evidence fields are never emitted as source_field', () => {
  const signals = buildRetrievalSignals(
    createGuideConstraints({
      scenic_hints: ['夜景']
    })
  );

  const retrievalResult = collectKnowledgeCandidates({
    signals,
    scenicRecords: [
      {
        id: 31,
        name: '江边夜景段',
        region: 'Zhanggong',
        intro: null,
        culture_desc: null,
        hero_caption: '夜色让老城轮廓更清楚。',
        quote: null,
        tags: '夜景,摄影',
        tips: '建议带外套',
        traffic_guide: '公交可达',
        category: { code: 'heritage' }
      }
    ],
    articleRecords: []
  });

  const evidenceBundle = buildEvidenceBundle({ retrievalResult });
  assert.equal(evidenceBundle.evidence.citations[0].source_field, 'hero_caption');
  assert.notEqual(evidenceBundle.evidence.citations[0].source_field, 'tips');
  assert.notEqual(evidenceBundle.evidence.citations[0].source_field, 'traffic_guide');
});

test('article citation path falls back to null when category path is not mappable', () => {
  const signals = buildRetrievalSignals(
    createGuideConstraints({
      theme_preferences: ['photography']
    })
  );

  const retrievalResult = collectKnowledgeCandidates({
    signals,
    scenicRecords: [],
    articleRecords: [
      {
        id: 88,
        title: '未知专题文章',
        summary: '这篇文章可以作为弱证据，但分类路径并不在当前已冻结的前台路由映射里。',
        content: '文章正文用于测试未知 category 时 path 必须回退为 null。',
        quote: null,
        tags: 'photography',
        source: 'editorial',
        author: 'curator',
        category: { code: 'unknown_theme', name: '未知专题' }
      }
    ]
  });

  const evidenceBundle = buildEvidenceBundle({ retrievalResult });
  assert.equal(evidenceBundle.evidence.citations[0].source_type, 'article');
  assert.equal(evidenceBundle.evidence.citations[0].path, null);
});
