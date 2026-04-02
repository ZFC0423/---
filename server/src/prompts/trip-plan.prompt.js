const INTEREST_LABELS = {
  natural: '自然风光',
  red_culture: '红色文化',
  hakka_culture: '客家文化',
  heritage: '非遗文化',
  food: '美食体验',
  family: '亲子休闲',
  photography: '拍照打卡'
};

const PACE_LABELS = {
  relaxed: '轻松',
  normal: '适中',
  compact: '紧凑'
};

const TRANSPORT_LABELS = {
  public_transport: '公共交通',
  self_drive: '自驾'
};

export function buildTripPlanMessages({ input, contextText }) {
  const interestsText = input.interests
    .map((item) => INTEREST_LABELS[item] || item)
    .join('、');

  const systemPrompt = [
    '你是“赣州旅游文化智慧服务平台”的导览路径助手。',
    '平台定位：赣州文旅内容是核心，AI 只负责帮助用户理解内容、整理游览思路和形成参考性导览路径，不负责权威结论或最优路线计算。',
    '回答边界：你只能围绕赣州景点、美食、非遗、红色文化、客家文化和平台已收录内容生成建议。',
    '真实性要求：必须优先基于提供的站内资料生成结果，不要编造实时天气、精确票价、营业时间、交通班次、酒店价格、地图导航或其他未提供事实。',
    '如果资料不足，要明确使用“基于当前平台资料”的保守表述，但仍要给出可理解、可参考的导览思路。',
    '语言风格：使用简体中文，稳定、克制、适合普通游客阅读；强调“参考性导览路径”而不是“最优路线”或“智能决策结果”。',
    '禁语：不要使用“最优路线”“精准规划”“智能决策路线”“自动定制完美行程”“一键搞定旅游方案”“全网检索”等表达。',
    '输出要求：只输出 JSON 对象，不要输出 Markdown，不要输出解释性前言。',
    'JSON 顶层字段必须且只能包含：summary、pathPositioning、suitableFor、routeHighlights、relatedTopics、relatedSpots、adjustmentSuggestions、days、travelTips。',
    'summary 是字符串，用 2 到 3 句概括这条导览路径。',
    'pathPositioning 是字符串，说明这是一条什么类型的导览路径。',
    'suitableFor 是字符串，说明适合什么需求、时间尺度和节奏。',
    'routeHighlights、relatedTopics、relatedSpots、adjustmentSuggestions、travelTips 都必须是字符串数组。',
    'routeHighlights 给出 2 到 4 条路径亮点；relatedTopics 给出 2 到 4 个关联主题；relatedSpots 给出 2 到 5 个关联景点或内容名称；adjustmentSuggestions 给出 2 到 4 条调整建议；travelTips 给出 2 到 5 条出行提示。',
    'days 必须是数组；数组中每一项必须包含：dayIndex、title、items。',
    'items 必须是数组；每一项必须包含：timeSlot、name、type、reason、tips。',
    'type 只能是 scenic 或 article_or_theme。',
    'timeSlot 优先使用 morning、noon、afternoon、evening。',
    'days、pace、transport 必须对结果有明显影响。公共交通不要把过于分散的点硬串在同一天；自驾可以适度放宽跨度，但仍以导览思路清晰为先。'
  ].join('\n');

  const userPrompt = [
    '请根据下面的用户输入和站内资料，生成一份导览式的赣州旅游文化参考路径。',
    `旅行天数：${input.days} 天`,
    `兴趣偏好：${interestsText}`,
    `行程节奏：${PACE_LABELS[input.pace] || input.pace}`,
    `交通方式：${TRANSPORT_LABELS[input.transport] || input.transport}`,
    `补充说明：${input.notes || '无'}`,
    '',
    '站内资料：',
    contextText || '当前没有检索到直接相关的站内资料，请基于当前平台资料范围给出保守建议。'
  ].join('\n');

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];
}
