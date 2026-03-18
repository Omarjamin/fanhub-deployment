import { api } from '../api.js';
import { authHeaders } from '../auth/auth.js';
import { toSafeNumber } from '../../../lib/number-format.js';

const CHECKOUT_DRAFT_EVENT = 'checkoutDraftUpdated';
const CHECKOUT_DRAFT_ENDPOINT = '/checkout-draft';

let checkoutDraftCache = null;
let checkoutDraftRequest = null;

function clone(value) {
  return value === null || typeof value === 'undefined'
    ? value
    : JSON.parse(JSON.stringify(value));
}

function toNumber(value, fallback = 0) {
  return toSafeNumber(value, fallback);
}

function clampStep(value) {
  const parsed = Math.round(toNumber(value, 1));
  return Math.min(3, Math.max(1, parsed));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function resolveItemWeightGrams(item) {
  const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
  return Number.isFinite(explicitWeight) && explicitWeight >= 0 ? explicitWeight : 0;
}

export function resolveItemLengthCm(item) {
  const explicitLength = Number(item?.length_cm ?? item?.lengthCm ?? item?.package_length_cm ?? item?.length);
  return Number.isFinite(explicitLength) && explicitLength >= 0 ? explicitLength : 0;
}

export function resolveItemWidthCm(item) {
  const explicitWidth = Number(item?.width_cm ?? item?.widthCm ?? item?.package_width_cm ?? item?.width);
  return Number.isFinite(explicitWidth) && explicitWidth >= 0 ? explicitWidth : 0;
}

export function resolveItemHeightCm(item) {
  const explicitHeight = Number(item?.height_cm ?? item?.heightCm ?? item?.package_height_cm ?? item?.height);
  return Number.isFinite(explicitHeight) && explicitHeight >= 0 ? explicitHeight : 0;
}

export function calculateCheckoutPackageMetrics(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  let packageLengthCm = 0;
  let packageWidthCm = 0;
  let packageHeightCm = 0;

  normalizedItems.forEach((item) => {
    const quantity = toNumber(item?.quantity ?? item?.qty, 0);
    const itemLengthCm = resolveItemLengthCm(item);
    const itemWidthCm = resolveItemWidthCm(item);
    const itemHeightCm = resolveItemHeightCm(item);

    packageLengthCm = Math.max(packageLengthCm, itemLengthCm);
    packageWidthCm = Math.max(packageWidthCm, itemWidthCm);
    packageHeightCm += itemHeightCm * quantity;
  });

  return {
    package_length_cm: packageLengthCm,
    package_width_cm: packageWidthCm,
    package_height_cm: packageHeightCm,
  };
}

export function calculateCheckoutSummary(items = [], shippingFee = 0) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const subtotal = normalizedItems.reduce((sum, item) => {
    const price = toNumber(item?.price ?? item?.display_price, 0);
    const quantity = toNumber(item?.quantity ?? item?.qty, 0);
    return sum + (price * quantity);
  }, 0);

  const totalWeightGrams = normalizedItems.reduce((sum, item) => {
    const quantity = toNumber(item?.quantity ?? item?.qty, 0);
    return sum + (resolveItemWeightGrams(item) * quantity);
  }, 0);
  const packageMetrics = calculateCheckoutPackageMetrics(normalizedItems);

  const normalizedShippingFee = Math.max(0, toNumber(shippingFee, 0));

  return {
    subtotal,
    shipping_fee: normalizedShippingFee,
    total_weight_grams: totalWeightGrams,
    ...packageMetrics,
    total: subtotal + normalizedShippingFee,
  };
}

export function createEmptyCheckoutDraft() {
  return {
    current_step: 1,
    checkout_items: [],
    summary_data: null,
    shipping_address: null,
    payment_data: null,
    shipping_fee: null,
    shipping_region: '',
    checkout_weight_grams: 0,
  };
}

