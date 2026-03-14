import { connect } from '../../core/database.js';

class CheckoutDraftModel {
  emptyDraft() {
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

  async ensureConnection(communityType = '') {
    return connect(communityType);
  }

  async ensureDraftTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS checkout_drafts (
        draft_id BIGINT(20) NOT NULL AUTO_INCREMENT,
        user_id INT(11) NOT NULL,
        community_id INT(11) NOT NULL DEFAULT 0,
        site_slug VARCHAR(120) NOT NULL DEFAULT '',
        current_step TINYINT(4) NOT NULL DEFAULT 1,
        checkout_items LONGTEXT NULL,
        summary_data LONGTEXT NULL,
        shipping_address LONGTEXT NULL,
        payment_data LONGTEXT NULL,
        shipping_fee DECIMAL(10,2) NULL DEFAULT NULL,
        shipping_region VARCHAR(255) NULL,
        checkout_weight_grams INT(11) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (draft_id),
        UNIQUE KEY uq_checkout_drafts_scope (user_id, community_id, site_slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  normalizeString(value, fallback = '') {
    const normalized = String(value || '').trim();
    return normalized || fallback;
  }

  normalizeNullableString(value) {
    const normalized = this.normalizeString(value);
    return normalized || null;
  }

  normalizeInteger(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
  }

  normalizeStep(value, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(3, Math.max(1, Math.round(parsed)));
  }

  normalizeNullableAmount(value) {
    if (value === null || typeof value === 'undefined' || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }

  parseJson(rawValue, fallback = null) {
    if (rawValue === null || typeof rawValue === 'undefined' || rawValue === '') {
      return fallback;
    }

    if (typeof rawValue === 'object') return rawValue;

    try {
      return JSON.parse(rawValue);
    } catch (_) {
      return fallback;
    }
  }

  stringifyJson(value) {
    if (value === null || typeof value === 'undefined') return null;
    return JSON.stringify(value);
  }

  normalizeCheckoutItems(items) {
    return Array.isArray(items) ? items : [];
  }

  normalizeSummaryData(summary, checkoutItems = [], shippingFee = null, fallbackWeight = 0) {
    if (summary === null || typeof summary === 'undefined') return null;

    const base = typeof summary === 'object' && !Array.isArray(summary) ? { ...summary } : {};
    const subtotal = Number(base.subtotal ?? base.sub_total ?? 0) || 0;
    const shipping = shippingFee ?? (Number(base.shipping_fee ?? base.shippingFee ?? base.shipping ?? 0) || 0);
    const totalWeight = this.normalizeInteger(
      base.total_weight_grams ?? base.totalWeightGrams ?? fallbackWeight,
      fallbackWeight,
    );

    return {
      ...base,
      subtotal,
      shipping_fee: shipping,
      total_weight_grams: totalWeight,
      total: subtotal + shipping,
    };
  }

  normalizeObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value;
  }

  normalizeDraft(row) {
    if (!row) return this.emptyDraft();

    const checkoutItems = this.normalizeCheckoutItems(this.parseJson(row.checkout_items, []));
    const shippingFee = this.normalizeNullableAmount(row.shipping_fee);
    const checkoutWeightGrams = this.normalizeInteger(row.checkout_weight_grams, 0);
    const summaryData = this.normalizeSummaryData(
      this.parseJson(row.summary_data, null),
      checkoutItems,
      shippingFee,
      checkoutWeightGrams,
    );

    return {
      current_step: this.normalizeStep(row.current_step, 1),
      checkout_items: checkoutItems,
      summary_data: summaryData,
      shipping_address: this.normalizeObject(this.parseJson(row.shipping_address, null)),
      payment_data: this.normalizeObject(this.parseJson(row.payment_data, null)),
      shipping_fee: shippingFee,
      shipping_region: this.normalizeString(row.shipping_region),
      checkout_weight_grams: checkoutWeightGrams,
      updated_at: row.updated_at || null,
    };
  }

  buildScope(userId, communityId, communityType = '') {
    return {
      userId: Number(userId) || 0,
      communityId: this.normalizeInteger(communityId, 0),
      siteSlug: this.normalizeString(communityType).toLowerCase(),
    };
  }

  async getDraftRow(db, userId, communityId, communityType = '') {
    const scope = this.buildScope(userId, communityId, communityType);

    const [rows] = await db.execute(
      `
        SELECT *
        FROM checkout_drafts
        WHERE user_id = ? AND community_id = ? AND site_slug = ?
        LIMIT 1
      `,
      [scope.userId, scope.communityId, scope.siteSlug],
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  async getDraft(userId, communityId, communityType = '') {
    const db = await this.ensureConnection(communityType);
    await this.ensureDraftTable(db);

    const row = await this.getDraftRow(db, userId, communityId, communityType);
    return this.normalizeDraft(row);
  }

  async saveDraft(userId, communityId, patch = {}, communityType = '') {
    const db = await this.ensureConnection(communityType);
    await this.ensureDraftTable(db);

    const existingDraft = await this.getDraft(userId, communityId, communityType);
    const scope = this.buildScope(userId, communityId, communityType);
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(patch || {}, key);

    const checkoutItems = hasOwn('checkout_items')
      ? this.normalizeCheckoutItems(patch.checkout_items)
      : existingDraft.checkout_items;
    const shippingFee = hasOwn('shipping_fee')
      ? this.normalizeNullableAmount(patch.shipping_fee)
      : existingDraft.shipping_fee;
    const checkoutWeightGrams = hasOwn('checkout_weight_grams')
      ? this.normalizeInteger(patch.checkout_weight_grams, 0)
      : existingDraft.checkout_weight_grams;
    const summaryData = hasOwn('summary_data')
      ? this.normalizeSummaryData(patch.summary_data, checkoutItems, shippingFee, checkoutWeightGrams)
      : this.normalizeSummaryData(
          existingDraft.summary_data,
          checkoutItems,
          shippingFee,
          checkoutWeightGrams,
        );

    const nextDraft = {
      current_step: hasOwn('current_step')
        ? this.normalizeStep(patch.current_step, existingDraft.current_step)
        : existingDraft.current_step,
      checkout_items: checkoutItems,
      summary_data: summaryData,
      shipping_address: hasOwn('shipping_address')
        ? this.normalizeObject(patch.shipping_address)
        : existingDraft.shipping_address,
      payment_data: hasOwn('payment_data')
        ? this.normalizeObject(patch.payment_data)
        : existingDraft.payment_data,
      shipping_fee: shippingFee,
      shipping_region: hasOwn('shipping_region')
        ? this.normalizeString(patch.shipping_region)
        : existingDraft.shipping_region,
      checkout_weight_grams: checkoutWeightGrams,
    };

    await db.execute(
      `
        INSERT INTO checkout_drafts (
          user_id,
          community_id,
          site_slug,
          current_step,
          checkout_items,
          summary_data,
          shipping_address,
          payment_data,
          shipping_fee,
          shipping_region,
          checkout_weight_grams
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          current_step = VALUES(current_step),
          checkout_items = VALUES(checkout_items),
          summary_data = VALUES(summary_data),
          shipping_address = VALUES(shipping_address),
          payment_data = VALUES(payment_data),
          shipping_fee = VALUES(shipping_fee),
          shipping_region = VALUES(shipping_region),
          checkout_weight_grams = VALUES(checkout_weight_grams)
      `,
      [
        scope.userId,
        scope.communityId,
        scope.siteSlug,
        nextDraft.current_step,
        this.stringifyJson(nextDraft.checkout_items),
        this.stringifyJson(nextDraft.summary_data),
        this.stringifyJson(nextDraft.shipping_address),
        this.stringifyJson(nextDraft.payment_data),
        nextDraft.shipping_fee,
        nextDraft.shipping_region || null,
        nextDraft.checkout_weight_grams,
      ],
    );

    return this.getDraft(userId, communityId, communityType);
  }

  async clearDraft(userId, communityId, communityType = '') {
    const db = await this.ensureConnection(communityType);
    await this.ensureDraftTable(db);

    const scope = this.buildScope(userId, communityId, communityType);
    await db.execute(
      `
        DELETE FROM checkout_drafts
        WHERE user_id = ? AND community_id = ? AND site_slug = ?
      `,
      [scope.userId, scope.communityId, scope.siteSlug],
    );

    return this.emptyDraft();
  }
}

export default new CheckoutDraftModel();
