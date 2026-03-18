import { connect, connectAdmin } from '../../core/database.js';

const LUZON_PROVINCES = new Set(
  [
    'abra', 'apayao', 'benguet', 'ifugao', 'kalinga', 'mountain province',
    'ilocos norte', 'ilocos sur', 'la union', 'pangasinan',
    'batanes', 'cagayan', 'isabela', 'nueva vizcaya', 'quirino',
    'aurora', 'bataan', 'bulacan', 'nueva ecija', 'pampanga', 'tarlac', 'zambales',
    'batangas', 'cavite', 'laguna', 'quezon', 'rizal',
    'marinduque', 'occidental mindoro', 'oriental mindoro', 'palawan', 'romblon',
    'albay', 'camarines norte', 'camarines sur', 'catanduanes', 'masbate', 'sorsogon',
    'metro manila', 'manila', 'quezon city', 'makati', 'taguig', 'pasig',
    'paraÃ±aque', 'paranaque', 'caloocan', 'las piÃ±as', 'las pinas',
    'mandaluyong', 'marikina', 'muntinlupa', 'navotas', 'malabon',
    'san juan', 'valenzuela',
  ],
);

const LUZON_RATES = [
  { maxKg: 0.5, fee: 95 },
  { maxKg: 1, fee: 120 },
  { maxKg: 3, fee: 190 },
  { maxKg: 5, fee: 280 },
  { maxKg: 10, fee: 380 },
];

const VISMIN_RATES = [
  { maxKg: 0.5, fee: 120 },
  { maxKg: 1, fee: 165 },
  { maxKg: 3, fee: 220 },
  { maxKg: 5, fee: 350 },
  { maxKg: 10, fee: 480 },
];

class ShippingRatesModel {
  tableName = 'site_province_shipping_regions';
  ratesTableName = 'shipping_region_rates';
  courierTableName = 'site_shipping_couriers';
  rulesTableName = 'site_shipping_rules';
  globalSlug = '__global__';
  defaultRates = { Luzon: 95, VisMin: 120 };

  constructor() {
    this.db = null;
    this.connect();
  }

  async connect() {
    this.db = await connect();
  }

