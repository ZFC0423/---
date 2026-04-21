import test from 'node:test';
import assert from 'node:assert/strict';

import { createKnowledgeGuideAgent } from '../src/services/ai/knowledge-agent/index.js';
import { generateKnowledgeAnswer } from '../src/services/ai/knowledge-agent/generate.js';

function createGuideRouterResult(overrides = {}) {
  return {
    task_type: 'guide_understand',
    task_confidence: 0.92,
    constraints: {
      user_query: '请讲讲郁孤台为什么值得看',
      subject_entities: ['郁孤台'],
      theme_preferences: null,
      region_hints: null,
      scenic_hints: null,
      hard_avoidances: null,
      companions: null
    },
    clarification_needed: false,
    clarification_reason: null,
    missing_required_fields: [],
    clarification_questions: [],
    next_agent: 'ai_chat',
    ...overrides
  };
}

test('mock provider returns full KnowledgeGuideOutput shape', async () => {
  const agent = createKnowledgeGuideAgent({
    resolveProvider: () => 'mock'
  });

  const result = await agent({
    routerResult: createGuideRouterResult()
  });

  assert.equal(result.task_type, 'guide_understand');
  assert.equal(result.retrieval_status, 'hit');
  assert.equal(result.evidence_status, 'sufficient');
  assert.ok(result.answer.lead_title);
  assert.ok(Array.isArray(result.answer.answer_blocks));
  assert.ok(Array.isArray(result.evidence.citations));
  assert.ok(result.evidence.citations.every((citation) => citation.path.startsWith('/')));
  assert.ok(result.evidence.citations.every((citation) => !['tips', 'traffic_guide'].includes(citation.source_field)));
});

test('service rejects invalid routerResult before downstream execution', async () => {
  const agent = createKnowledgeGuideAgent({
    resolveProvider: () => 'mock'
  });

  await assert.rejects(
    () =>
      agent({
        routerResult: createGuideRouterResult({
          next_agent: 'knowledge_guide'
        })
      }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /next_agent/);
      return true;
    }
  );
});

test('llm provider path keeps evidence fields code-owned', async () => {
  const agent = createKnowledgeGuideAgent({
    resolveProvider: () => 'llm',
    retrieveCandidates: async () => ({
      retrieval_status: 'partial',
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
          source_id: 3,
          source_title: '郁孤台',
          source_label: null,
          author_label: null,
          category_code: 'heritage',
          matched_by: ['subject_entities'],
          score: 40,
          direct_hit: true,
          record: {
            intro: '郁孤台能帮助理解赣州古城的空间记忆。',
            culture_desc: null,
            hero_caption: null,
            quote: null
          }
        }
      ]
    }),
    generateAnswer: async () => ({
      lead_title: '模型讲解',
      answer_blocks: [
        {
          type: 'direct_answer',
          title: '讲解',
          content: '这是模型生成的 answer，但 citation 仍由代码决定。'
        }
      ],
      uncertainty_note: null
    }),
    writeLog: async () => {}
  });

  const result = await agent({
    routerResult: createGuideRouterResult()
  });

  assert.equal(result.task_type, 'guide_understand');
  assert.equal(result.retrieval_status, 'partial');
  assert.ok(Array.isArray(result.evidence.citations));
  assert.equal(result.evidence.citations[0].source_field, 'intro');
  assert.equal(result.answer.lead_title, '模型讲解');
});

test('generate blocks invalid local messages and records fallback trace without calling model', async () => {
  let modelCalled = false;

  const result = await generateKnowledgeAnswer({
    provider: 'llm',
    routerResult: {
      constraints: {
        user_query: '请讲讲郁孤台'
      }
    },
    evidenceBundle: {
      retrieval_status: 'partial',
      evidence_status: 'insufficient',
      evidence: {
        citations: [],
        gap_note: '证据不足'
      }
    },
    buildMessages: () => [
      { role: 'system', content: 'system prompt' },
      { role: 'assistant', content: '{"lead_title":"prefill"}' }
    ],
    axiosClient: {
      post: async () => {
        modelCalled = true;
        throw new Error('should not call model');
      }
    }
  });

  assert.equal(modelCalled, false);
  assert.ok(result.answer);
  assert.equal(result.generation_meta.provider, 'llm');
  assert.equal(result.generation_meta.fallback_used, true);
  assert.equal(result.generation_meta.fallback_reason, 'schema_violation');
});

test('generate returns uniform answer + generation_meta shape for mock provider', async () => {
  const result = await generateKnowledgeAnswer({
    provider: 'mock',
    routerResult: {
      constraints: {
        user_query: '请讲讲郁孤台'
      }
    },
    evidenceBundle: {
      retrieval_status: 'partial',
      evidence_status: 'insufficient',
      evidence: {
        citations: [],
        gap_note: '证据不足'
      }
    }
  });

  assert.ok(result.answer);
  assert.ok(result.generation_meta);
  assert.equal(result.generation_meta.provider, 'mock');
  assert.equal(result.generation_meta.fallback_used, false);
  assert.equal(result.generation_meta.fallback_reason, null);
  assert.equal(result.generation_meta.raw_error_code, null);
  assert.equal(result.generation_meta.raw_error_message, null);
});

test('index collects answer_generation trace for logs but does not expose _meta publicly', async () => {
  let loggedResult = null;

  const agent = createKnowledgeGuideAgent({
    resolveProvider: () => 'llm',
    retrieveCandidates: async () => ({
      retrieval_status: 'partial',
      signals: {
        subject_entities: [],
        scenic_hints: [],
        theme_preferences: [],
        region_hints: [],
        user_query_terms: ['郁孤台']
      },
      candidates: []
    }),
    buildEvidence: () => ({
      retrieval_status: 'partial',
      evidence_status: 'insufficient',
      evidence: {
        citations: [],
        gap_note: '证据不足'
      }
    }),
    generateAnswer: async () => ({
      answer: {
        lead_title: '降级回答',
        answer_blocks: [
          {
            type: 'uncertainty',
            title: '说明',
            content: '这是降级结果。'
          }
        ],
        uncertainty_note: '证据不足'
      },
      generation_meta: {
        provider: 'llm',
        fallback_used: true,
        fallback_reason: 'invalid_json',
        raw_error_code: 'invalid_json',
        raw_error_message: 'bad json'
      }
    }),
    writeLog: async ({ result }) => {
      loggedResult = result;
    }
  });

  const result = await agent({
    routerResult: createGuideRouterResult()
  });

  assert.ok(!('_meta' in result));
  assert.ok(loggedResult?._meta?.answer_generation);
  assert.equal(loggedResult._meta.answer_generation.fallback_reason, 'invalid_json');
});
