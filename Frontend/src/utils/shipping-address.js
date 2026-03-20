function stripHtmlToText(value) {
  const html = String(value ?? '');
  if (!html) return '';

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  return html.replace(/<[^>]*>/g, ' ');
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizePlainText(value, maxLength = 160) {
  return collapseWhitespace(stripHtmlToText(value)).slice(0, maxLength);
}

function sanitizeZipCode(value) {
  return stripHtmlToText(value).replace(/\D+/g, '').slice(0, 4);
}

function sanitizePhoneNumber(value) {
  return collapseWhitespace(stripHtmlToText(value))
    .replace(/[^0-9+()\-\s]/g, '')
    .slice(0, 24);
}

function isNcrAddress(address = {}) {
  const regionValue = String(address?.regionText ?? address?.region ?? '')
    .trim()
    .toLowerCase();
  const regionCode = String(address?.region ?? '')
    .replace(/\D+/g, '')
    .trim();

  return (
    regionValue.includes('ncr') ||
    regionValue.includes('national capital region') ||
    regionValue.includes('metro manila') ||
    regionCode === '13' ||
    regionCode === '130000000'
  );
}

export function sanitizeShippingAddress(address = {}) {
  const sanitized = {
    ...address,
    street: sanitizePlainText(address?.street, 160),
    region: sanitizePlainText(address?.region, 40),
    regionText: sanitizePlainText(address?.regionText, 120),
    province: sanitizePlainText(address?.province, 120),
    provinceText: sanitizePlainText(address?.provinceText, 120),
    city: sanitizePlainText(address?.city, 120),
    cityText: sanitizePlainText(address?.cityText, 120),
    barangay: sanitizePlainText(address?.barangay, 120),
    barangayText: sanitizePlainText(address?.barangayText, 120),
    zip: sanitizeZipCode(address?.zip),
  };

  if (typeof address?.fullAddress !== 'undefined') {
    sanitized.fullAddress = sanitizePlainText(address.fullAddress, 260);
  }

  if (typeof address?.recipient_name !== 'undefined') {
    sanitized.recipient_name = sanitizePlainText(address.recipient_name, 120);
  }

  if (typeof address?.phone !== 'undefined') {
    sanitized.phone = sanitizePhoneNumber(address.phone);
  }

  return sanitized;
}

export function validateShippingAddress(address = {}, options = {}) {
  const sanitized = sanitizeShippingAddress(address);
  const requireProvince = typeof options.requireProvince === 'boolean'
    ? options.requireProvince
    : !isNcrAddress(sanitized);
  const errors = [];

  if (!sanitized.street) {
    errors.push({ field: 'street', label: 'Street Address', message: 'Street Address is required.' });
  } else if (sanitized.street.length < 5) {
    errors.push({ field: 'street', label: 'Street Address', message: 'Street Address must be at least 5 characters.' });
  }

  if (!sanitized.region) {
    errors.push({ field: 'region', label: 'Region', message: 'Region is required.' });
  }

  if (requireProvince && !sanitized.province) {
    errors.push({ field: 'province', label: 'Province', message: 'Province is required.' });
  }

  if (!sanitized.city) {
    errors.push({ field: 'city', label: 'City / Municipality', message: 'City / Municipality is required.' });
  }

  if (!sanitized.barangay) {
    errors.push({ field: 'barangay', label: 'Barangay', message: 'Barangay is required.' });
  }

  if (!sanitized.zip) {
    errors.push({ field: 'zip', label: 'ZIP Code', message: 'ZIP Code is required.' });
  } else if (!/^\d{4}$/.test(sanitized.zip)) {
    errors.push({ field: 'zip', label: 'ZIP Code', message: 'ZIP Code must be 4 digits.' });
  }

  return {
    sanitized,
    errors,
    isValid: errors.length === 0,
  };
}