export function normalizeCheckoutDraft(rawDraft = {}) {
  const baseDraft = createEmptyCheckoutDraft();
  const checkoutItems = Array.isArray(rawDraft?.checkout_items) ? rawDraft.checkout_items : [];
  const shippingFeeRaw = rawDraft?.shipping_fee ?? rawDraft?.shippingFee;
  const shippingFee = shippingFeeRaw === null || typeof shippingFeeRaw === 'undefined' || shippingFeeRaw === ''
    ? null
    : Math.max(0, toNumber(shippingFeeRaw, 0));
  const summarySource = isPlainObject(rawDraft?.summary_data)
    ? rawDraft.summary_data
    : (isPlainObject(rawDraft?.summaryData) ? rawDraft.summaryData : null);
  const fallbackSummary = calculateCheckoutSummary(
    checkoutItems,
    shippingFee ?? summarySource?.shipping_fee ?? summarySource?.shippingFee ?? 0,
  );
  const subtotal = toNumber(summarySource?.subtotal ?? summarySource?.sub_total, fallbackSummary.subtotal);
  const summaryShippingFee = toNumber(
    summarySource?.shipping_fee ?? summarySource?.shippingFee ?? shippingFee ?? fallbackSummary.shipping_fee,
    fallbackSummary.shipping_fee,
  );
  const checkoutWeightGrams = Math.max(
    0,
    Math.round(
      toNumber(
        rawDraft?.checkout_weight_grams ?? rawDraft?.checkoutWeightGrams ?? summarySource?.total_weight_grams,
        fallbackSummary.total_weight_grams,
      ),
    ),
  );

  return {
    ...baseDraft,
    current_step: clampStep(rawDraft?.current_step ?? rawDraft?.currentStep),
    checkout_items: checkoutItems,
    summary_data: {
      ...fallbackSummary,
      ...(summarySource || {}),
      subtotal,
      shipping_fee: summaryShippingFee,
      total_weight_grams: checkoutWeightGrams,
      total: subtotal + summaryShippingFee,
    },
    shipping_address: isPlainObject(rawDraft?.shipping_address)
      ? clone(rawDraft.shipping_address)
      : (isPlainObject(rawDraft?.shippingAddress) ? clone(rawDraft.shippingAddress) : null),
    payment_data: isPlainObject(rawDraft?.payment_data)
      ? clone(rawDraft.payment_data)
      : (isPlainObject(rawDraft?.paymentData) ? clone(rawDraft.paymentData) : null),
    shipping_fee: shippingFee,
    shipping_region: String(rawDraft?.shipping_region ?? rawDraft?.shippingRegion ?? '').trim(),
    checkout_weight_grams: checkoutWeightGrams,
  };
}

function getDraftEventPayload(source = 'sync') {
  return {
    draft: getCachedCheckoutDraft(),
    source,
  };
}

function dispatchCheckoutDraftUpdated(source = 'sync') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHECKOUT_DRAFT_EVENT, {
    detail: getDraftEventPayload(source),
  }));
}

async function parseDraftResponse(response, fallbackMessage = 'Failed to load checkout draft') {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }
  return normalizeCheckoutDraft(payload?.draft || {});
}

export function getCachedCheckoutDraft() {
  return clone(checkoutDraftCache || createEmptyCheckoutDraft());
}

export async function fetchCheckoutDraft(options = {}) {
  const { force = false } = options || {};

  if (!force && checkoutDraftCache) {
    return getCachedCheckoutDraft();
  }

  if (checkoutDraftRequest) {
    return checkoutDraftRequest;
  }

  checkoutDraftRequest = (async () => {
    const response = await api(CHECKOUT_DRAFT_ENDPOINT, {
      method: 'GET',
      headers: authHeaders(),
    });
    checkoutDraftCache = await parseDraftResponse(response, 'Failed to fetch checkout draft');
    dispatchCheckoutDraftUpdated('fetch');
    return getCachedCheckoutDraft();
  })();

  try {
    return await checkoutDraftRequest;
  } finally {
    checkoutDraftRequest = null;
  }
}

export async function saveCheckoutDraft(patch = {}) {
  const previousStep = getCachedCheckoutDraft().current_step;
  const response = await api(CHECKOUT_DRAFT_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(patch || {}),
  });

  checkoutDraftCache = await parseDraftResponse(response, 'Failed to save checkout draft');
  dispatchCheckoutDraftUpdated('save');
  if (checkoutDraftCache.current_step !== previousStep && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stepChanged'));
  }
  return getCachedCheckoutDraft();
}

export async function setCheckoutDraftStep(step) {
  return saveCheckoutDraft({ current_step: clampStep(step) });
}

export async function clearCheckoutDraft() {
  const previousStep = getCachedCheckoutDraft().current_step;
  const response = await api(CHECKOUT_DRAFT_ENDPOINT, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to clear checkout draft');
  }

  checkoutDraftCache = normalizeCheckoutDraft(payload?.draft || createEmptyCheckoutDraft());
  dispatchCheckoutDraftUpdated('clear');
  if (previousStep !== checkoutDraftCache.current_step && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stepChanged'));
  }

  return getCachedCheckoutDraft();
}

export function getCheckoutDraftEventName() {
  return CHECKOUT_DRAFT_EVENT;
}

export default {
  calculateCheckoutPackageMetrics,
  calculateCheckoutSummary,
  clearCheckoutDraft,
  createEmptyCheckoutDraft,
  fetchCheckoutDraft,
  getCachedCheckoutDraft,
  getCheckoutDraftEventName,
  normalizeCheckoutDraft,
  resolveItemHeightCm,
  resolveItemLengthCm,
  resolveItemWeightGrams,
  resolveItemWidthCm,
  saveCheckoutDraft,
  setCheckoutDraftStep,
};
