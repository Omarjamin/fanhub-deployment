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
        'parañaque', 'paranaque', 'caloocan', 'las piñas', 'las pinas',
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

    normalizeRate(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
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
        const scoped = this.normalizeSiteSlug(communityType);
        if (!scoped) return null;

        try {
            const db = await connectAdmin();
            await this.ensureProvinceRegionTable(db);
            const normalized = this.normalizeProvince(provinceName);
            const slugNoWebsite = scoped.replace(/-website$/i, '');
            const slugWithWebsite = scoped.endsWith('-website')
                ? scoped
                : `${scoped}-website`;
            const slugCandidates = [...new Set([this.globalSlug, scoped, slugNoWebsite, slugWithWebsite])].filter(Boolean);
            const slugPlaceholders = slugCandidates.map(() => '?').join(', ');
            const [rows] = await db.query(
                `SELECT shipping_region
                 FROM ${this.tableName}
                 WHERE site_slug IN (${slugPlaceholders})
                   AND LOWER(TRIM(province_name)) = ?
                 LIMIT 1`,
                [...slugCandidates, normalized],
            );
            const region = String(rows?.[0]?.shipping_region || '').trim();
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

    calculateShipping(totalWeightGrams, region, configuredRates = null) {
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

        // For weights above max tier, continue charging using the last known per-kg step.
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

    /**
     * Weight-tier shipping calculator by province and total package weight.
     */
    async getShippingFee(provinceName, totalWeightGrams = 0, communityType = '') {
        const region = await this.detectRegion(provinceName, communityType);
        const configuredRates = await this.getConfiguredRates();
        const shippingFee = this.calculateShipping(totalWeightGrams, region, configuredRates);
        return {
            shipping_fee: shippingFee,
            region,
            configured_rates: configuredRates,
        };
    }
}

export default ShippingRatesModel;
