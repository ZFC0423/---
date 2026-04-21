import {
  ARTICLE_PATH_BY_CATEGORY,
  EVIDENCE_FIELD_ALLOWLIST,
  MAX_CITATIONS,
  MAX_EXCERPT_LENGTH,
  createEmptyKnowledgeOutput,
  isPrimaryEvidenceField
} from './contracts.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function uniqStrings(items) {
  return Array.from(
    new Set(
      items
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
}

function buildPath(candidate) {
  if (candidate.source_type === 'scenic') {
    return `/scenic/${candidate.source_id}`;
  }

  const basePath = ARTICLE_PATH_BY_CATEGORY[candidate.category_code];
  return basePath ? `${basePath}/${candidate.source_id}` : null;
}

function getMatchedTerms(candidate, signals) {
  const matchedTerms = [];

  candidate.matched_by.forEach((key) => {
    if (key === 'user_query') {
      matchedTerms.push(...(signals.user_query_terms || []));
      return;
    }

    matchedTerms.push(...(signals[key] || []));
  });

  return uniqStrings(matchedTerms);
}

function shortenExcerpt(text, maxLength = MAX_EXCERPT_LENGTH) {
  const normalized = normalizeText(text).replace(/\s+/g, ' ');

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function buildExcerpt(fieldText, matchedTerms) {
  const normalized = normalizeText(fieldText).replace(/\s+/g, ' ');

  if (!normalized) {
    return '';
  }

  const lowerText = normalized.toLowerCase();
  const hitTerm = matchedTerms.find((term) => lowerText.includes(term.toLowerCase()));

  if (!hitTerm) {
    return shortenExcerpt(normalized);
  }

  const hitIndex = lowerText.indexOf(hitTerm.toLowerCase());
  const start = Math.max(0, hitIndex - 40);
  const end = Math.min(normalized.length, hitIndex + hitTerm.length + 100);
  return shortenExcerpt(normalized.slice(start, end), MAX_EXCERPT_LENGTH);
}

function chooseEvidenceField(candidate, matchedTerms) {
  const allowedFields = EVIDENCE_FIELD_ALLOWLIST[candidate.source_type] || [];

  for (const field of allowedFields) {
    const value = normalizeText(candidate.record?.[field]);

    if (!value) {
      continue;
    }

    if (matchedTerms.length && matchedTerms.some((term) => value.toLowerCase().includes(term.toLowerCase()))) {
      return field;
    }
  }

  return allowedFields.find((field) => normalizeText(candidate.record?.[field])) || null;
}

function buildCitation(candidate, signals) {
  const matchedTerms = getMatchedTerms(candidate, signals);
  const sourceField = chooseEvidenceField(candidate, matchedTerms);

  if (!sourceField) {
    return null;
  }

  const excerpt = buildExcerpt(candidate.record?.[sourceField], matchedTerms);

  if (!excerpt) {
    return null;
  }

  return {
    source_type: candidate.source_type,
    source_id: candidate.source_id,
    source_title: candidate.source_title,
    source_field: sourceField,
    excerpt,
    support_level: isPrimaryEvidenceField(candidate.source_type, sourceField) ? 'primary' : 'secondary',
    matched_by: candidate.matched_by,
    path: buildPath(candidate),
    source_label: candidate.source_label,
    author_label: candidate.author_label
  };
}

function deriveEvidenceStatus(retrievalStatus, citations) {
  if (retrievalStatus === 'empty') {
    return 'not_applicable';
  }

  if (!citations.length) {
    return 'insufficient';
  }

  const hasPrimary = citations.some((citation) => citation.support_level === 'primary');

  if (citations.length >= 2 && hasPrimary) {
    return 'sufficient';
  }

  return 'insufficient';
}

function deriveGapNote(retrievalStatus, evidenceStatus) {
  if (retrievalStatus === 'empty') {
    return '当前站内资料中没有检索到可直接支撑这个问题的内容。';
  }

  if (evidenceStatus === 'insufficient') {
    return '当前检索到的资料可以提供部分解释，但还不足以支持更确定的判断。';
  }

  return null;
}

export function buildEvidenceBundle({ retrievalResult } = {}) {
  const base = createEmptyKnowledgeOutput();
  const candidates = retrievalResult?.candidates || [];
  const signals = retrievalResult?.signals || {};
  const retrievalStatus = retrievalResult?.retrieval_status || 'empty';

  const citations = candidates
    .map((candidate) => buildCitation(candidate, signals))
    .filter(Boolean)
    .slice(0, MAX_CITATIONS);

  const evidenceStatus = deriveEvidenceStatus(retrievalStatus, citations);
  const gapNote = deriveGapNote(retrievalStatus, evidenceStatus);

  base.retrieval_status = retrievalStatus;
  base.evidence_status = evidenceStatus;
  base.evidence = {
    citations,
    gap_note: gapNote
  };

  return {
    ...base,
    selected_candidates: candidates.slice(0, MAX_CITATIONS)
  };
}
