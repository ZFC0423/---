import test from 'node:test';
import assert from 'node:assert/strict';

import { createIntentRouter } from '../src/services/ai/intent-router/index.js';

function getByPath(target, path) {
  return path.split('.').reduce((value, key) => (value == null ? value : value[key]), target);
}

function createError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function runAssertions(result, assertions = []) {
  assertions.forEach((assertion) => {
    const actual = getByPath(result, assertion.path);

    if (Object.prototype.hasOwnProperty.call(assertion, 'equals')) {
      assert.deepStrictEqual(actual, assertion.equals, assertion.path);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(assertion, 'includes')) {
      assert.ok(Array.isArray(actual), `${assertion.path} should be an array`);
      assertion.includes.forEach((expectedItem) => {
        assert.ok(actual.includes(expectedItem), `${assertion.path} should include ${expectedItem}`);
      });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(assertion, 'notIncludes')) {
      if (Array.isArray(actual)) {
        assertion.notIncludes.forEach((unexpectedItem) => {
          assert.ok(!actual.includes(unexpectedItem), `${assertion.path} should not include ${unexpectedItem}`);
        });
      } else {
        assert.notStrictEqual(actual, assertion.notIncludes, `${assertion.path} should not equal ${assertion.notIncludes}`);
      }
    }
  });
}

function createRouterForFixture(fixture) {
  return createIntentRouter({
    llmExtract: async () => {
      if (fixture.llmError) {
        throw createError(fixture.llmError, fixture.llmError);
      }

      return fixture.llmResult;
    }
  });
}

