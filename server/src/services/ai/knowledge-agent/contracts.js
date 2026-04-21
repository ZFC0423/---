export const KNOWLEDGE_TASK_TYPE = 'guide_understand';
export const KNOWLEDGE_NEXT_AGENT = 'ai_chat';

export const RETRIEVAL_STATUSES = ['hit', 'partial', 'empty'];
export const EVIDENCE_STATUSES = ['sufficient', 'insufficient', 'not_applicable'];

export const SCENIC_PRIMARY_FIELDS = ['intro', 'culture_desc'];
export const SCENIC_SECONDARY_FIELDS = ['hero_caption', 'quote'];
export const ARTICLE_PRIMARY_FIELDS = ['summary', 'content'];
export const ARTICLE_SECONDARY_FIELDS = ['quote'];

export const PRIMARY_EVIDENCE_FIELDS = {
  scenic: SCENIC_PRIMARY_FIELDS,
  article: ARTICLE_PRIMARY_FIELDS
};

export const SECONDARY_EVIDENCE_FIELDS = {
  scenic: SCENIC_SECONDARY_FIELDS,
  article: ARTICLE_SECONDARY_FIELDS
};

export const EVIDENCE_FIELD_ALLOWLIST = {
  scenic: [...SCENIC_PRIMARY_FIELDS, ...SCENIC_SECONDARY_FIELDS],
  article: [...ARTICLE_PRIMARY_FIELDS, ...ARTICLE_SECONDARY_FIELDS]
};

export const DISALLOWED_EVIDENCE_FIELDS = [
  'tips',
  'traffic_guide',
  'open_time',
  'ticket_info',
  'suggested_duration'
];

export const DIRECT_THEME_CATEGORY_CODES = {
  food: 'food',
  heritage: 'heritage',
  red_culture: 'red_culture'
};

export const WEAK_THEME_TERMS = {
  natural: ['natural', 'nature', 'forest', 'mountain', '自然', '山', '森林'],
  hakka_culture: ['hakka', '客家', '围屋', '擂茶'],
  family: ['family', '亲子', 'family-friendly'],
  photography: ['photography', '拍照', '摄影', 'photo']
};

export const REGION_ALIASES = {
  章贡: 'Zhanggong',
  安远: 'Anyuan',
  赣县: 'Ganxian',
  大余: 'Dayu',
  宁都: 'Ningdu',
  瑞金: 'Ruijin'
};

export const CONSTRAINT_PRIORITY = [
  'subject_entities',
  'scenic_hints',
  'theme_preferences',
  'region_hints',
  'user_query'
];

export const MAX_CITATIONS = 4;
export const MAX_EXCERPT_LENGTH = 180;

export const ALLOWED_BLOCK_TYPES = ['direct_answer', 'interpretation', 'context', 'uncertainty'];

export const ARTICLE_PATH_BY_CATEGORY = {
  food: '/food',
  heritage: '/heritage',
  red_culture: '/red-culture'
};

export function isPrimaryEvidenceField(sourceType, field) {
  return PRIMARY_EVIDENCE_FIELDS[sourceType]?.includes(field) || false;
}

export function isAllowedEvidenceField(sourceType, field) {
  return EVIDENCE_FIELD_ALLOWLIST[sourceType]?.includes(field) || false;
}

export function createEmptyKnowledgeOutput() {
  return {
    task_type: KNOWLEDGE_TASK_TYPE,
    retrieval_status: 'empty',
    evidence_status: 'not_applicable',
    answer: {
      lead_title: '',
      answer_blocks: [],
      uncertainty_note: null
    },
    evidence: {
      citations: [],
      gap_note: null
    }
  };
}
