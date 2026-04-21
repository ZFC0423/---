import { createEmptyKnowledgeOutput } from './contracts.js';

function normalizeText(value) {
  return String(value || '').trim();
}

export function buildMockKnowledgeGuideOutput({ routerResult }) {
  const query = normalizeText(routerResult?.constraints?.user_query) || '这个主题';
  const mockResult = createEmptyKnowledgeOutput();

  mockResult.retrieval_status = 'hit';
  mockResult.evidence_status = 'sufficient';
  mockResult.answer = {
    lead_title: '站内讲解结果（Mock）',
    answer_blocks: [
      {
        type: 'direct_answer',
        title: '讲解摘要',
        content: `这是 Mock 输出阶段的结构化讲解结果，用于验证从 RouterOutput 到 Knowledge Agent 的数据流。当前问题是“${query}”。`
      },
      {
        type: 'context',
        title: '证据说明',
        content: '当前回答引用的是硬编码证据样本，不代表真实数据库召回质量。这个阶段只验证协议完整性、evidence 结构和 HTTP 输出闭环。'
      }
    ],
    uncertainty_note: null
  };
  mockResult.evidence = {
    citations: [
      {
        source_type: 'scenic',
        source_id: 1,
        source_title: 'Mock Scenic',
        source_field: 'intro',
        excerpt: 'Mock scenic intro excerpt for protocol verification.',
        support_level: 'primary',
        matched_by: ['subject_entities'],
        path: '/scenic/1',
        source_label: null,
        author_label: null
      },
      {
        source_type: 'article',
        source_id: 2,
        source_title: 'Mock Article',
        source_field: 'summary',
        excerpt: 'Mock article summary excerpt for evidence rendering verification.',
        support_level: 'primary',
        matched_by: ['theme_preferences'],
        path: '/heritage/2',
        source_label: 'mock-source',
        author_label: 'mock-author'
      }
    ],
    gap_note: null
  };

  return mockResult;
}
