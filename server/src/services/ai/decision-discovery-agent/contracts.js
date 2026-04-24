export const DISCOVERY_CONTEXT_VERSION = 1;
export const DISCOVERY_SOURCE = 'decision_discovery_phase1';

export const TASK_TYPES = [
  'discover_options',
  'compare_options',
  'narrow_options',
  'suggest_alternatives'
];

export const RESULT_STATUSES = ['ready', 'limited', 'empty', 'invalid'];
export const FIT_LEVELS = ['high', 'medium', 'low'];
export const FIT_LEVEL_PRIORITY = { high: 3, medium: 2, low: 1 };
export const FIT_LEVEL_THRESHOLDS = {
  high: 80,
  medium: 65
};

export const COMPARISON_OUTCOMES = ['clear_winner', 'tie', 'missing_target'];
export const TARGET_RESOLUTION_STATUSES = ['resolved', 'missing', 'ambiguous'];
export const AXIS_CODES = [
  'theme_fit',
  'region_fit',
  'transport_fit',
  'walking_fit',
  'family_fit',
  'editorial_priority'
];
export const AXIS_OUTCOMES = ['single_best', 'tie', 'unavailable'];
export const AXIS_VALUE_CODES = [
  'strong_fit',
  'fit',
  'partial',
  'weak',
  'conflict',
  'unknown',
  'editorial_high',
  'editorial_medium',
  'editorial_low'
];

export const ACTION_TYPES = [
  'knowledge.explain',
  'route_plan.generate',
  'discovery.compare',
  'discovery.refine',
  'discovery.alternative'
];

export const TRAVEL_MODES = ['public_transport', 'self_drive', 'mixed'];
export const PACE_PREFERENCES = ['relaxed', 'normal', 'compact'];

export const PUBLIC_OUTPUT_FIELDS = [
  'task_type',
  'result_status',
  'ranked_options',
  'comparison',
  'next_actions',
  'warnings',
  'decision_context'
];
export const RANKED_OPTION_FIELDS = [
  'option_key',
  'entity_type',
  'entity_id',
  'rank',
  'display_name',
  'region',
  'category_id',
  'fit_score',
  'fit_level',
  'fit_reasons',
  'caution_reasons',
  'evidence_refs'
];
export const COMPARISON_FIELDS = ['outcome', 'targets', 'axes'];
export const TARGET_FIELDS = ['requested_text', 'resolution_status', 'resolution_reason', 'option_key'];
export const AXIS_FIELDS = ['axis_code', 'outcome', 'is_decisive', 'items'];
export const AXIS_ITEM_FIELDS = ['option_key', 'axis_rank', 'value_code', 'signal_codes'];
export const NEXT_ACTION_FIELDS = ['action_type', 'payload'];
export const WARNING_FIELDS = ['code', 'scope', 'field', 'option_key', 'severity'];
export const DECISION_CONTEXT_FIELDS = ['context_version', 'fingerprint', 'continuation'];
export const CONTINUATION_FIELDS = [
  'current_selection_key',
  'exclude_option_keys',
  'theme_preferences',
  'region_hints',
  'travel_mode',
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'time_budget',
  'pace_preference',
  'route_origin',
  'destination_scope',
  'option_limit'
];

export const FIT_REASON_CODES = [
  'theme_match',
  'region_match',
  'family_friendly_supported',
  'walking_intensity_match',
  'travel_mode_text_signal',
  'destination_scope_match',
  'explicit_mention_seed',
  'recommend_flag',
  'hot_score_signal'
];

export const CAUTION_REASON_CODES = [
  'walking_intensity_unknown',
  'walking_intensity_conflict',
  'family_friendly_unsupported',
  'transport_signal_limited',
  'transport_signal_conflict',
  'physical_constraint_conflict'
];

export const WARNING_CODES = [
  'context_fingerprint_mismatch',
  'transport_signal_limited',
  'route_origin_no_distance_scoring',
  'walking_intensity_unknown',
  'expanded_pool_used',
  'invalid_action_payload',
  'unsupported_task_type',
  'invalid_compare_target_count',
  'database_retrieval_failed',
  'option_key_not_found',
  'articles_evidence_not_supported_phase1'
];

export const SCENIC_REQUIRED_FIELDS = [
  'id',
  'name',
  'region',
  'category_id',
  'tags',
  'recommend_flag',
  'hot_score',
  'status'
];

export const SCENIC_OPTIONAL_FIELDS = [
  'cover_image',
  'intro',
  'culture_desc',
  'hero_caption',
  'route_label',
  'quote',
  'visit_mode',
  'walking_intensity',
  'family_friendly',
  'traffic_guide'
];

export const SCENIC_TEXT_FIELDS = [
  'name',
  'region',
  'tags',
  'intro',
  'culture_desc',
  'hero_caption',
  'route_label',
  'quote',
  'visit_mode',
  'walking_intensity',
  'traffic_guide'
];

export const CATEGORY_ATTRIBUTES = ['id', 'name', 'code', 'type'];
export const OPTION_KEY_PATTERN = /^scenic:(\d+)$/;
export const DEFAULT_OPTION_LIMIT = 3;
export const MIN_OPTION_LIMIT = 2;
export const MAX_OPTION_LIMIT = 5;

export const THEME_TERMS = Object.freeze({
  natural: ['natural', 'nature', 'forest', 'mountain', 'eco-tour', 'wellness', 'vacation'],
  red_culture: ['red_culture', 'red-culture', 'red', 'history', 'ruijin', 'long-march'],
  hakka_culture: ['hakka', 'culture', 'settlement', 'architecture', 'family'],
  heritage: ['heritage', 'history', 'old-city', 'grotto', 'bridge', 'engineering', 'opera'],
  food: ['food', 'snack', 'dish', 'local', 'hakka', 'old-city'],
  family: ['family', 'kids', 'wellness', 'culture'],
  photography: ['photo', 'photography', 'landmark', 'bridge', 'mountain', 'view']
});

export const THEME_CATEGORY_CODES = Object.freeze({
  natural: ['scenic_nature'],
  red_culture: ['red_culture'],
  hakka_culture: ['scenic_history', 'heritage'],
  heritage: ['scenic_history', 'heritage'],
  food: ['food'],
  family: ['scenic_nature', 'scenic_history'],
  photography: ['scenic_nature', 'scenic_history']
});

export function createDefaultContinuation() {
  return {
    current_selection_key: null,
    exclude_option_keys: [],
    theme_preferences: [],
    region_hints: [],
    travel_mode: null,
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    time_budget: null,
    pace_preference: null,
    route_origin: null,
    destination_scope: [],
    option_limit: DEFAULT_OPTION_LIMIT
  };
}

export function createWarning({
  code,
  scope = 'global',
  field = null,
  option_key = null,
  severity = 'warning'
}) {
  return {
    code,
    scope,
    field,
    option_key,
    severity
  };
}
