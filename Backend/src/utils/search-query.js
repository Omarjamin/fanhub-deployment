const SEARCH_QUERY_MAX_LENGTH = 80;

function stripDangerousMarkup(value) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\bjavascript\s*:/gi, ' ')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');
}

export function sanitizeSearchKeyword(value, { maxLength = SEARCH_QUERY_MAX_LENGTH } = {}) {
  let sanitized = stripDangerousMarkup(value)
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
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

export function validateSearchKeyword(value, options = {}) {
  const {
    label = 'Keyword',
    minLength = 1,
    maxLength = SEARCH_QUERY_MAX_LENGTH,
  } = options;

  const sanitized = sanitizeSearchKeyword(value, { maxLength });
  const normalized = sanitized.replace(/^#+/, '').trim();
  const errors = [];

  if (!normalized) {
    errors.push(`${label} is required.`);
  } else if (normalized.length < minLength) {
    errors.push(`${label} must be at least ${minLength} character${minLength === 1 ? '' : 's'}.`);
  } else if (!/[\p{L}\p{N}]/u.test(normalized)) {
    errors.push(`${label} must include at least one letter or number.`);
  }

  return {
    sanitized,
    normalized,
    errors,
    isValid: errors.length === 0,
  };
}

export { SEARCH_QUERY_MAX_LENGTH };
