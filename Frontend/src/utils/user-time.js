const CLOCK_SKEW_TOLERANCE_MS = 12 * 60 * 60 * 1000;

function parseNumericTimestamp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const normalized = Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseUserTimestamp(value) {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    return parseNumericTimestamp(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
    return parseNumericTimestamp(raw);
  }

  const candidates = new Set([raw]);
  if (raw.includes(" ") && !raw.includes("T")) {
    candidates.add(raw.replace(" ", "T"));
  }
  [...candidates].forEach((candidate) => {
    if (/\.\d{4,}/.test(candidate)) {
      candidates.add(candidate.replace(/\.(\d{3})\d+/, ".$1"));
    }
  });

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function formatAbsoluteTimestamp(date, now = new Date()) {
  const sameYear = now.getFullYear() === date.getFullYear();

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

function looksLikeDateOnlyValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true;
  if (/T00:00(?::00(?:\.0+)?)?Z$/i.test(raw)) return true;
  if (/T00:00(?::00(?:\.0+)?)?(?:[+-]\d{2}:\d{2})$/i.test(raw)) return true;
  return false;
}

export function formatFriendlyDateTime(value, options = {}) {
  if (!value && value !== 0) return "";

  const date = parseUserTimestamp(value);
  if (!date) return "";

  const dateOnly = options.dateOnly ?? looksLikeDateOnlyValue(value);
  const useUtc = options.timeZone === "UTC" || (dateOnly && looksLikeDateOnlyValue(value));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(dateOnly
      ? {}
      : {
          hour: "numeric",
          minute: "2-digit",
        }),
    ...(useUtc ? { timeZone: "UTC" } : {}),
  }).format(date);
}

export function formatUserTimestamp(value) {
  if (!value) return "";

  const date = parseUserTimestamp(value);
  if (!date) return "";

  const now = new Date();
  const rawDiffMs = now.getTime() - date.getTime();
  if (rawDiffMs < 0 && Math.abs(rawDiffMs) > CLOCK_SKEW_TOLERANCE_MS) {
    return formatAbsoluteTimestamp(date, now);
  }

  const diffMs = rawDiffMs < 0 ? Math.abs(rawDiffMs) : rawDiffMs;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatAbsoluteTimestamp(date, now);
}
