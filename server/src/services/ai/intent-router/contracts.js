export const INTENT_CONTRACT = {
  TASK_TYPES: ['guide_understand', 'plan_route', 'adjust_route', 'qa_support'],
  PR1_RUNTIME_TASK_TYPES: ['guide_understand', 'plan_route'],
  NEXT_AGENTS: ['ai_chat', 'ai_trip', 'safe_clarify'],
  CLARIFICATION_REASONS: ['missing_slots', 'intent_ambiguous', 'constraint_conflict'],
  TOP_LEVEL_FIELDS: [
    'task_type',
    'task_confidence',
    'constraints',
    'clarification_needed',
    'clarification_reason',
    'missing_required_fields',
    'clarification_questions',
    'next_agent'
  ],
  NULLABLE_RULES: {
    task_type: true,
    task_confidence: false,
    constraints: false,
    clarification_needed: false,
    clarification_reason: true,
    missing_required_fields: false,
    clarification_questions: false,
    next_agent: false
  },
  MISSING_VALUE_ENCODING: {
    scalar: null,
    list_unknown: null,
    list_explicit_empty: [],
    object_unknown: null,
    omit_fields: false,
    array_runtime_semantics: {
      null: 'unknown_or_not_provided',
      empty_array: 'explicit_empty',
      non_empty_array: 'explicit_values'
    }
  },
  ENUMS: {
    travel_mode: ['public_transport', 'self_drive', 'mixed'],
    pace_preference: ['relaxed', 'normal', 'compact'],
    money_budget_level: ['low', 'medium', 'high']
  },
  ALLOWED_CONSTRAINT_FIELDS_BY_TASK_TYPE: {
    guide_understand: [
      'user_query',
      'subject_entities',
      'theme_preferences',
      'region_hints',
      'scenic_hints',
      'hard_avoidances',
      'companions'
    ],
    plan_route: [
      'user_query',
      'time_budget',
      'money_budget',
      'travel_mode',
      'companions',
      'pace_preference',
      'theme_preferences',
      'hard_avoidances',
      'physical_constraints',
      'status_flags',
      'route_origin',
      'destination_scope'
    ]
  },
  NULL_TASKTYPE_CONSTRAINT_ALLOWLIST: [
    'user_query',
    'time_budget',
    'money_budget',
    'travel_mode',
    'companions',
    'pace_preference',
    'theme_preferences',
    'hard_avoidances',
    'physical_constraints',
    'status_flags',
    'route_origin',
    'destination_scope',
    'subject_entities',
    'region_hints',
    'scenic_hints'
  ],
  CONSTRAINT_FIELD_RULES: {
    guide_understand: {
      user_query: { type: 'string', nullable: false },
      subject_entities: { type: 'string_array', nullable: true },
      theme_preferences: { type: 'string_array', nullable: true },
      region_hints: { type: 'string_array', nullable: true },
      scenic_hints: { type: 'string_array', nullable: true },
      hard_avoidances: { type: 'string_array', nullable: true },
      companions: { type: 'string_array', nullable: true }
    },
    plan_route: {
      user_query: { type: 'string', nullable: false },
      time_budget: {
        type: 'object',
        nullable: true,
        shape: {
          days: { type: 'integer', nullable: true },
          date_text: { type: 'string', nullable: true }
        }
      },
      money_budget: {
        type: 'object',
        nullable: true,
        shape: {
          level: { type: 'enum', nullable: true, values: ['low', 'medium', 'high'] },
          amount_text: { type: 'string', nullable: true }
        }
      },
      travel_mode: {
        type: 'enum',
        nullable: true,
        values: ['public_transport', 'self_drive', 'mixed']
      },
      companions: { type: 'string_array', nullable: true },
      pace_preference: {
        type: 'enum',
        nullable: true,
        values: ['relaxed', 'normal', 'compact']
      },
      theme_preferences: { type: 'string_array', nullable: true },
      hard_avoidances: { type: 'string_array', nullable: true },
      physical_constraints: { type: 'string_array', nullable: true },
      status_flags: {
        type: 'object',
        nullable: true,
        shape: {
          already_has_plan: { type: 'boolean', nullable: true }
        }
      },
      route_origin: { type: 'string', nullable: true },
      destination_scope: { type: 'string', nullable: true }
    }
  },
  NULL_TASKTYPE_CONSTRAINT_RULES: {
    user_query: { type: 'string', nullable: false },
    time_budget: {
      type: 'object',
      nullable: true,
      shape: {
        days: { type: 'integer', nullable: true },
        date_text: { type: 'string', nullable: true }
      }
    },
    money_budget: {
      type: 'object',
      nullable: true,
      shape: {
        level: { type: 'enum', nullable: true, values: ['low', 'medium', 'high'] },
        amount_text: { type: 'string', nullable: true }
      }
    },
    travel_mode: {
      type: 'enum',
      nullable: true,
      values: ['public_transport', 'self_drive', 'mixed']
    },
    companions: { type: 'string_array', nullable: true },
    pace_preference: {
      type: 'enum',
      nullable: true,
      values: ['relaxed', 'normal', 'compact']
    },
    theme_preferences: { type: 'string_array', nullable: true },
    hard_avoidances: { type: 'string_array', nullable: true },
    physical_constraints: { type: 'string_array', nullable: true },
    status_flags: {
      type: 'object',
      nullable: true,
      shape: {
        already_has_plan: { type: 'boolean', nullable: true }
      }
    },
    route_origin: { type: 'string', nullable: true },
    destination_scope: { type: 'string', nullable: true },
    subject_entities: { type: 'string_array', nullable: true },
    region_hints: { type: 'string_array', nullable: true },
    scenic_hints: { type: 'string_array', nullable: true }
  },
  REQUIRED_FIELDS_BY_TASK_TYPE: {
    guide_understand: [],
    plan_route: ['time_budget', 'travel_mode', 'pace_preference']
  },
  CLARIFY_FIELD_PRIORITY: [
    'time_budget',
    'travel_mode',
    'pace_preference',
    'theme_preferences',
    'hard_avoidances',
    'companions',
    'physical_constraints',
    'money_budget'
  ],
  CLARIFY_REASON_TEMPLATES: {
    missing_slots: '已经识别为路线规划，还差几个关键信息才能继续往下走。',
    intent_ambiguous: '当前输入还不足以判断你是想先听讲解，还是想直接进入路线规划。',
    constraint_conflict: '当前条件里有互相冲突的要求，需要你先确认取舍。'
  },
  CLARIFY_FIELD_TEMPLATES: {
    time_budget: '你计划在赣州玩几天？',
    travel_mode: '你更偏向公共交通还是自驾？',
    pace_preference: '这次更想轻松一点，还是紧凑一点？',
    theme_preferences: '这次更想围绕哪些主题来安排？',
    hard_avoidances: '有没有明确想避开的内容或出行条件？',
    companions: '这次是一个人，还是和家人朋友同行？',
    physical_constraints: '体力、步行、爬坡这些方面有没有需要提前考虑的限制？',
    money_budget: '预算上是更克制，还是可以适当放宽？'
  },
  INTENT_DISAMBIGUATION_QUESTIONS: [
    '你这一步更想先听讲解，还是直接让我帮你排路线？',
    '如果你想做路线，我会继续按几天、交通方式和节奏把信息补齐。'
  ],
  CONFLICT_QUESTION_TEMPLATES: {
    pace_vs_scope: '你更优先轻松慢游，还是尽量在有限时间里覆盖更多重点？',
    transport_vs_span: '你更优先公共交通可达，还是接受跨区移动去换更多点位？',
    travel_mode_conflict: '这次出行到底以公共交通为主，还是以自驾为主？',
    generic: '这几个条件目前不能同时满足，你更想优先保留哪一项？'
  }
};

export function createEmptyGuideConstraints(userQuery = '') {
  return {
    user_query: String(userQuery || ''),
    subject_entities: null,
    theme_preferences: null,
    region_hints: null,
    scenic_hints: null,
    hard_avoidances: null,
    companions: null
  };
}

export function createEmptyRouteConstraints(userQuery = '') {
  return {
    user_query: String(userQuery || ''),
    time_budget: null,
    money_budget: null,
    travel_mode: null,
    companions: null,
    pace_preference: null,
    theme_preferences: null,
    hard_avoidances: null,
    physical_constraints: null,
    status_flags: null,
    route_origin: null,
    destination_scope: null
  };
}

export function createEmptyNullTaskConstraints(userQuery = '') {
  return {
    user_query: String(userQuery || ''),
    time_budget: null,
    money_budget: null,
    travel_mode: null,
    companions: null,
    pace_preference: null,
    theme_preferences: null,
    hard_avoidances: null,
    physical_constraints: null,
    status_flags: null,
    route_origin: null,
    destination_scope: null,
    subject_entities: null,
    region_hints: null,
    scenic_hints: null
  };
}
