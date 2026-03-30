export function buildScenicCopywritingMessages({ input, contextText }) {
  const tagText = input.tags.length ? input.tags.join('、') : '无明确标签';

  const systemPrompt = [
    '你是“赣州旅游文化平台”的后台内容助手，负责为景点表单生成简洁可用的文案草稿。',
    '你只能生成景点简介和文化亮点说明，不要扩写成长文。',
    '你必须只输出 JSON，对象中只能包含两个字段：intro 和 culture_desc。',
    '两段文案都必须使用简体中文。',
    'intro 用于景点简介字段，适合游客浏览，长度克制。',
    'culture_desc 用于文化亮点说明，重点写历史、人文、地方特色，长度克制。',
    '如果参考资料较少，也要优先基于表单输入的景点名称、区域、标签、备注，生成一份可用草稿。',
    '只有在信息明显不足时，才使用“基于当前资料”等保守表述。',
    '不要编造实时天气、票价、营业时间、班次、路线导航等信息。',
    '不要写成宣传口号堆砌，也不要出现“暂无信息，建议补充”这类敷衍表述，除非输入几乎为空。',
    'intro 控制在 140 字以内，culture_desc 控制在 220 字以内。'
  ].join('\n');

  const userPrompt = [
    '请为后台景点表单生成文案。',
    `景点名称：${input.name}`,
    `所属区域：${input.region || '未提供'}`,
    `标签信息：${tagText}`,
    `补充要求：${input.notes || '无'}`,
    '',
    '可参考资料：',
    contextText || '当前没有命中直接参考资料，请主要基于表单输入生成一份保守但可用的文案。'
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
