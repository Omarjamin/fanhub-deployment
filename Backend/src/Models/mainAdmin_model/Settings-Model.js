import { connectAdmin, connect, resolveCommunityContext } from '../../core/database.js';

class SettingsModel {
  tableName = 'site_province_shipping_regions';
  ratesTableName = 'shipping_region_rates';
  courierTableName = 'site_shipping_couriers';
  rulesTableName = 'site_shipping_rules';
  globalSlug = '__global__';

  normalizeSiteSlug(value) {
    const raw = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    if (!raw || raw === 'all' || raw === 'global') return this.globalSlug;
    return raw;
  }

  async hasAdminTable(db, tableName) {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    return Array.isArray(rows) && rows.length > 0;
  }

  async getAdminTableColumns(db, tableName) {
    if (!await this.hasAdminTable(db, tableName)) return new Set();
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
  }

  async resolveCommunityIdByTable(siteSlug = '') {
    const scoped = this.normalizeSiteSlug(siteSlug);
    if (!scoped || scoped === this.globalSlug) return null;
    const numeric = Number(scoped);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    try {
      const adminDB = await connectAdmin();
      const hasCommunityTable = await this.hasAdminTable(adminDB, 'community_table');
      if (!hasCommunityTable) return null;

      const communityCols = await this.getAdminTableColumns(adminDB, 'communities');
      const hasCommunities = communityCols.size > 0;
      const communityPk = communityCols.has('community_id')
        ? 'community_id'
        : (communityCols.has('id') ? 'id' : null);
      const hasCommunityName = communityCols.has('name');

      let query = `SELECT ct.community_id FROM community_table ct `;
      const params = [];
      if (hasCommunities && communityPk) {
        query += `LEFT JOIN communities c ON c.${communityPk} = ct.community_id `;
      }
      query += `
        WHERE LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
           OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
      `;
      params.push(scoped, scoped);

      if (!scoped.endsWith('-website')) {
        query += ` OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?)) `;
        params.push(`${scoped}-website`);
      } else {
        const trimmed = scoped.replace(/-website$/, '');
        query += `
          OR LOWER(TRIM(ct.domain)) = LOWER(TRIM(?))
          OR LOWER(TRIM(ct.site_name)) = LOWER(TRIM(?))
        `;
        params.push(trimmed, trimmed);
      }

      if (hasCommunities && hasCommunityName && communityPk) {
        query += ` OR LOWER(TRIM(c.name)) = LOWER(TRIM(?)) `;
        params.push(scoped);
      }
      query += ` LIMIT 1 `;

      const [rows] = await adminDB.query(query, params);
      const communityId = Number(rows?.[0]?.community_id || 0);
      return communityId > 0 ? communityId : null;
    } catch (_) {
      return null;
    }
  }

  resolvePreferredCommunityId(options = {}) {
    const preferredCommunityId = Number(options?.preferredCommunityId || 0);
    return Number.isFinite(preferredCommunityId) && preferredCommunityId > 0
      ? preferredCommunityId
      : null;
  }

