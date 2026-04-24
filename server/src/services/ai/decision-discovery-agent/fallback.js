import { TASK_TYPES, createDefaultContinuation, createWarning } from './contracts.js';
import { buildDecisionContext } from './context-merge.js';

function safeTaskType(taskType) {
  return TASK_TYPES.includes(taskType) ? taskType : 'discover_options';
}

export function createDiscoveryOutput({
  taskType = 'discover_options',
  resultStatus = 'empty',
  rankedOptions = [],
  comparison = null,
  nextActions = [],
  warnings = [],
  continuation = createDefaultContinuation()
} = {}) {
  return {
    task_type: safeTaskType(taskType),
    result_status: resultStatus,
    ranked_options: rankedOptions,
    comparison,
    next_actions: nextActions,
    warnings,
    decision_context: buildDecisionContext(continuation)
  };
}

export function createInvalidOutput({ taskType = 'discover_options', reasonCode = 'invalid_action_payload', warnings = [] } = {}) {
  return createDiscoveryOutput({
    taskType,
    resultStatus: 'invalid',
    warnings: [
      createWarning({
        code: reasonCode,
        scope: 'global',
        severity: 'warning'
      }),
      ...warnings
    ]
  });
}

export function createEmptyOutput({ taskType = 'discover_options', warnings = [], continuation } = {}) {
  return createDiscoveryOutput({
    taskType,
    resultStatus: 'empty',
    warnings,
    continuation
  });
}

export function createLimitedOutput({ taskType = 'discover_options', warnings = [], continuation, comparison = null } = {}) {
  return createDiscoveryOutput({
    taskType,
    resultStatus: 'limited',
    warnings,
    continuation,
    comparison
  });
}
