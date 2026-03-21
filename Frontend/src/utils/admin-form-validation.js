import { sanitizeCommunityText } from './community-text.js';
import { sanitizeSearchQuery, validateSearchQuery } from './search-query.js';
import { showToast } from './toast.js';

const DOMAIN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRACKING_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s\-_/.:#]*$/;

export function getTrimmedValue(value = '') {
  return String(value ?? '').trim();
}

export function hasMinLength(value, minLength = 1) {
  return getTrimmedValue(value).length >= minLength;
}

export function sanitizeAdminText(value, { maxLength = null } = {}) {
  let normalized = sanitizeCommunityText(
    value,
    { maxLength: Number.isFinite(maxLength) && maxLength > 0 ? maxLength * 2 : null },
  ).replace(/\s+/g, ' ').trim();

  if (Number.isFinite(maxLength) && maxLength > 0) {
    normalized = normalized.slice(0, maxLength).trim();
  }

  return normalized;
}

export function sanitizeEmail(value, { maxLength = 254 } = {}) {
  return getTrimmedValue(value).slice(0, maxLength);
}

export function isValidEmail(value = '', { allowBlank = false } = {}) {
  const normalized = sanitizeEmail(value);
  if (!normalized) return allowBlank;
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

export function isValidSlug(value = '') {
  const normalized = getTrimmedValue(value).toLowerCase();
  return Boolean(normalized) && normalized.length <= 80 && DOMAIN_SLUG_PATTERN.test(normalized);
}

export function isValidHttpUrl(value = '') {
  const normalized = getTrimmedValue(value);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function isValidHexColor(value = '') {
  const normalized = getTrimmedValue(value);
  return !normalized || HEX_COLOR_PATTERN.test(normalized);
}

export function isNonNegativeNumber(value, { allowBlank = false, integer = false } = {}) {
  const normalized = getTrimmedValue(value);
  if (!normalized) return allowBlank;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return false;
  return integer ? Number.isInteger(numeric) : true;
}

export function isPositiveInteger(value, { allowBlank = false } = {}) {
  const normalized = getTrimmedValue(value);
  if (!normalized) return allowBlank;

  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric > 0;
}

export function sanitizeTrackingNumber(value, { maxLength = 120 } = {}) {
  return getTrimmedValue(value)
    .replace(/[^A-Za-z0-9\s\-_/.:#]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
    .trim();
}

export function isValidTrackingNumber(value = '', { allowBlank = false, minLength = 4, maxLength = 120 } = {}) {
  const normalized = sanitizeTrackingNumber(value, { maxLength });
  if (!normalized) return allowBlank;
  return normalized.length >= minLength
    && normalized.length <= maxLength
    && TRACKING_NUMBER_PATTERN.test(normalized);
}

export function sanitizeAdminSearch(value, { maxLength = 80 } = {}) {
  return sanitizeSearchQuery(value, { maxLength });
}

export function validateAdminSearch(value, options = {}) {
  return validateSearchQuery(value, options);
}

export function showValidationMessage(message = 'Please review the form and try again.') {
  showToast(message, 'error');
  return false;
}

function bindValidationReset(element) {
  if (!element || element.dataset.adminValidationBound === 'true') return;

  const clear = () => {
    try {
      element.setCustomValidity('');
    } catch (_) {}
  };

  element.addEventListener('input', clear);
  element.addEventListener('change', clear);
  element.dataset.adminValidationBound = 'true';
}

export function reportValidationError(element, message = 'Please review this field.') {
  if (!element || typeof element.setCustomValidity !== 'function') {
    return showValidationMessage(message);
  }

  bindValidationReset(element);

  try {
    element.setCustomValidity(message);
    element.reportValidity();
  } catch (_) {
    showToast(message, 'error');
  }

  try {
    element.focus({ preventScroll: false });
  } catch (_) {
    try {
      element.focus();
    } catch (_) {}
  }

  return false;
}
