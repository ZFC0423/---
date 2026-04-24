import { MAX_OPTION_LIMIT, OPTION_KEY_PATTERN, createWarning } from './contracts.js';
import { buildComparison } from './compare.js';
import { mergeDiscoveryContext } from './context-merge.js';
import { createDiscoveryOutput, createInvalidOutput } from './fallback.js';
import { buildNextActions } from './next-actions.js';
import {
  resolveMentionToScenic,
  resolveOptionKeyToScenicCandidate,
  retrieveDiscoveryCandidates
} from './retrieve.js';
import { projectRankedOptions, scoreCandidates } from './score.js';
import { assertDiscoveryContract, normalizeDiscoveryPayload } from './validate.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function uniqWarnings(warnings) {
  const seen = new Set();

  return warnings.filter((warning) => {
    const key = [
      warning.code,
      warning.scope,
      warning.field,
      warning.option_key,
      warning.severity
    ].join('|');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate || seen.has(candidate.option_key)) {
      return false;
    }

    seen.add(candidate.option_key);
    return true;
  });
}

function createOutputAndAssert(input) {
  const output = createDiscoveryOutput(input);
  assertDiscoveryContract(output);
  return output;
}

function invalidAfterContractFailure(taskType, error) {
  const output = createInvalidOutput({
    taskType,
    reasonCode: 'invalid_action_payload',
    warnings: [
      createWarning({
        code: 'invalid_action_payload',
        scope: 'global',
        field: 'contract',
        severity: 'warning'
      })
    ]
  });

  try {
    assertDiscoveryContract(output);
  } catch (fallbackError) {
    void fallbackError;
  }

  void error;
  return output;
}

function getCompareTargetSources(merged) {
  if (merged.actionOptionKeys.length) {
    return {
      type: 'option_key',
      values: merged.actionOptionKeys
    };
  }

  if (merged.targetTexts.length) {
    return {
      type: 'text',
      values: merged.targetTexts
    };
  }

  if (merged.previousPublicOptionKeys.length) {
    return {
      type: 'option_key',
      values: merged.previousPublicOptionKeys.slice(0, 4)
    };
  }

  return {
    type: 'text',
    values: []
  };
}

async function resolveCompareTargets({ merged, resolveMention, resolveOptionKey }) {
  const sources = getCompareTargetSources(merged);

  if (sources.values.length < 2 || sources.values.length > 4) {
    return {
      ok: false,
      error_code: 'invalid_compare_target_count',
      target_resolutions: []
    };
  }

  const targetResolutions = [];

  for (const value of sources.values) {
    if (sources.type === 'option_key' || OPTION_KEY_PATTERN.test(normalizeText(value))) {
      targetResolutions.push(await resolveOptionKey(value));
    } else {
      targetResolutions.push(await resolveMention(value));
    }
  }

  return {
    ok: true,
    target_resolutions: targetResolutions
  };
}

function getSeedOptionKeysForTask(taskType, merged) {
  if (merged.actionOptionKeys.length) {
    return merged.actionOptionKeys;
  }

  if (taskType === 'narrow_options') {
    return merged.previousPublicOptionKeys;
  }

  return [];
}

function getOptionKeyResolutionWarnings(retrievalResult) {
  return (retrievalResult.option_key_resolutions || [])
    .filter((resolution) => resolution.resolution_status !== 'resolved')
    .map((resolution) => createWarning({
      code: 'option_key_not_found',
      scope: 'global',
      field: 'action.payload.option_keys',
      severity: 'warning'
    }));
}

async function buildDiscoveryResult({
  taskType,
  merged,
  retrieve,
  score,
  project,
  warnings
}) {
  const seedOptionKeys = getSeedOptionKeysForTask(taskType, merged);
  const primary = await retrieve({
    continuation: merged.continuation,
    seedTexts: merged.seedTexts,
    seedOptionKeys,
    executionExcludeOptionKeys: merged.executionExcludeOptionKeys,
    mode: 'primary'
  });
  let retrieval = primary;
  let scored = score(uniqueCandidates(retrieval.candidates), merged.continuation, {
    seedOptionKeys: [...seedOptionKeys, ...merged.previousPublicOptionKeys]
  });
  let allWarnings = [
    ...warnings,
    ...getOptionKeyResolutionWarnings(primary),
    ...scored.warnings
  ];

  if (scored.scored_options.length < merged.continuation.option_limit) {
    const expanded = await retrieve({
      continuation: merged.continuation,
      seedTexts: merged.seedTexts,
      seedOptionKeys,
      executionExcludeOptionKeys: merged.executionExcludeOptionKeys,
      mode: 'expanded'
    });
    const expandedScored = score(uniqueCandidates(expanded.candidates), merged.continuation, {
      seedOptionKeys: [...seedOptionKeys, ...merged.previousPublicOptionKeys]
    });

    if (expandedScored.scored_options.length > scored.scored_options.length) {
      retrieval = expanded;
      scored = expandedScored;
      allWarnings = [
        ...warnings,
        ...getOptionKeyResolutionWarnings(expanded),
        ...expandedScored.warnings,
        createWarning({
          code: 'expanded_pool_used',
          scope: 'global',
          severity: 'info'
        })
      ];
    }
  }

  void retrieval;

  const rankedOptions = project(scored.scored_options, merged.continuation.option_limit);
  const resultStatus = rankedOptions.length
    ? rankedOptions.length < merged.continuation.option_limit ? 'limited' : 'ready'
    : 'empty';
  const continuation = {
    ...merged.continuation,
    current_selection_key: rankedOptions[0]?.option_key || merged.continuation.current_selection_key
  };
  const nextActions = buildNextActions({
    taskType,
    resultStatus,
    rankedOptions,
    optionLimit: merged.continuation.option_limit
  });

  return createOutputAndAssert({
    taskType,
    resultStatus,
    rankedOptions,
    nextActions,
    warnings: uniqWarnings(allWarnings),
    continuation
  });
}

