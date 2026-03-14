function normalizeNumericString(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const negative = raw.startsWith('-');
  const unsigned = raw
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');

  if (!unsigned) return '';

  const firstDotIndex = unsigned.indexOf('.');
  if (firstDotIndex === -1) {
    return `${negative ? '-' : ''}${unsigned}`;
  }

  const integerPart = unsigned.slice(0, firstDotIndex).replace(/\./g, '') || '0';
  const decimalPart = unsigned.slice(firstDotIndex + 1).replace(/\./g, '');
  return `${negative ? '-' : ''}${integerPart}.${decimalPart}`;
}

export function toSafeNumber(value, fallback = 0) {
  const normalized = normalizeNumericString(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toSafeInteger(value, fallback = 0) {
  return Math.round(toSafeNumber(value, fallback));
}

export function formatPHP(value) {
  return `PHP ${toSafeNumber(value, 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPeso(value) {
  return `${'\u20B1'}${toSafeNumber(value, 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