  async resolveScopedCommunityId(siteSlug = '', options = {}) {
    const scoped = this.normalizeSiteSlug(siteSlug);
    if (!scoped || scoped === this.globalSlug) return null;

    return (
      this.resolvePreferredCommunityId(options) ||
      await this.resolveCommunityIdByTable(scoped) ||
      Number((await resolveCommunityContext(scoped))?.community_id || 0) ||
      null
    );
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

  normalizeProvince(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  normalizeRegion(value) {
    return String(value || '').trim().toLowerCase() === 'luzon' ? 'Luzon' : 'VisMin';
  }

  normalizeRate(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  normalizeCourier(value) {
    return String(value || '').trim();
  }

  normalizeRuleRegion(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'luzon') return 'Luzon';
    if (normalized === 'vismin' || normalized === 'visayas' || normalized === 'mindanao') return 'VisMin';
    return 'All';
  }

  normalizeBoundedNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  normalizeInteger(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
  }

  normalizeShippingRule(rawRule = {}, index = 0) {
    if (!rawRule || typeof rawRule !== 'object' || Array.isArray(rawRule)) return null;

    const rule = {
      shipping_region: this.normalizeRuleRegion(rawRule.shipping_region ?? rawRule.region),
      max_weight_g: this.normalizeInteger(rawRule.max_weight_g ?? rawRule.maxWeightG ?? rawRule.maxWeight ?? rawRule.weight_g, 0),
      max_length_cm: this.normalizeBoundedNumber(rawRule.max_length_cm ?? rawRule.maxLengthCm ?? rawRule.length_cm ?? rawRule.length, 0),
      max_width_cm: this.normalizeBoundedNumber(rawRule.max_width_cm ?? rawRule.maxWidthCm ?? rawRule.width_cm ?? rawRule.width, 0),
      max_height_cm: this.normalizeBoundedNumber(rawRule.max_height_cm ?? rawRule.maxHeightCm ?? rawRule.height_cm ?? rawRule.height, 0),
      fee: this.normalizeRate(rawRule.fee ?? rawRule.shipping_fee ?? rawRule.rate, 0),
      priority: this.normalizeInteger(rawRule.priority, index + 1),
      is_active: rawRule.is_active === false || rawRule.is_active === 0 ? 0 : 1,
    };

    const hasBound =
      rule.max_weight_g > 0 ||
      rule.max_length_cm > 0 ||
      rule.max_width_cm > 0 ||
      rule.max_height_cm > 0;
    if (!hasBound) return null;
    if (!(rule.fee >= 0)) return null;

    return rule;
  }

  buildSiteSlugVariants(value) {
    const normalized = this.normalizeSiteSlug(value);
    if (!normalized || normalized === this.globalSlug) return [];

    const variants = new Set([normalized]);
    const withoutWebsite = normalized.replace(/-website$/i, '');
    if (withoutWebsite) variants.add(withoutWebsite);
    if (!/-website$/i.test(normalized)) variants.add(`${normalized}-website`);
    return Array.from(variants).filter(Boolean);
  }

  async resolveStrictSiteDb(siteSlug) {
    const variants = this.buildSiteSlugVariants(siteSlug);
    if (!variants.length) throw new Error('site/community is required');

    let lastError = null;

    for (const candidate of variants) {
      try {
        const db = await connect(candidate);
        return db;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    throw new Error(`Site DB not resolved for "${siteSlug}"`);
  }

  async resolveWritableEventDb(siteSlug) {
    try {
      return await this.resolveStrictSiteDb(siteSlug);
    } catch (strictError) {
      try {
        return await connect();
      } catch (_) {
        throw strictError;
      }
    }
  }

  async readEventRows(db, scopedCommunityId = null, options = {}) {
    const includeEmpty = options?.includeEmpty === true;
    await this.ensureEventColumns(db);
    const columns = await this.getTableColumns(db, 'events');
    const hasEventName = Boolean(columns.event_name);
    const nameSelect = hasEventName ? ', event_name' : '';
    const hasGroupCommunityId = Boolean(columns.group_community_id);
    const hasCommunityId = Boolean(columns.community_id);
    const scopeColumn = hasGroupCommunityId ? 'group_community_id' : (hasCommunityId ? 'community_id' : null);
    if (scopeColumn && !scopedCommunityId) {
      return [];
    }
    const scopeWhere = scopeColumn && scopedCommunityId ? ` AND COALESCE(${scopeColumn}, 0) = ?` : '';
    const params = scopeWhere ? [scopedCommunityId] : [];
    const visibilityWhere = includeEmpty
      ? ''
      : ` AND (COALESCE(ticket_link, '') <> '' OR COALESCE(image_url, '') <> '')`;
    const [rows] = await db.query(
      `SELECT event_id, ticket_link, image_url${nameSelect}
       FROM events
       WHERE 1=1${visibilityWhere}${scopeWhere}
       ORDER BY event_id ASC`,
      params,
    );
    return rows || [];
  }

  async getTableColumns(db, tableName) {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [tableName],
    );
    const map = {};
    (rows || []).forEach((row) => {
      const key = String(row?.COLUMN_NAME || '').trim().toLowerCase();
      if (!key) return;
      map[key] = {
        isNullable: String(row?.IS_NULLABLE || '').toUpperCase() === 'YES',
        hasDefault: row?.COLUMN_DEFAULT !== null && row?.COLUMN_DEFAULT !== undefined,
      };
    });
    return map;
  }

  normalizePosterPayload(rawPoster = {}, index = 0) {
    const rawEventId = Number(rawPoster?.event_id || 0);
    const rawSlotId = String(rawPoster?.id ?? '').trim();
    const matchedSlotId = rawSlotId.match(/(\d+)/);
    const slot_id = matchedSlotId ? Number(matchedSlotId[1]) : index + 1;
    const event_id = Number.isFinite(rawEventId) && rawEventId > 0 ? rawEventId : null;

    return {
      event_id,
      slot_id: Number.isFinite(slot_id) && slot_id > 0 ? slot_id : index + 1,
      title: String(rawPoster?.title || `Event ${index + 1}`).trim() || `Event ${index + 1}`,
      ticket_link: String(rawPoster?.href ?? rawPoster?.ticket_link ?? '').trim(),
      image_url: String(rawPoster?.image ?? rawPoster?.image_url ?? '').trim(),
    };
  }

  async ensureEventColumns(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        event_id INT(11) NOT NULL AUTO_INCREMENT,
        ticket_link TEXT NOT NULL,
        image_url VARCHAR(255) NULL,
        PRIMARY KEY (event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    const columns = await this.getTableColumns(db, 'events');
    if (!columns.ticket_link) {
      await db.query(`ALTER TABLE events ADD COLUMN ticket_link TEXT NULL`);
    }
    if (!columns.image_url) {
      await db.query(`ALTER TABLE events ADD COLUMN image_url VARCHAR(255) NULL`);
    }
  }

  async getShippingRegions(communityType) {
    const scoped = this.normalizeSiteSlug(communityType);
    if (!scoped) throw new Error('community is required');
    const db = await connectAdmin();
    await this.ensureProvinceRegionTable(db);
    await this.ensureShippingRatesTable(db);
    await this.ensureShippingCourierTable(db);
    await this.ensureShippingRulesTable(db);

    const [rows] = await db.query(
      `SELECT province_name, shipping_region
       FROM ${this.tableName}
       WHERE site_slug = ?
       ORDER BY province_name ASC`,
      [scoped],
    );

    const province_regions = {};
    (rows || []).forEach((row) => {
      const province = this.normalizeProvince(row?.province_name);
      if (!province) return;
      province_regions[province] = this.normalizeRegion(row?.shipping_region);
    });

    const [rateRows] = await db.query(
      `SELECT region, rate FROM ${this.ratesTableName}`,
    );
    const shipping_rates = {
      Luzon: 95,
      VisMin: 120,
    };
    (rateRows || []).forEach((row) => {
      const region = this.normalizeRegion(row?.region);
      shipping_rates[region] = this.normalizeRate(row?.rate, shipping_rates[region] || 0);
    });

    const [courierRows] = await db.query(
      `SELECT courier_name, is_active
       FROM ${this.courierTableName}
       WHERE site_slug = ?
       LIMIT 1`,
      [scoped],
    );
    const courier_name = this.normalizeCourier(courierRows?.[0]?.courier_name);
    const courier_active = Number(courierRows?.[0]?.is_active || 0) === 1;

    const [ruleRows] = await db.query(
      `SELECT
         rule_id,
         shipping_region,
         max_weight_g,
         max_length_cm,
         max_width_cm,
         max_height_cm,
         fee,
         priority,
         is_active
       FROM ${this.rulesTableName}
       WHERE site_slug = ?
       ORDER BY priority ASC, rule_id ASC`,
      [scoped],
    );

    const shipping_rules = (ruleRows || []).map((row) => ({
      rule_id: Number(row?.rule_id || 0) || null,
      shipping_region: this.normalizeRuleRegion(row?.shipping_region),
      max_weight_g: this.normalizeInteger(row?.max_weight_g, 0),
      max_length_cm: this.normalizeBoundedNumber(row?.max_length_cm, 0),
      max_width_cm: this.normalizeBoundedNumber(row?.max_width_cm, 0),
      max_height_cm: this.normalizeBoundedNumber(row?.max_height_cm, 0),
      fee: this.normalizeRate(row?.fee, 0),
      priority: this.normalizeInteger(row?.priority, 0),
      is_active: Number(row?.is_active || 0) === 1,
    }));

    return {
      province_regions,
      shipping_rates,
      courier_name,
      courier_active,
      shipping_rules,
    };
  }

  async saveShippingRegions(
    communityType,
    provinceRegions,
    shippingRates = null,
    courierName = '',
    shippingRules = [],
  ) {
    const scoped = this.normalizeSiteSlug(communityType);
    if (!scoped) throw new Error('community is required');
    const db = await connectAdmin();
    await this.ensureProvinceRegionTable(db);
    await this.ensureShippingRatesTable(db);
    await this.ensureShippingCourierTable(db);
    await this.ensureShippingRulesTable(db);

    const entries = Object.entries(provinceRegions || {})
      .map(([province, region]) => [
        this.normalizeProvince(province),
        this.normalizeRegion(region),
      ])
      .filter(([province]) => Boolean(province));

    await db.query(
      `DELETE FROM ${this.tableName} WHERE site_slug = ?`,
      [scoped],
    );
    if (entries.length > 0) {
      const valuesSql = entries.map(() => '(?, ?, ?)').join(', ');
      const params = entries.flatMap(([province, region]) => [scoped, province, region]);
      await db.query(
        `INSERT INTO ${this.tableName} (site_slug, province_name, shipping_region) VALUES ${valuesSql}`,
        params,
      );
    }

    if (shippingRates && typeof shippingRates === 'object') {
      const luzon = this.normalizeRate(shippingRates.Luzon, 95);
      const visMin = this.normalizeRate(shippingRates.VisMin, 120);
      await db.query(
        `INSERT INTO ${this.ratesTableName} (region, rate)
         VALUES ('Luzon', ?), ('VisMin', ?)
         ON DUPLICATE KEY UPDATE rate = VALUES(rate)`,
        [luzon, visMin],
      );
    }

    const normalizedCourier = this.normalizeCourier(courierName);
    if (normalizedCourier) {
      await db.query(
        `INSERT INTO ${this.courierTableName} (site_slug, courier_name, is_active)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE
           courier_name = VALUES(courier_name),
           is_active = VALUES(is_active)`,
        [scoped, normalizedCourier],
      );
    } else {
      await db.query(
        `DELETE FROM ${this.courierTableName} WHERE site_slug = ?`,
        [scoped],
      );
    }

    await db.query(
      `DELETE FROM ${this.rulesTableName} WHERE site_slug = ?`,
      [scoped],
    );

    const normalizedRules = (Array.isArray(shippingRules) ? shippingRules : [])
      .map((rule, index) => this.normalizeShippingRule(rule, index))
      .filter(Boolean);

    if (normalizedRules.length) {
      const valuesSql = normalizedRules.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params = normalizedRules.flatMap((rule) => ([
        scoped,
        rule.shipping_region,
        rule.max_weight_g,
        rule.max_length_cm,
        rule.max_width_cm,
        rule.max_height_cm,
        rule.fee,
        rule.priority,
        rule.is_active,
      ]));
      await db.query(
        `INSERT INTO ${this.rulesTableName} (
          site_slug,
          shipping_region,
          max_weight_g,
          max_length_cm,
          max_width_cm,
          max_height_cm,
          fee,
          priority,
          is_active
        ) VALUES ${valuesSql}`,
        params,
      );
    }

    return {
      saved: entries.length,
      courier_name: normalizedCourier,
      shipping_rule_count: normalizedRules.length,
    };
  }

  async getEventPosters(communityType, options = {}) {
    const scoped = this.normalizeSiteSlug(communityType);
    if (!scoped || scoped === this.globalSlug) return [];
    const scopedCommunityId = await this.resolveScopedCommunityId(scoped, options);
    if (!scopedCommunityId) {
      return [];
    }

    const variants = this.buildSiteSlugVariants(scoped);
    console.log('[settings-model] getEventPosters variants', {
      input: communityType,
      scoped,
      variants,
    });
    let rows = [];
    let lastError = null;
    for (const candidate of variants) {
      try {
        const db = await connect(candidate);
        const [dbRows] = await db.query('SELECT DATABASE() AS current_db');
        const currentDb = String(dbRows?.[0]?.current_db || '').trim();
        const candidateRows = await this.readEventRows(db, scopedCommunityId, options);
        console.log('[settings-model] candidate read', {
          candidate,
          currentDb,
          rowCount: candidateRows.length,
          sample: candidateRows.length ? candidateRows[0] : null,
        });
        if (candidateRows.length > 0) {
          rows = candidateRows;
          break;
        }
        if (!rows.length) rows = candidateRows;
      } catch (error) {
        console.error('[settings-model] candidate failed', {
          candidate,
          message: error?.message || String(error),
        });
        lastError = error;
      }
    }

    // Safety fallback: use default app DB when site-db mapping is stale/misconfigured.
    if (!rows.length) {
      try {
        const defaultDb = await connect();
        const [dbRows] = await defaultDb.query('SELECT DATABASE() AS current_db');
        const currentDb = String(dbRows?.[0]?.current_db || '').trim();
        const fallbackRows = await this.readEventRows(defaultDb, scopedCommunityId, options);
        console.log('[settings-model] default db fallback read', {
          currentDb,
          rowCount: fallbackRows.length,
          sample: fallbackRows.length ? fallbackRows[0] : null,
        });
        if (fallbackRows.length > 0) {
          rows = fallbackRows;
        }
      } catch (error) {
        lastError = lastError || error;
      }
    }

    if (!rows.length && lastError) {
      throw lastError;
    }

    return (rows || []).map((row, index) => ({
      id: String(row?.event_id || index + 1),
      event_id: Number(row?.event_id || index + 1),
      title: String(row?.event_name || `Event ${index + 1}`).trim(),
      href: String(row?.ticket_link || '').trim(),
      image: String(row?.image_url || '').trim(),
    }));
  }

  async saveEventPosters(communityType, posters = [], options = {}) {
    const scoped = this.normalizeSiteSlug(communityType);
    if (!scoped || scoped === this.globalSlug) {
      throw new Error('site/community is required');
    }
    const scopedCommunityId = await this.resolveScopedCommunityId(scoped, options);
    if (!scopedCommunityId) {
      throw new Error('site/community scope is required');
    }

    const db = await this.resolveWritableEventDb(scoped);
    await this.ensureEventColumns(db);
    const columns = await this.getTableColumns(db, 'events');
    const hasGroupCommunityId = Boolean(columns.group_community_id);
    const hasCommunityId = Boolean(columns.community_id);
    const scopeColumn = hasGroupCommunityId ? 'group_community_id' : (hasCommunityId ? 'community_id' : null);
    const existingRows = await this.readEventRows(db, scopedCommunityId, { includeEmpty: true });

    const normalized = (Array.isArray(posters) ? posters : [])
      .map((item, index) => this.normalizePosterPayload(item, index))
      .filter((item) => item.ticket_link || item.image_url);

    for (let index = 0; index < normalized.length; index += 1) {
      const poster = normalized[index];
      const fallbackRow = existingRows[index] || null;
      const resolvedEventId = poster.event_id || Number(fallbackRow?.event_id || 0) || null;
      const updateParams = [
        poster.ticket_link,
        poster.image_url || null,
      ];
      let updateSql = `
        UPDATE events
        SET ticket_link = ?, image_url = ?
      `;
      if (columns.event_name) {
        updateSql += `, event_name = COALESCE(NULLIF(event_name, ''), ?)`;
        updateParams.push(poster.title);
      }
      if (resolvedEventId) {
        updateSql += ` WHERE event_id = ?`;
        updateParams.push(resolvedEventId);
        if (scopeColumn && scopedCommunityId) {
          updateSql += ` AND COALESCE(${scopeColumn}, 0) = ?`;
          updateParams.push(scopedCommunityId);
        }

        const [updated] = await db.query(updateSql, updateParams);
        if (Number(updated?.affectedRows || 0) > 0) continue;
      }
      const insertCols = ['ticket_link', 'image_url'];
      const insertVals = [poster.ticket_link, poster.image_url || null];

      if (columns.event_name) {
        insertCols.push('event_name');
        insertVals.push(poster.title);
      }
      if (columns.event_location) {
        insertCols.push('event_location');
        insertVals.push('TBA');
      }
      if (columns.event_date) {
        insertCols.push('event_date');
        insertVals.push('2099-01-01 00:00:00');
      }
      if (columns.event_time) {
        insertCols.push('event_time');
        insertVals.push('00:00:00');
      }
      if (columns.group_community_id) {
        insertCols.push('group_community_id');
        insertVals.push(scopedCommunityId);
      } else if (columns.community_id) {
        insertCols.push('community_id');
        insertVals.push(scopedCommunityId);
      }

      if (resolvedEventId && !scopeColumn) {
        insertCols.unshift('event_id');
        insertVals.unshift(resolvedEventId);
      }

      const placeholders = insertCols.map(() => '?').join(', ');
      await db.query(
        `INSERT INTO events (${insertCols.join(', ')}) VALUES (${placeholders})`,
        insertVals,
      );
    }

    return { saved: normalized.length };
  }
}

export default SettingsModel;
