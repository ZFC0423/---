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
    '你是一名“赣州旅游文化行程助手”。',
    '你只能围绕赣州旅游、景点、美食、非遗、红色文化、客家文化相关内容生成建议。',
    '你必须优先基于提供的资料生成行程，不要编造实时天气、精确票价、营业时间、交通班次、酒店价格、地图路线。',
    '如果资料不足，要明确使用保守表述，例如“基于当前资料”。',
    '你必须输出 JSON 对象，不要输出 Markdown，不要输出解释性前言。',
    'JSON 顶层字段必须只有：summary、days、travelTips。',
    'days 必须是数组；数组中每一项必须包含：dayIndex、title、items。',
    'items 必须是数组；每一项必须包含：timeSlot、name、type、reason、tips。',
    'type 只能是 scenic 或 article_or_theme。',
    'timeSlot 优先使用 morning、noon、afternoon、evening。',
    '行程要体现赣州特色，并让 days、pace、transport 对结果有明显影响。',
    '如果是公共交通，不要把过于分散的点硬串在同一天。',
    '如果是自驾，可以适度放宽点位跨度。',
    '输出语言使用简体中文，风格简洁、可靠、适合游客阅读。'
  ].join('\n');

  const userPrompt = [
    '请根据下面的用户输入和站内资料，生成一份结构化的赣州旅游文化行程建议。',
    `旅行天数：${input.days} 天`,
    `兴趣偏好：${interestsText}`,
    `行程节奏：${PACE_LABELS[input.pace] || input.pace}`,
    `交通方式：${TRANSPORT_LABELS[input.transport] || input.transport}`,
    `补充说明：${input.notes || '无'}`,
    '',
    '可参考资料：',
    contextText || '当前没有检索到直接相关资料，请基于当前资料范围给出保守建议。'
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
