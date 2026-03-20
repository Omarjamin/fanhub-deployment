const dimensionNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function toPositiveDimension(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return numericValue;
}

function formatDimensionValue(value) {
  return dimensionNumberFormatter.format(toPositiveDimension(value));
}

export function formatPackageDimensions(length = 0, width = 0, height = 0, options = {}) {
  const resolvedLength = toPositiveDimension(length);
  const resolvedWidth = toPositiveDimension(width);
  const resolvedHeight = toPositiveDimension(height);
  const emptyLabel = Object.prototype.hasOwnProperty.call(options, "emptyLabel")
    ? options.emptyLabel
    : "";
  const showAxisLabels = options.showAxisLabels !== false;

  if (resolvedLength <= 0 && resolvedWidth <= 0 && resolvedHeight <= 0) {
    return emptyLabel;
  }

  const dimensionLabel = `${formatDimensionValue(resolvedLength)} × ${formatDimensionValue(resolvedWidth)} × ${formatDimensionValue(resolvedHeight)} cm`;
  return showAxisLabels ? `${dimensionLabel} (L × W × H)` : dimensionLabel;
}
