import { buildFallbackIntentResult } from './fallback.js';
import { extractIntentWithLlm } from './extract.js';
import { mergeWithPriorState, preprocessInput } from './preprocess.js';
import { validateAndNormalizeIntentResult } from './validate.js';

function mapFallbackReason(error) {
  if (!error) {
    return null;
  }

  if (['timeout', 'invalid_json', 'schema_violation', 'unsupported_task_type'].includes(error.code)) {
    return error.code;
  }

  return null;
}

export function createIntentRouter({ llmExtract = extractIntentWithLlm } = {}) {
  return async function routeIntent(payload = {}) {
    const preprocessed = preprocessInput(payload);

    try {
      const extracted = await llmExtract({
        normalizedInput: preprocessed.normalizedInput,
        priorState: preprocessed.priorState
      });

      const rawResult = extracted?.skipped
        ? buildFallbackIntentResult({
            normalizedInput: preprocessed.normalizedInput,
            fallbackReason: null,
            extraRuleHits: extracted?._meta?.rule_hits || []
          })
        : {
            ...extracted,
            _meta: {
              decision_source: 'llm',
              prior_state_usage: 'none',
              fallback_reason: null,
              missing_required_fields: [],
              rule_hits: extracted?._meta?.rule_hits || ['llm_result_received'],
              conflict_codes: extracted?._meta?.conflict_codes || [],
              fallback_resolution: null,
              model_name: extracted?._meta?.model_name || null,
              token_usage: extracted?._meta?.token_usage || 0
            }
          };

      const mergedResult = mergeWithPriorState(rawResult, preprocessed.priorState);

      return validateAndNormalizeIntentResult(mergedResult, {
        userQuery: preprocessed.normalizedInput
      });
    } catch (error) {
      const fallbackResult = buildFallbackIntentResult({
        normalizedInput: preprocessed.normalizedInput,
        fallbackReason: mapFallbackReason(error),
        extraRuleHits: error?.code ? [`fallback_due_to:${error.code}`] : []
      });
      const mergedFallback = mergeWithPriorState(fallbackResult, preprocessed.priorState);

      return validateAndNormalizeIntentResult(mergedFallback, {
        userQuery: preprocessed.normalizedInput
      });
    }
  };
}

export const routeIntent = createIntentRouter();
