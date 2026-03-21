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

function normalizeShippingUnicode(value) {
  const raw = String(value ?? '');
  if (!raw) return '';

  try {
    return raw.normalize('NFKC');
  } catch {
    return raw;
  }
}

function stripUnsafeUnicode(value) {
  return normalizeShippingUnicode(value)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\p{Cf}+/gu, '')
    .replace(/\p{M}+/gu, '');
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanShippingText(value) {
  return stripUnsafeUnicode(stripHtmlToText(value));
}

const STREET_ALLOWED_CHAR_PATTERN = /[^\p{L}\p{N}\s#.,'()\/-]/gu;
const STREET_ADDRESS_HINT_PATTERN =
  /\b(?:st(?:reet)?|rd|road|ave(?:nue)?|blvd|boulevard|lane|ln|drive|dr|unit|apt|apartment|suite|ste|room|rm|floor|flr|house|bldg|building|tower|blk|block|lot|phase|zone|purok|sitio|subd|subdivision|village|barangay|brgy|compound|ext(?:ension)?|corner|cor)\b/i;

export function sanitizeShippingText(value, maxLength = 160) {
  return collapseWhitespace(cleanShippingText(value)).slice(0, maxLength);
}

function sanitizeStreetAddress(value, maxLength = 160) {
  const normalized = cleanShippingText(value).replace(STREET_ALLOWED_CHAR_PATTERN, ' ');
  return collapseWhitespace(normalized).slice(0, maxLength);
}

function looksLikeStreetAddress(value) {
  const normalized = collapseWhitespace(value);
  if (!normalized) return false;

  const hasDigit = /\d/.test(normalized);
  const hasAddressHint = STREET_ADDRESS_HINT_PATTERN.test(normalized);
  return hasDigit || hasAddressHint;
}

export function sanitizeAddressOption(option = {}, options = {}) {
  const codeMaxLength = Number.isFinite(options.codeMaxLength) ? options.codeMaxLength : 40;
  const nameMaxLength = Number.isFinite(options.nameMaxLength) ? options.nameMaxLength : 120;
  const rawCode = typeof option === 'string'
    ? option
    : (option?.code ?? option?.id ?? option?.value ?? '');
  const rawName = typeof option === 'string'
    ? option
    : (
      option?.name ??
      option?.label ??
      option?.text ??
      option?.regionName ??
      option?.provinceName ??
      option?.cityName ??
      option?.municipalityName ??
      option?.barangayName ??
      ''
    );

  return {
    ...(typeof option === 'object' && option !== null && !Array.isArray(option) ? option : {}),
    code: sanitizeShippingText(rawCode, codeMaxLength),
    name: sanitizeShippingText(rawName, nameMaxLength),
  };
}

function sanitizePlainText(value, maxLength = 160) {
  return sanitizeShippingText(value, maxLength);
}

function sanitizeZipCode(value) {
  return cleanShippingText(value).replace(/\D+/g, '').slice(0, 4);
}

function sanitizePhoneNumber(value) {
  return collapseWhitespace(cleanShippingText(value))
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
  const streetSource =
    address?.street ??
    address?.street_address ??
    address?.streetAddress;
  const regionSource =
    address?.region ??
    '';
  const regionTextSource =
    address?.regionText ??
    address?.region_name ??
    address?.regionName ??
    '';
  const provinceSource =
    address?.province ??
    '';
  const provinceTextSource =
    address?.provinceText ??
    address?.province_name ??
    address?.provinceName ??
    provinceSource;
  const citySource =
    address?.city ??
    address?.city_municipality ??
    address?.cityMunicipality ??
    '';
  const cityTextSource =
    address?.cityText ??
    address?.city_text ??
    address?.city_name ??
    address?.cityName ??
    address?.city_municipality ??
    address?.cityMunicipality ??
    citySource;
  const barangaySource =
    address?.barangay ??
    '';
  const barangayTextSource =
    address?.barangayText ??
    address?.barangay_text ??
    address?.barangay_name ??
    address?.barangayName ??
    barangaySource;
  const zipSource =
    address?.zip ??
    address?.zip_code ??
    address?.zipCode;

  const sanitized = {
    ...address,
    street: sanitizeStreetAddress(streetSource, 160),
    region: sanitizePlainText(regionSource, 40),
    regionText: sanitizePlainText(regionTextSource, 120),
    province: sanitizePlainText(provinceSource, 120),
    provinceText: sanitizePlainText(provinceTextSource, 120),
    city: sanitizePlainText(citySource, 120),
    cityText: sanitizePlainText(cityTextSource, 120),
    barangay: sanitizePlainText(barangaySource, 120),
    barangayText: sanitizePlainText(barangayTextSource, 120),
    zip: sanitizeZipCode(zipSource),
  };

  if (typeof address?.street_address !== 'undefined') {
    sanitized.street_address = sanitized.street;
  }

  if (typeof address?.streetAddress !== 'undefined') {
    sanitized.streetAddress = sanitized.street;
  }

  if (typeof address?.region_name !== 'undefined') {
    sanitized.region_name = sanitized.regionText;
  }

  if (typeof address?.regionName !== 'undefined') {
    sanitized.regionName = sanitized.regionText;
  }

  if (typeof address?.province_name !== 'undefined') {
    sanitized.province_name = sanitized.provinceText;
  }

  if (typeof address?.provinceName !== 'undefined') {
    sanitized.provinceName = sanitized.provinceText;
  }

  if (typeof address?.city_municipality !== 'undefined') {
    sanitized.city_municipality = sanitized.city;
  }

  if (typeof address?.cityMunicipality !== 'undefined') {
    sanitized.cityMunicipality = sanitized.city;
  }

  if (typeof address?.city_name !== 'undefined') {
    sanitized.city_name = sanitized.cityText;
  }

  if (typeof address?.cityName !== 'undefined') {
    sanitized.cityName = sanitized.cityText;
  }

  if (typeof address?.barangay_name !== 'undefined') {
    sanitized.barangay_name = sanitized.barangayText;
  }

  if (typeof address?.barangayName !== 'undefined') {
    sanitized.barangayName = sanitized.barangayText;
  }

  if (typeof address?.zip_code !== 'undefined') {
    sanitized.zip_code = sanitized.zip;
  }

  if (typeof address?.zipCode !== 'undefined') {
    sanitized.zipCode = sanitized.zip;
  }

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
  } else if (!looksLikeStreetAddress(sanitized.street)) {
    errors.push({
      field: 'street',
      label: 'Street Address',
      message: 'Street Address must include a house number, street name, block/lot, unit, or a similar address detail.',
    });
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
