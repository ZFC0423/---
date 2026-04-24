function topOptionKeys(rankedOptions, limit = 3) {
  return rankedOptions.slice(0, limit).map((option) => option.option_key);
}

function action(action_type, payload = {}) {
  return {
    action_type,
    payload
  };
}

export function buildNextActions({
  taskType,
  resultStatus,
  rankedOptions = [],
  comparison = null,
  optionLimit = 3
} = {}) {
  void taskType;

  if (comparison?.outcome === 'missing_target') {
    const resolvedKeys = comparison.targets
      .filter((target) => target.resolution_status === 'resolved' && target.option_key)
      .map((target) => target.option_key);

    return [
      action('discovery.refine', {
        option_keys: resolvedKeys,
        option_limit: optionLimit
      })
    ];
  }

  if (resultStatus === 'invalid' || resultStatus === 'empty' || !rankedOptions.length) {
    return [];
  }

  const keys = topOptionKeys(rankedOptions, optionLimit);
  const actions = [
    action('knowledge.explain', {
      option_key: rankedOptions[0].option_key
    }),
    action('discovery.alternative', {
      current_selection_key: rankedOptions[0].option_key,
      option_limit: optionLimit
    })
  ];

  if (keys.length >= 2) {
    actions.push(action('discovery.compare', {
      option_keys: keys.slice(0, Math.min(4, keys.length))
    }));
  }

  actions.push(action('route_plan.generate', {
    option_keys: keys
  }));

  return actions;
}