const fixtures = [
  {
    id: 'guide-01-clear-history',
    input: { input: '请讲讲郁孤台背后的历史', priorState: null },
    llmResult: {
      task_type: 'guide_understand',
      task_confidence: 0.92,
      constraints: {
        user_query: '请讲讲郁孤台背后的历史',
        subject_entities: ['郁孤台'],
        scenic_hints: ['郁孤台']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'guide_understand',
      next_agent: 'ai_chat',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.subject_entities', includes: ['郁孤台'] }
    ]
  },
  {
    id: 'guide-02-theme-understand',
    input: { input: '我想先理解赣州客家文化和非遗有什么关系', priorState: null },
    llmResult: {
      task_type: 'guide_understand',
      task_confidence: 0.89,
      constraints: {
        user_query: '我想先理解赣州客家文化和非遗有什么关系',
        theme_preferences: ['hakka_culture', 'heritage']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'guide_understand',
      next_agent: 'ai_chat',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.theme_preferences', includes: ['hakka_culture', 'heritage'] }
    ]
  },
  {
    id: 'guide-03-fallback-invalid-json',
    input: { input: '赣州红色文化和宋城历史有什么关系', priorState: null },
    llmError: 'invalid_json',
    expect: {
      task_type: 'guide_understand',
      next_agent: 'ai_chat',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.user_query', equals: '赣州红色文化和宋城历史有什么关系' }
    ]
  },
  {
    id: 'guide-04-cross-intent-drop-prior',
    input: {
      input: '我更想先听讲解，解释一下郁孤台为什么重要',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.91,
        constraints: {
          travel_mode: 'self_drive',
          time_budget: { days: 3, date_text: null },
          pace_preference: 'compact'
        }
      }
    },
    llmResult: {
      task_type: 'guide_understand',
      task_confidence: 0.93,
      constraints: {
        user_query: '我更想先听讲解，解释一下郁孤台为什么重要',
        subject_entities: ['郁孤台']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'guide_understand',
      next_agent: 'ai_chat',
      clarification_needed: false,
      clarification_reason: null
    },
    negative_assertions: [
      { path: 'constraints.theme_preferences', equals: null },
      { path: 'constraints.companions', equals: null }
    ]
  },
  {
    id: 'route-01-full-public-transport',
    input: { input: '周末两天，公共交通，想看老城和美食，轻松一点', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.96,
      constraints: {
        user_query: '周末两天，公共交通，想看老城和美食，轻松一点',
        time_budget: { days: 2, date_text: '周末' },
        travel_mode: 'public_transport',
        pace_preference: 'relaxed',
        theme_preferences: ['food']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.time_budget.days', equals: 2 },
      { path: 'constraints.travel_mode', equals: 'public_transport' },
      { path: 'constraints.pace_preference', equals: 'relaxed' },
      { path: 'constraints.theme_preferences', includes: ['food'] }
    ],
    negative_assertions: [
      { path: 'constraints.money_budget', equals: null }
    ]
  },
  {
    id: 'route-02-full-self-drive-nature',
    input: { input: '三天自驾，想拍照和自然风光，节奏适中', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.94,
      constraints: {
        user_query: '三天自驾，想拍照和自然风光，节奏适中',
        time_budget: { days: 3, date_text: null },
        travel_mode: 'self_drive',
        pace_preference: 'normal',
        theme_preferences: ['photography', 'natural']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.time_budget.days', equals: 3 },
      { path: 'constraints.travel_mode', equals: 'self_drive' },
      { path: 'constraints.theme_preferences', includes: ['photography', 'natural'] }
    ],
    negative_assertions: [
      { path: 'constraints.money_budget', equals: null }
    ]
  },
  {
    id: 'route-03-merge-theme-from-prior',
    input: {
      input: '还是两天，公共交通，节奏适中',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.88,
        constraints: {
          theme_preferences: ['food', 'heritage']
        }
      }
    },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.9,
      constraints: {
        user_query: '还是两天，公共交通，节奏适中',
        time_budget: { days: 2, date_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'normal'
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.theme_preferences', includes: ['food', 'heritage'] },
      { path: 'constraints.travel_mode', equals: 'public_transport' }
    ]
  },
  {
    id: 'route-03b-explicit-empty-theme-preferences-do-not-merge-prior',
    input: {
      input: '还是两天，公共交通，节奏适中，这次主题都可以',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.9,
        constraints: {
          theme_preferences: ['food', 'heritage']
        }
      }
    },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.93,
      constraints: {
        user_query: '还是两天，公共交通，节奏适中，这次主题都可以',
        time_budget: { days: 2, date_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'normal',
        theme_preferences: []
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.theme_preferences', equals: [] }
    ],
    negative_assertions: [
      { path: 'constraints.theme_preferences', notIncludes: ['food', 'heritage'] }
    ]
  },
  {
    id: 'route-04-budget-status-flags',
    input: { input: '我已经有大致计划了，预算适中，想轻松一点走两天公共交通路线', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        user_query: '我已经有大致计划了，预算适中，想轻松一点走两天公共交通路线',
        time_budget: { days: 2, date_text: null },
        money_budget: { level: 'medium', amount_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'relaxed',
        status_flags: { already_has_plan: true }
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.money_budget.level', equals: 'medium' },
      { path: 'constraints.status_flags.already_has_plan', equals: true }
    ]
  },
  {
    id: 'route-05-fallback-timeout',
    input: { input: '周末两天，自驾，想拍照看山水，节奏适中', priorState: null },
    llmError: 'timeout',
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.time_budget.days', equals: 2 },
      { path: 'constraints.travel_mode', equals: 'self_drive' }
    ],
    negative_assertions: [
      { path: 'constraints.money_budget', equals: null }
    ]
  },
  {
    id: 'route-missing-01-no-days',
    input: { input: '帮我安排一条赣州路线，公共交通，节奏适中', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.87,
      constraints: {
        user_query: '帮我安排一条赣州路线，公共交通，节奏适中',
        travel_mode: 'public_transport',
        pace_preference: 'normal'
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'missing_slots'
    },
    constraints_assertions: [
      { path: 'missing_required_fields', includes: ['time_budget'] },
      { path: 'clarification_questions', includes: ['你计划在赣州玩几天？'] }
    ],
    negative_assertions: [
      { path: 'constraints.time_budget', equals: null }
    ]
  },
  {
    id: 'route-missing-02-no-travel-mode',
    input: { input: '帮我做个两天赣州行程，想看老城和美食，节奏轻松', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.86,
      constraints: {
        user_query: '帮我做个两天赣州行程，想看老城和美食，节奏轻松',
        time_budget: { days: 2, date_text: null },
        pace_preference: 'relaxed',
        theme_preferences: ['food']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'missing_slots'
    },
    constraints_assertions: [
      { path: 'missing_required_fields', includes: ['travel_mode'] },
      { path: 'clarification_questions', includes: ['你更偏向公共交通还是自驾？'] }
    ],
    negative_assertions: [
      { path: 'constraints.travel_mode', equals: null }
    ]
  },
  {
    id: 'route-missing-03-no-pace',
    input: { input: '两天公共交通，想围绕客家文化和非遗来安排', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.9,
      constraints: {
        user_query: '两天公共交通，想围绕客家文化和非遗来安排',
        time_budget: { days: 2, date_text: null },
        travel_mode: 'public_transport',
        theme_preferences: ['hakka_culture', 'heritage']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'missing_slots'
    },
    constraints_assertions: [
      { path: 'missing_required_fields', includes: ['pace_preference'] }
    ],
    negative_assertions: [
      { path: 'constraints.money_budget', equals: null }
    ]
  },
  {
    id: 'route-missing-04-multiple-required',
    input: { input: '帮我顺一条赣州路线，偏美食', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.83,
      constraints: {
        user_query: '帮我顺一条赣州路线，偏美食',
        theme_preferences: ['food']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'missing_slots'
    },
    constraints_assertions: [
      { path: 'missing_required_fields', includes: ['time_budget', 'travel_mode', 'pace_preference'] }
    ]
  },
  {
    id: 'ambiguous-01-recommend-me',
    input: { input: '推荐一下', priorState: null },
    llmResult: {
      task_type: null,
      task_confidence: 0.2,
      constraints: {
        user_query: '推荐一下'
      },
      clarification_reason: 'intent_ambiguous'
    },
    expect: {
      task_type: null,
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'intent_ambiguous'
    },
    constraints_assertions: [
      { path: 'clarification_questions', includes: ['你这一步更想先听讲解，还是直接让我帮你排路线？'] }
    ]
  },
  {
    id: 'ambiguous-02-mixed-low-confidence',
    input: {
      input: '我想了解一下，也想顺便看看周末怎么安排',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.91,
        constraints: {
          travel_mode: 'self_drive'
        }
      }
    },
    llmResult: {
      task_type: null,
      task_confidence: 0.41,
      constraints: {
        user_query: '我想了解一下，也想顺便看看周末怎么安排'
      },
      clarification_reason: 'intent_ambiguous'
    },
    expect: {
      task_type: null,
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'intent_ambiguous'
    },
    negative_assertions: [
      { path: 'constraints.travel_mode', equals: null }
    ]
  },
  {
    id: 'ambiguous-03-reserved-task-type',
    input: { input: '我已经有路线了，想调整一下', priorState: null },
    llmResult: {
      task_type: 'adjust_route',
      task_confidence: 0.95,
      constraints: {
        user_query: '我已经有路线了，想调整一下',
        status_flags: { already_has_plan: true }
      },
      clarification_reason: null
    },
    expect: {
      task_type: null,
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'intent_ambiguous'
    }
  },
  {
    id: 'conflict-01-pace-vs-scope',
    input: { input: '一天内轻松玩完全部重点，公共交通', priorState: null },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.9,
      constraints: {
        user_query: '一天内轻松玩完全部重点，公共交通',
        time_budget: { days: 1, date_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'relaxed'
      },
      clarification_reason: 'constraint_conflict',
      _meta: {
        conflict_codes: ['pace_vs_scope']
      }
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'constraint_conflict'
    },
    constraints_assertions: [
      { path: 'clarification_questions', includes: ['你更优先轻松慢游，还是尽量在有限时间里覆盖更多重点？'] }
    ]
  },
  {
    id: 'conflict-02-fallback-travel-mode',
    input: { input: '两天行程，公共交通和自驾都要，节奏适中', priorState: null },
    llmError: 'timeout',
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'constraint_conflict'
    },
    constraints_assertions: [
      { path: 'clarification_questions', includes: ['这次出行到底以公共交通为主，还是以自驾为主？'] }
    ],
    negative_assertions: [
      { path: 'constraints.travel_mode', equals: null }
    ]
  },
  {
    id: 'prior-01-high-confidence-cross-intent-invalidates',
    input: {
      input: '先给我讲讲赣州宋城为什么值得看',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.88,
        constraints: {
          time_budget: { days: 2, date_text: null },
          travel_mode: 'self_drive',
          pace_preference: 'normal'
        }
      }
    },
    llmResult: {
      task_type: 'guide_understand',
      task_confidence: 0.91,
      constraints: {
        user_query: '先给我讲讲赣州宋城为什么值得看',
        theme_preferences: ['heritage']
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'guide_understand',
      next_agent: 'ai_chat',
      clarification_needed: false,
      clarification_reason: null
    },
    negative_assertions: [
      { path: 'constraints.companions', equals: null },
      { path: 'constraints.hard_avoidances', equals: null }
    ]
  },
  {
    id: 'prior-02-same-task-merge-missing-fields',
    input: {
      input: '还是两天，节奏适中',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.9,
        constraints: {
          travel_mode: 'self_drive',
          theme_preferences: ['natural']
        }
      }
    },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.92,
      constraints: {
        user_query: '还是两天，节奏适中',
        time_budget: { days: 2, date_text: null },
        pace_preference: 'normal'
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.travel_mode', equals: 'self_drive' },
      { path: 'constraints.theme_preferences', includes: ['natural'] }
    ]
  },
  {
    id: 'prior-03-low-confidence-no-merge',
    input: {
      input: '还是安排一下吧',
      priorState: {
        task_type: 'plan_route',
        task_confidence: 0.94,
        constraints: {
          travel_mode: 'self_drive',
          time_budget: { days: 2, date_text: null },
          pace_preference: 'normal'
        }
      }
    },
    llmResult: {
      task_type: 'plan_route',
      task_confidence: 0.51,
      constraints: {
        user_query: '还是安排一下吧'
      },
      clarification_reason: null
    },
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'missing_slots'
    },
    negative_assertions: [
      { path: 'constraints.travel_mode', equals: null },
      { path: 'constraints.time_budget', equals: null }
    ]
  },
  {
    id: 'prior-04-fallback-resolved-cross-intent-invalidates',
    input: {
      input: '周末两天，公共交通，想吃吃逛逛',
      priorState: {
        task_type: 'guide_understand',
        task_confidence: 0.9,
        constraints: {
          companions: ['solo']
        }
      }
    },
    llmError: 'timeout',
    expect: {
      task_type: 'plan_route',
      next_agent: 'safe_clarify',
      clarification_needed: true,
      clarification_reason: 'missing_slots'
    },
    constraints_assertions: [
      { path: 'constraints.time_budget.days', equals: 2 },
      { path: 'constraints.travel_mode', equals: 'public_transport' }
    ],
    negative_assertions: [
      { path: 'constraints.companions', equals: null }
    ]
  },
  {
    id: 'forced-01-invalid-json-route',
    input: { input: '两天公共交通，想看老城，节奏适中', priorState: null },
    llmError: 'invalid_json',
    expect: {
      task_type: 'plan_route',
      next_agent: 'ai_trip',
      clarification_needed: false,
      clarification_reason: null
    },
    constraints_assertions: [
      { path: 'constraints.time_budget.days', equals: 2 },
      { path: 'constraints.travel_mode', equals: 'public_transport' },
      { path: 'constraints.pace_preference', equals: 'normal' }
    ],
    negative_assertions: [
      { path: 'constraints.money_budget', equals: null }
    ]
  },
  {
    id: 'forced-02-schema-violation-guide',
    input: { input: '介绍一下赣州为什么适合从老城看起', priorState: null },
    llmError: 'schema_violation',
    expect: {
      task_type: 'guide_understand',
      next_agent: 'ai_chat',
      clarification_needed: false,
      clarification_reason: null
    }
  }
];

fixtures.forEach((fixture) => {
  test(`intent-router fixture: ${fixture.id}`, async () => {
    const routeIntent = createRouterForFixture(fixture);
    const result = await routeIntent(fixture.input);

    assert.equal(result.task_type, fixture.expect.task_type, 'task_type');
    assert.equal(result.next_agent, fixture.expect.next_agent, 'next_agent');
    assert.equal(result.clarification_needed, fixture.expect.clarification_needed, 'clarification_needed');
    assert.equal(result.clarification_reason, fixture.expect.clarification_reason, 'clarification_reason');
    assert.equal(typeof result.task_confidence, 'number', 'task_confidence');
    assert.ok(Array.isArray(result.missing_required_fields), 'missing_required_fields');
    assert.ok(Array.isArray(result.clarification_questions), 'clarification_questions');

    runAssertions(result, fixture.constraints_assertions);
    runAssertions(result, fixture.negative_assertions);
  });
});
