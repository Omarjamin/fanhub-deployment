import { sanitizeCommunityText } from './community-text.js';

export const SEARCH_QUERY_MAX_LENGTH = 80;

export function sanitizeSearchQuery(value, { maxLength = SEARCH_QUERY_MAX_LENGTH } = {}) {
  let sanitized = sanitizeCommunityText(value, { maxLength: Number(maxLength || 0) > 0 ? maxLength * 2 : null })
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.startsWith('#')) {
    sanitized = `#${sanitized.replace(/^#+/, '').trimStart()}`;
  }

  if (Number.isFinite(maxLength) && maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength).trim();
  }

  return sanitized;
}

export function validateSearchQuery(value, { minLength = 1, maxLength = SEARCH_QUERY_MAX_LENGTH } = {}) {
  const sanitized = sanitizeSearchQuery(value, { maxLength });
  const normalized = sanitized.replace(/^#+/, '').trim();
  const errors = [];

  if (!normalized) {
    errors.push('Please enter a search term.');
  } else if (normalized.length < minLength) {
    errors.push(`Search term must be at least ${minLength} character${minLength === 1 ? '' : 's'}.`);
  } else if (!/[\p{L}\p{N}]/u.test(normalized)) {
    errors.push('Search term must include at least one letter or number.');
  }

  return {
    sanitized,
    normalized,
    isValid: errors.length === 0,
    errors,
  };
}
