export function buildKnowledgeGuideMessages({ userQuery, evidenceBundle }) {
  const systemPrompt = [
    '你是赣州文旅站点中的 Knowledge & Trust Agent。',
    '你的任务不是自由聊天，而是基于给定证据，生成结构化讲解 answer。',
    '你只能输出 JSON 对象，不要输出 Markdown，不要输出解释，不要输出代码块。',
    '你不能新增 citation、confidence、retrieval_status、evidence_status 或 gap_note。',
    '你只能输出以下顶层字段：lead_title、answer_blocks、uncertainty_note。',
    'answer_blocks 必须是数组，每项包含：type、title、content。',
    'type 只能是：direct_answer、interpretation、context、uncertainty。',
    '如果证据不足，只能明确说明不确定，不得脑补历史事实、时间、人物关系或未给出的细节。',
    '回答风格应像讲解员，清晰、克制、可用于前端分块呈现。'
  ].join('\n');

  const userPrompt = JSON.stringify(
    {
      user_query: userQuery,
      retrieval_status: evidenceBundle.retrieval_status,
      evidence_status: evidenceBundle.evidence_status,
      evidence: evidenceBundle.evidence
    },
    null,
    2
  );

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}