async function buildCompareResult({
  taskType,
  merged,
  resolveMention,
  resolveOptionKey,
  score,
  project,
  compare,
  warnings
}) {
  const resolved = await resolveCompareTargets({
    merged,
    resolveMention,
    resolveOptionKey
  });

  if (!resolved.ok) {
    return createOutputAndAssert({
      taskType,
      resultStatus: 'invalid',
      warnings: uniqWarnings([
        ...warnings,
        createWarning({
          code: resolved.error_code,
          scope: 'global',
          severity: 'warning'
        })
      ]),
      continuation: merged.continuation
    });
  }

  const hasMissingTarget = resolved.target_resolutions.some((target) => target.resolution_status !== 'resolved');

  if (hasMissingTarget) {
    const comparison = compare({
      targetResolutions: resolved.target_resolutions,
      rankedOptions: [],
      scoredOptions: []
    });
    const nextActions = buildNextActions({
      taskType,
      resultStatus: 'limited',
      rankedOptions: [],
      comparison,
      optionLimit: merged.continuation.option_limit
    });

    return createOutputAndAssert({
      taskType,
      resultStatus: 'limited',
      rankedOptions: [],
      comparison,
      nextActions,
      warnings: uniqWarnings(warnings),
      continuation: merged.continuation
    });
  }

  const targetCandidates = uniqueCandidates(resolved.target_resolutions.map((target) => target.candidate));
  const scored = score(targetCandidates, merged.continuation, {
    seedOptionKeys: resolved.target_resolutions.map((target) => target.option_key)
  });
  const rankedOptions = project(scored.scored_options, Math.min(MAX_OPTION_LIMIT, scored.scored_options.length));
  const comparison = compare({
    targetResolutions: resolved.target_resolutions,
    rankedOptions,
    scoredOptions: scored.scored_options
  });
  const nextActions = buildNextActions({
    taskType,
    resultStatus: 'ready',
    rankedOptions,
    comparison,
    optionLimit: merged.continuation.option_limit
  });
  const continuation = {
    ...merged.continuation,
    current_selection_key: comparison.outcome === 'clear_winner'
      ? rankedOptions[0]?.option_key || merged.continuation.current_selection_key
      : merged.continuation.current_selection_key
  };

  return createOutputAndAssert({
    taskType,
    resultStatus: 'ready',
    rankedOptions,
    comparison,
    nextActions,
    warnings: uniqWarnings([...warnings, ...scored.warnings]),
    continuation
  });
}

export function createDecisionDiscoveryAgent({
  retrieve = retrieveDiscoveryCandidates,
  resolveMention = resolveMentionToScenic,
  resolveOptionKey = resolveOptionKeyToScenicCandidate,
  score = scoreCandidates,
  project = projectRankedOptions,
  compare = buildComparison
} = {}) {
  return async function runDecisionDiscoveryAgent(payload = {}, { requestMeta = {} } = {}) {
    void requestMeta;

    const normalized = normalizeDiscoveryPayload(payload);

    if (!normalized.ok) {
      return createInvalidOutput({
        taskType: normalized.value.task_type,
        reasonCode: normalized.error_code
      });
    }

    const taskType = normalized.value.task_type;

    try {
      const merged = mergeDiscoveryContext(normalized.value);
      const warnings = [...merged.warnings];

      if (taskType === 'compare_options') {
        return await buildCompareResult({
          taskType,
          merged,
          resolveMention,
          resolveOptionKey,
          score,
          project,
          compare,
          warnings
        });
      }

      return await buildDiscoveryResult({
        taskType,
        merged,
        retrieve,
        score,
        project,
        warnings
      });
    } catch (error) {
      try {
        const fallback = createDiscoveryOutput({
          taskType,
          resultStatus: 'limited',
          warnings: [
            createWarning({
              code: 'database_retrieval_failed',
              scope: 'global',
              severity: 'warning'
            })
          ]
        });
        assertDiscoveryContract(fallback);
        return fallback;
      } catch (contractError) {
        return invalidAfterContractFailure(taskType, contractError || error);
      }
    }
  };
}

export const runDecisionDiscoveryAgent = createDecisionDiscoveryAgent();