  normalizeProvince(provinceName) {
    return String(provinceName || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  normalizeSiteSlug(value) {
    const raw = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    if (!raw || raw === 'all' || raw === 'global') return this.globalSlug;
    return raw;
  }

  normalizeCourier(value) {
    return String(value || '').trim();
  }

  normalizeRegion(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'luzon') return 'Luzon';
    if (normalized === 'vismin' || normalized === 'visayas' || normalized === 'mindanao') return 'VisMin';
    return 'All';
  }

  normalizeRate(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  normalizeInteger(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
  }

  normalizeBoundedNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  buildSlugCandidates(value = '') {
    const scoped = this.normalizeSiteSlug(value);
    const slugNoWebsite = scoped.replace(/-website$/i, '');
    const slugWithWebsite = scoped.endsWith('-website')
      ? scoped
      : `${scoped}-website`;
    return [...new Set([scoped, slugNoWebsite, slugWithWebsite, this.globalSlug])].filter(Boolean);
  }

  getGlobalOnlySlugCandidates() {
    return [this.globalSlug];
  }

  getSlugRank(siteSlug = '', candidates = []) {
    const normalized = this.normalizeSiteSlug(siteSlug);
    const foundIndex = candidates.findIndex((candidate) => candidate === normalized);
    return foundIndex === -1 ? candidates.length : foundIndex;
  }

  async ensureProvinceRegionTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INT(11) NOT NULL AUTO_INCREMENT,
        site_slug VARCHAR(120) NOT NULL,
        province_name VARCHAR(120) NOT NULL,
        shipping_region ENUM('Luzon','VisMin') NOT NULL DEFAULT 'VisMin',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_site_province_region (site_slug, province_name),
        KEY idx_site_slug (site_slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async ensureShippingRatesTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${this.ratesTableName} (
        region ENUM('Luzon','VisMin') NOT NULL,
        rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (region)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async ensureShippingCourierTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${this.courierTableName} (
        site_slug VARCHAR(120) NOT NULL,
        courier_name VARCHAR(120) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (site_slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async ensureShippingRulesTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${this.rulesTableName} (
        rule_id INT(11) NOT NULL AUTO_INCREMENT,
        site_slug VARCHAR(120) NOT NULL,
        shipping_region ENUM('All','Luzon','VisMin') NOT NULL DEFAULT 'All',
        max_weight_g INT(11) NOT NULL DEFAULT 0,
        max_length_cm DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        max_width_cm DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        max_height_cm DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        priority INT(11) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (rule_id),
        KEY idx_site_rule_lookup (site_slug, shipping_region, is_active, priority)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async getConfiguredRates() {
    try {
      const db = await connectAdmin();
      await this.ensureShippingRatesTable(db);
      const [rows] = await db.query(
        `SELECT region, rate FROM ${this.ratesTableName}`,
      );
      const out = { ...this.defaultRates };
      (rows || []).forEach((row) => {
        const region = String(row?.region || '').trim() === 'Luzon' ? 'Luzon' : 'VisMin';
        out[region] = this.normalizeRate(row?.rate, out[region] || 0);
      });
      return out;
    } catch (_) {
      return { ...this.defaultRates };
    }
  }

  async getRegionOverride(provinceName, communityType = '') {
    try {
      const db = await connectAdmin();
      await this.ensureProvinceRegionTable(db);
      const normalized = this.normalizeProvince(provinceName);
      const slugCandidates = this.getGlobalOnlySlugCandidates();
      const slugPlaceholders = slugCandidates.map(() => '?').join(', ');
      const [rows] = await db.query(
        `SELECT site_slug, shipping_region
         FROM ${this.tableName}
         WHERE site_slug IN (${slugPlaceholders})
           AND LOWER(TRIM(province_name)) = ?
         ORDER BY site_slug DESC
         LIMIT 10`,
        [...slugCandidates, normalized],
      );
      const orderedRows = (rows || []).sort(
        (left, right) =>
          this.getSlugRank(left?.site_slug, slugCandidates) -
          this.getSlugRank(right?.site_slug, slugCandidates),
      );
      const region = String(orderedRows?.[0]?.shipping_region || '').trim();
      if (!region) return null;
      return region === 'Luzon' ? 'Luzon' : 'VisMin';
    } catch (_) {
      return null;
    }
  }

  async detectRegion(provinceName, communityType = '') {
    const override = await this.getRegionOverride(provinceName, communityType);
    if (override) return override;
    const normalized = this.normalizeProvince(provinceName);
    return LUZON_PROVINCES.has(normalized) ? 'Luzon' : 'VisMin';
  }

  calculateLegacyShipping(totalWeightGrams, region, configuredRates = null) {
    const grams = Number(totalWeightGrams || 0);
    if (!Number.isFinite(grams) || grams <= 0) {
      return 0;
    }

    const weightKg = grams / 1000;
    const rates = region === 'Luzon' ? LUZON_RATES : VISMIN_RATES;
    const configuredBase = Number(configuredRates?.[region]);
    const defaultBase = Number(this.defaultRates?.[region] || rates?.[0]?.fee || 1);
    const factor =
      Number.isFinite(configuredBase) && configuredBase > 0 && defaultBase > 0
        ? configuredBase / defaultBase
        : 1;

    for (const tier of rates) {
      if (weightKg <= tier.maxKg) {
        return Math.round(tier.fee * factor);
      }
    }

    const lastTier = rates[rates.length - 1];
    const prevTier = rates[rates.length - 2] || lastTier;
    const tierWeightDelta = Number(lastTier.maxKg) - Number(prevTier.maxKg);
    const tierFeeDelta = Number(lastTier.fee) - Number(prevTier.fee);
    const extraPerKg =
      tierWeightDelta > 0 && Number.isFinite(tierFeeDelta)
        ? (tierFeeDelta / tierWeightDelta)
        : 0;

    const extraKg = Math.max(0, weightKg - Number(lastTier.maxKg || 0));
    const extraFee = extraPerKg > 0 ? Math.ceil(extraKg) * extraPerKg : 0;
    const overflowFee = Number(lastTier.fee || 0) + extraFee;
    return Math.round(overflowFee * factor);
  }

  async getSiteCourier(siteSlug = '') {
    try {
      const db = await connectAdmin();
      await this.ensureShippingCourierTable(db);
      const slugCandidates = this.getGlobalOnlySlugCandidates();
      const placeholders = slugCandidates.map(() => '?').join(', ');
      const [rows] = await db.query(
        `SELECT site_slug, courier_name, is_active
         FROM ${this.courierTableName}
         WHERE site_slug IN (${placeholders})
           AND is_active = 1`,
        slugCandidates,
      );

      const orderedRows = (rows || []).sort(
        (left, right) =>
          this.getSlugRank(left?.site_slug, slugCandidates) -
          this.getSlugRank(right?.site_slug, slugCandidates),
      );
      return this.normalizeCourier(orderedRows?.[0]?.courier_name);
    } catch (_) {
      return '';
    }
  }

  async getAdvancedRules(siteSlug = '') {
    try {
      const db = await connectAdmin();
      await this.ensureShippingRulesTable(db);
      const slugCandidates = this.getGlobalOnlySlugCandidates();
      const placeholders = slugCandidates.map(() => '?').join(', ');
      const [rows] = await db.query(
        `SELECT
           rule_id,
           site_slug,
           shipping_region,
           max_weight_g,
           max_length_cm,
           max_width_cm,
           max_height_cm,
           fee,
           priority,
           is_active
         FROM ${this.rulesTableName}
         WHERE site_slug IN (${placeholders})
           AND is_active = 1`,
        slugCandidates,
      );

      return (rows || [])
        .map((row) => ({
          rule_id: Number(row?.rule_id || 0) || null,
          site_slug: this.normalizeSiteSlug(row?.site_slug),
          shipping_region: this.normalizeRegion(row?.shipping_region),
          max_weight_g: this.normalizeInteger(row?.max_weight_g, 0),
          max_length_cm: this.normalizeBoundedNumber(row?.max_length_cm),
          max_width_cm: this.normalizeBoundedNumber(row?.max_width_cm),
          max_height_cm: this.normalizeBoundedNumber(row?.max_height_cm),
          fee: this.normalizeRate(row?.fee, 0),
          priority: this.normalizeInteger(row?.priority, 0),
        }))
        .sort((left, right) => {
          const siteRank = this.getSlugRank(left?.site_slug, slugCandidates) - this.getSlugRank(right?.site_slug, slugCandidates);
          if (siteRank !== 0) return siteRank;
          const priorityRank = this.normalizeInteger(left?.priority, 0) - this.normalizeInteger(right?.priority, 0);
          if (priorityRank !== 0) return priorityRank;
          const weightRank = this.normalizeInteger(left?.max_weight_g, 0) - this.normalizeInteger(right?.max_weight_g, 0);
          if (weightRank !== 0) return weightRank;
          return this.normalizeRate(left?.fee, 0) - this.normalizeRate(right?.fee, 0);
        });
    } catch (_) {
      return [];
    }
  }

  matchesBound(bound, actualValue) {
    if (!(Number(bound) > 0)) return true;
    return Number.isFinite(actualValue) && actualValue > 0 && actualValue <= Number(bound);
  }

  findMatchingRule(rules = [], payload = {}) {
    const region = this.normalizeRegion(payload.region);
    const weight = this.normalizeBoundedNumber(payload.totalWeightGrams);
    const length = this.normalizeBoundedNumber(payload.packageLengthCm);
    const width = this.normalizeBoundedNumber(payload.packageWidthCm);
    const height = this.normalizeBoundedNumber(payload.packageHeightCm);

    return (Array.isArray(rules) ? rules : []).find((rule) => {
      const ruleRegion = this.normalizeRegion(rule?.shipping_region);
      if (ruleRegion !== 'All' && ruleRegion !== region) return false;
      if (!this.matchesBound(rule?.max_weight_g, weight)) return false;
      if (!this.matchesBound(rule?.max_length_cm, length)) return false;
      if (!this.matchesBound(rule?.max_width_cm, width)) return false;
      if (!this.matchesBound(rule?.max_height_cm, height)) return false;
      return true;
    }) || null;
  }

  async getShippingFee(provinceName, totalWeightGrams = 0, communityType = '', options = {}) {
    const region = await this.detectRegion(provinceName, communityType);
    const configuredRates = await this.getConfiguredRates();
    const courier_name = await this.getSiteCourier(communityType);
    const advancedRules = await this.getAdvancedRules(communityType);
    const matchedRule = this.findMatchingRule(advancedRules, {
      region,
      totalWeightGrams,
      packageLengthCm: options.package_length_cm ?? options.length_cm,
      packageWidthCm: options.package_width_cm ?? options.width_cm,
      packageHeightCm: options.package_height_cm ?? options.height_cm,
    });

    if (matchedRule) {
      return {
        shipping_fee: this.normalizeRate(matchedRule.fee, 0),
        region,
        configured_rates: configuredRates,
        courier_name,
        source: 'advanced_rule',
        matched_rule: matchedRule,
      };
    }

    const shippingFee = this.calculateLegacyShipping(totalWeightGrams, region, configuredRates);
    return {
      shipping_fee: shippingFee,
      region,
      configured_rates: configuredRates,
      courier_name,
      source: 'legacy_weight_tiers',
      matched_rule: null,
    };
  }
}

export default ShippingRatesModel;
