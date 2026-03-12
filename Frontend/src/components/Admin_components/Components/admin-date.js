const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T00:00:00`
    : raw.includes("T")
      ? raw
      : raw.replace(" ", "T");

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getRelativeDayLabel(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return "";
}

export function formatAdminDate(value, fallback = "N/A") {
  const date = parseDateValue(value);
  if (!date) return fallback;

  const relativeDayLabel = getRelativeDayLabel(date);
  return relativeDayLabel || DATE_FORMATTER.format(date);
}

export function formatAdminDateTime(value, fallback = "N/A") {
  const date = parseDateValue(value);
  if (!date) return fallback;

  const relativeDayLabel = getRelativeDayLabel(date);
  const timeLabel = TIME_FORMATTER.format(date);

  if (relativeDayLabel) {
    return `${relativeDayLabel} at ${timeLabel}`;
  }

  return `${DATE_FORMATTER.format(date)} at ${timeLabel}`;
}

export function formatAdminTime(value, fallback = "N/A") {
  const date = parseDateValue(value);
  if (!date) return fallback;
  return TIME_FORMATTER.format(date);
}

export function formatAdminRelativeTime(value, fallback = "just now") {
  const date = parseDateValue(value);
  if (!date) return fallback;

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 45) return "just now";

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (absSeconds >= secondsPerUnit) {
      return RELATIVE_FORMATTER.format(
        Math.round(diffSeconds / secondsPerUnit),
        unit,
      );
    }
  }

  return fallback;
}

export function formatAdminDateInput(value) {
  const date = parseDateValue(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAdminDateKey(value) {
  return formatAdminDateInput(value);
}
