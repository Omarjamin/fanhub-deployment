import { sanitizeCommunityText } from "./community-text.js";

const NAME_CHAR_PATTERN = /^[\p{L} .'-]+$/u;
const NAME_TOKEN_PATTERN = /^(?:\p{L}\.?|\p{L}+(?:[.'-]\p{L}+)*\.?)$/u;

function normalizeProfileFullname(value) {
  return sanitizeCommunityText(value, { maxLength: 80 })
    .replace(/\s+/g, " ")
    .trim();
}

export function validateProfileFullname(value, options = {}) {
  const label = options?.label || "Full name";
  const sanitized = normalizeProfileFullname(value);
  const errors = [];

  if (!sanitized) {
    errors.push(`${label} is required.`);
  }

  if (sanitized && sanitized.length < 4) {
    errors.push(`${label} is too short.`);
  }

  if (sanitized && !NAME_CHAR_PATTERN.test(sanitized)) {
    errors.push(`${label} can only contain letters, spaces, apostrophes, periods, and hyphens.`);
  }

  const parts = sanitized ? sanitized.split(" ").filter(Boolean) : [];
  if (parts.length < 2) {
    errors.push(`${label} must include at least a first name and last name.`);
  }

  if (parts.some((part) => !NAME_TOKEN_PATTERN.test(part))) {
    errors.push(`Please enter a valid ${label.toLowerCase()}.`);
  }

  return {
    sanitized,
    errors: Array.from(new Set(errors)),
    isValid: errors.length === 0,
  };
}
