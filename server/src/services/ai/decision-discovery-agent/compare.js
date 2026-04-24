import { AXIS_CODES } from './contracts.js';

function getAxisInput(option, axisCode) {
  return option.axes?.[axisCode] || {
    axis_score: 0,
    value_code: 'unknown',
    signal_codes: [],
    available: false
  };
}

function rankAxisItems(scoredOptions, axisCode) {
  const sorted = scoredOptions
    .map((option) => ({
      option,
      axis: getAxisInput(option, axisCode)
    }))
    .sort((left, right) => {
      if (right.axis.axis_score !== left.axis.axis_score) return right.axis.axis_score - left.axis.axis_score;
      return left.option.entity_id - right.option.entity_id;
    });
  let currentRank = 0;
  let previousScore = null;

  return sorted.map((item, index) => {
    if (previousScore === null || Math.abs(previousScore - item.axis.axis_score) >= 1) {
      currentRank = index + 1;
      previousScore = item.axis.axis_score;
    }

    return {
      option_key: item.option.option_key,
      axis_rank: currentRank,
      value_code: item.axis.value_code,
      signal_codes: item.axis.signal_codes || [],
      _axis_score: item.axis.axis_score,
      _available: item.axis.available
    };
  });
}

function buildAxis(scoredOptions, axisCode) {
  const ranked = rankAxisItems(scoredOptions, axisCode);
  const availableItems = ranked.filter((item) => item._available);

  if (!availableItems.length) {
    return {
      axis_code: axisCode,
      outcome: 'unavailable',
      is_decisive: false,
      items: ranked.map(({ _axis_score, _available, ...item }) => item)
    };
  }

  const first = ranked[0];
  const second = ranked[1] || null;
  const hasSingleBest = !second || first._axis_score - second._axis_score >= 1;
  const outcome = hasSingleBest ? 'single_best' : 'tie';
  const firstInput = getAxisInput(scoredOptions.find((option) => option.option_key === first.option_key), axisCode);
  const decisive = axisCode !== 'editorial_priority'
    && outcome === 'single_best'
    && first._axis_score >= 2
    && ['strong_fit', 'fit'].includes(firstInput.value_code);

  return {
    axis_code: axisCode,
    outcome,
    is_decisive: decisive,
    items: ranked.map(({ _axis_score, _available, ...item }) => item)
  };
}

function createMissingTargetComparison(targetResolutions) {
  return {
    outcome: 'missing_target',
    targets: targetResolutions.map((target) => ({
      requested_text: target.requested_text,
      resolution_status: target.resolution_status,
      resolution_reason: target.resolution_reason,
      option_key: target.option_key
    })),
    axes: []
  };
}

function getDecisiveWinner(axis) {
  if (!axis.is_decisive || !axis.items.length) {
    return null;
  }

  return axis.items[0].option_key;
}

export function buildComparison({ targetResolutions = [], rankedOptions = [], scoredOptions = [] } = {}) {
  const hasMissingTarget = targetResolutions.some((target) => target.resolution_status !== 'resolved');

  if (hasMissingTarget) {
    return createMissingTargetComparison(targetResolutions);
  }

  const targets = targetResolutions.map((target) => ({
    requested_text: target.requested_text,
    resolution_status: target.resolution_status,
    resolution_reason: target.resolution_reason,
    option_key: target.option_key
  }));
  const axes = AXIS_CODES.map((axisCode) => buildAxis(scoredOptions, axisCode));
  const decisiveWinners = Array.from(new Set(axes.map(getDecisiveWinner).filter(Boolean)));
  const margin = rankedOptions.length >= 2 ? rankedOptions[0].fit_score - rankedOptions[1].fit_score : 0;
  const topOptionKey = rankedOptions[0]?.option_key || null;
  const hasClearWinner = rankedOptions.length >= 2
    && margin >= 8
    && decisiveWinners.length === 1
    && decisiveWinners[0] === topOptionKey;

  return {
    outcome: hasClearWinner ? 'clear_winner' : 'tie',
    targets,
    axes
  };
}

export const DISCOVERY_COMPARE_PRIVATE = {
  buildAxis,
  rankAxisItems
};
