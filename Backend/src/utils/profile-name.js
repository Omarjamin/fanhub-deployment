function stripHtmlToText(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ");
}

function normalizeProfileNameUnicode(value) {
  const raw = String(value ?? "");
  if (!raw) return "";

  try {
    return raw.normalize("NFKC");
  } catch {
    return raw;
  }
}

function sanitizeProfileName(value, maxLength = 80) {
  return normalizeProfileNameUnicode(stripHtmlToText(value))
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\p{Cf}+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const NAME_CHAR_PATTERN = /^[\p{L} .'-]+$/u;
const NAME_TOKEN_PATTERN = /^(?:\p{L}\.?|\p{L}+(?:[.'-]\p{L}+)*\.?)$/u;

export function validateProfileName(value, options = {}) {
  const label = options?.label || "Full name";
  const sanitized = sanitizeProfileName(value);
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
