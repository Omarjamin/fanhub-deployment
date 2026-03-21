export const IMAGE_UPLOAD_ACCEPT_ATTR = ".jpg,.jpeg,.png,image/jpeg,image/png";
export const IMAGE_UPLOAD_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
]);
export const DEFAULT_IMAGE_UPLOAD_MAX_FILES = 1;
export const DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function normalizeFiles(filesOrList) {
  if (!filesOrList) return [];
  if (Array.isArray(filesOrList)) {
    return filesOrList.filter(Boolean);
  }
  return Array.from(filesOrList).filter(Boolean);
}

function formatLimitSize(bytes) {
  const valueInMb = bytes / (1024 * 1024);
  return Number.isInteger(valueInMb) ? `${valueInMb}MB` : `${valueInMb.toFixed(1)}MB`;
}

function isAllowedImageFile(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type && IMAGE_UPLOAD_ALLOWED_TYPES.has(type)) {
    return true;
  }

  const fileName = String(file?.name || "").trim().toLowerCase();
  return /\.(jpe?g|png)$/.test(fileName);
}

export function validateImageFiles(filesOrList, options = {}) {
  const files = normalizeFiles(filesOrList);
  const maxFiles = Number.isFinite(options.maxFiles)
    ? options.maxFiles
    : DEFAULT_IMAGE_UPLOAD_MAX_FILES;
  const maxSizeBytes = Number.isFinite(options.maxSizeBytes)
    ? options.maxSizeBytes
    : DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES;
  const label = String(options.label || "Image").trim() || "Image";

  if (!files.length) {
    return { isValid: true, files: [] };
  }

  if (files.length > maxFiles) {
    return {
      isValid: false,
      files,
      errorMessage: maxFiles === 1
        ? `Only 1 ${label.toLowerCase()} can be uploaded at a time.`
        : `Only ${maxFiles} ${label.toLowerCase()} files can be uploaded at a time.`,
    };
  }

  const invalidTypeFile = files.find((file) => !isAllowedImageFile(file));
  if (invalidTypeFile) {
    return {
      isValid: false,
      files,
      errorMessage: "Only JPEG and PNG images are allowed.",
    };
  }

  const oversizedFile = files.find((file) => Number(file?.size || 0) > maxSizeBytes);
  if (oversizedFile) {
    return {
      isValid: false,
      files,
      errorMessage: `${label} must be ${formatLimitSize(maxSizeBytes)} or smaller.`,
    };
  }

  return { isValid: true, files };
}

export function validateSingleImageFile(file, options = {}) {
  const result = validateImageFiles(file ? [file] : [], {
    ...options,
    maxFiles: 1,
  });
  return {
    ...result,
    file: result.files?.[0] || null,
  };
}
