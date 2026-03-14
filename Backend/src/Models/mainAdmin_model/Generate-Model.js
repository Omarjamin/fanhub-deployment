import { connectAdmin } from '../../core/database.js';

class GenerateModel {
  constructor() {
    this.db = null;
    this.siteColumns = null;
    this.siteTableChecks = new Map();
    this.tableColumnsCache = new Map();
  }

  async connectAdmin() {
    if (this.db) return;
    try {
      this.db = await connectAdmin();
    } catch (err) {
      console.error('DB connection failed:', err);
      throw new Error('Database connection failed');
    }
  }

  async hasTable(tableName) {
    if (this.siteTableChecks.has(tableName)) {
      return this.siteTableChecks.get(tableName);
    }
    const [rows] = await this.db.query('SHOW TABLES LIKE ?', [tableName]);
    const exists = Array.isArray(rows) && rows.length > 0;
    this.siteTableChecks.set(tableName, exists);
    return exists;
  }

  async ensureSiteCommunityColumn() {
    if (!this.db) await this.connectAdmin();
    const hasSites = await this.hasTable('sites');
    if (!hasSites) return;

    const [rows] = await this.db.query('SHOW COLUMNS FROM sites');
    const cols = new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
    if (cols.has('community_id')) return;

    const hasCommunities = await this.hasTable('communities');
    if (!hasCommunities) return;

    try {
      await this.db.query('ALTER TABLE sites ADD COLUMN community_id INT NULL AFTER domain');
    } catch (_) {}

    try {
      await this.db.query('ALTER TABLE sites ADD INDEX idx_sites_community_id (community_id)');
    } catch (_) {}

    this.siteColumns = null;
  }

  async ensureSiteTemplateColumns() {
    if (!this.db) await this.connectAdmin();
    const hasSites = await this.hasTable('sites');
    if (!hasSites) return;

    const [rows] = await this.db.query('SHOW COLUMNS FROM sites');
    const cols = new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));

    const desiredColumns = [
      { name: 'template_id', sql: 'ALTER TABLE sites ADD COLUMN template_id INT NULL AFTER community_id' },
      { name: 'template', sql: 'ALTER TABLE sites ADD COLUMN template VARCHAR(120) NULL AFTER template_id' },
      { name: 'template_name', sql: 'ALTER TABLE sites ADD COLUMN template_name VARCHAR(255) NULL AFTER template' },
      { name: 'template_key', sql: 'ALTER TABLE sites ADD COLUMN template_key VARCHAR(120) NULL AFTER template_name' },
    ];

    for (const column of desiredColumns) {
      if (cols.has(column.name)) continue;
      try {
        await this.db.query(column.sql);
      } catch (_) {}
    }

    this.siteColumns = null;
  }

  async getSiteColumns() {
    if (this.siteColumns) return this.siteColumns;
    await this.ensureSiteCommunityColumn();
    await this.ensureSiteTemplateColumns();
    const [rows] = await this.db.query('SHOW COLUMNS FROM sites');
    this.siteColumns = new Set((rows || []).map((row) => String(row?.Field || '').trim()));
    return this.siteColumns;
  }

  normalizeBirthdate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toISOString().slice(0, 10);
  }

  async resolveCommunityId(siteName = '', domain = '', communityType = '') {
    const hasCommunities = await this.hasTable('communities');
    if (!hasCommunities) return null;

    const candidates = Array.from(new Set([
      String(communityType || '').trim().toLowerCase(),
      String(domain || '').trim().toLowerCase(),
      String(siteName || '').trim().toLowerCase(),
    ].filter(Boolean)));

    for (const candidate of candidates) {
      try {
        const [rows] = await this.db.query(
          'SELECT community_id FROM communities WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1',
          [candidate],
        );
        const id = Number(rows?.[0]?.community_id || 0);
        if (id > 0) return id;
      } catch (_) {}
    }

    return null;
  }

  async ensureCommunityRecord(siteName = '', domain = '', communityType = '', description = '') {
    const hasCommunities = await this.hasTable('communities');
    if (!hasCommunities) return null;

    const communityCols = await this.getTableColumns('communities');
    const idCol = communityCols.has('community_id')
      ? 'community_id'
      : (communityCols.has('id') ? 'id' : null);
    if (!communityCols.has('name') || !idCol) return null;

    const normalizedName = String(communityType || domain || siteName || '')
      .trim()
      .toLowerCase();
    if (!normalizedName) return null;

    try {
      const [existingRows] = await this.db.query(
        `SELECT ${idCol} AS id FROM communities WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
        [normalizedName],
      );
      const existingId = Number(existingRows?.[0]?.id || 0);
      if (existingId > 0) return existingId;
    } catch (_) {}

    const insertCols = ['name'];
    const insertValues = ['?'];
    const insertParams = [normalizedName];

    if (communityCols.has('description')) {
      insertCols.push('description');
      insertValues.push('?');
      insertParams.push(String(description || '').trim());
    }
    if (communityCols.has('created_at')) {
      insertCols.push('created_at');
      insertValues.push('NOW()');
    }

    try {
      const [insertRes] = await this.db.query(
        `INSERT INTO communities (${insertCols.join(', ')}) VALUES (${insertValues.join(', ')})`,
        insertParams,
      );
      const insertedId = Number(insertRes?.insertId || 0);
      if (insertedId > 0) return insertedId;
    } catch (err) {
      if (String(err?.code || '') !== 'ER_DUP_ENTRY') throw err;
    }

    const [rows] = await this.db.query(
      `SELECT ${idCol} AS id FROM communities WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
      [normalizedName],
    );
    return Number(rows?.[0]?.id || 0) || null;
  }

  async getTableColumns(tableName, { refresh = false } = {}) {
    if (refresh) {
      this.tableColumnsCache.delete(tableName);
    }

    if (this.tableColumnsCache.has(tableName)) {
      return this.tableColumnsCache.get(tableName);
    }

    const exists = await this.hasTable(tableName);
    if (!exists) {
      const empty = new Set();
      this.tableColumnsCache.set(tableName, empty);
      return empty;
    }

    const [rows] = await this.db.query(`SHOW COLUMNS FROM ${tableName}`);
    const cols = new Set((rows || []).map((row) => String(row?.Field || '').trim()));
    this.tableColumnsCache.set(tableName, cols);
    return cols;
  }

  async ensureCommunityTable() {
    if (!this.db) await this.connectAdmin();
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS community_table (
        community_id INT(11) NOT NULL,
        site_name VARCHAR(150) NOT NULL,
        domain VARCHAR(180) NOT NULL,
        status ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (community_id),
        UNIQUE KEY uq_community_table_domain (domain)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async upsertCommunityTable({ communityId, siteId, siteName, domain, status = 'active' }) {
    await this.ensureCommunityTable();
    const rowId = Number(communityId || siteId || 0);
    if (!rowId) return;
    await this.db.query(
      `
      INSERT INTO community_table (community_id, site_name, domain, status)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        site_name = VALUES(site_name),
        domain = VALUES(domain),
        status = VALUES(status)
      `,
      [
        rowId,
        String(siteName || '').trim(),
        String(domain || '').trim(),
        String(status || 'active').trim() || 'active',
      ],
    );
  }

  async ensureSitesSettingGroupPhotoColumn() {
    if (!this.db) await this.connectAdmin();
    const hasSettings = await this.hasTable('sites_setting');
    if (!hasSettings) return;

    const [rows] = await this.db.query('SHOW COLUMNS FROM sites_setting');
    const cols = new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
    if (cols.has('group_photo')) return;

    try {
      if (cols.has('banner')) {
        await this.db.query('ALTER TABLE sites_setting ADD COLUMN group_photo TEXT NULL AFTER banner');
      } else {
        await this.db.query('ALTER TABLE sites_setting ADD COLUMN group_photo TEXT NULL');
      }
    } catch (_) {}

    this.tableColumnsCache.delete('sites_setting');
  }

  async ensureSitesSettingLeadMediaColumns() {
    if (!this.db) await this.connectAdmin();
    const hasSettings = await this.hasTable('sites_setting');
    if (!hasSettings) return;

    const [rows] = await this.db.query('SHOW COLUMNS FROM sites_setting');
    const cols = new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
    const desiredColumns = [
      'lead_image',
      'instagram_url',
      'facebook_url',
      'tiktok_url',
      'spotify_url',
      'x_url',
      'youtube_url',
    ];

    for (const column of desiredColumns) {
      if (cols.has(column)) continue;
      try {
        await this.db.query(`ALTER TABLE sites_setting ADD COLUMN ${column} TEXT NULL`);
      } catch (_) {}
    }

    this.tableColumnsCache.delete('sites_setting');
  }

  async buildSiteSelectQuery({
    whereClause = '',
    limitOne = false,
    excludedSettingColumns = new Set(),
  } = {}) {
    const siteCols = await this.getSiteColumns();
    await this.ensureSitesSettingGroupPhotoColumn();
    await this.ensureSitesSettingLeadMediaColumns();
    const hasSettingsTable = await this.hasTable('sites_setting');
    const settingsCols = hasSettingsTable ? await this.getTableColumns('sites_setting') : new Set();

    const pickSite = (column, fallbackSql = `NULL AS ${column}`) => (
      siteCols.has(column) ? `s.${column}` : fallbackSql
    );
    const hasSettingColumn = (column) => (
      hasSettingsTable && settingsCols.has(column) && !excludedSettingColumns.has(column)
    );
    const pickSetting = (column, sql = `ss.${column}`, fallbackSql = `NULL AS ${column}`) => (
      hasSettingColumn(column) ? sql : fallbackSql
    );

    const siteFields = [
      's.site_id',
      's.site_name',
      pickSite('short_bio'),
      pickSite('description'),
      's.domain',
      pickSite('community_id'),
      pickSite('community_type', 's.domain AS community_type'),
      pickSite('template_id'),
      pickSite('template'),
      pickSite('template_name'),
      pickSite('template_key'),
      pickSite('status'),
      pickSite('created_at'),
    ];

    const settingFields = hasSettingsTable
      ? [
          pickSetting('primary_color'),
          pickSetting('secondary_color'),
          pickSetting('accent_color'),
          pickSetting('button_style'),
          pickSetting('font_style'),
          pickSetting('font_type', 'NULLIF(ss.font_type, "") AS font_type'),
          pickSetting('font_name', 'NULLIF(ss.font_name, "") AS font_name'),
          pickSetting('font_url', 'NULLIF(ss.font_url, "") AS font_url'),
          pickSetting('font_heading', 'NULLIF(ss.font_heading, "") AS font_heading'),
          pickSetting('font_body', 'NULLIF(ss.font_body, "") AS font_body'),
          pickSetting('font_size_base', 'NULLIF(ss.font_size_base, "") AS font_size_base'),
          pickSetting('line_height', 'NULLIF(ss.line_height, "") AS line_height'),
          pickSetting('letter_spacing', 'NULLIF(ss.letter_spacing, "") AS letter_spacing'),
          pickSetting('palette'),
          pickSetting('typography'),
          pickSetting('theme'),
          pickSetting('nav_position'),
          pickSetting('logo'),
          pickSetting('banner'),
          pickSetting('group_photo'),
          pickSetting('lead_image'),
          pickSetting('instagram_url'),
          pickSetting('facebook_url'),
          pickSetting('tiktok_url'),
          pickSetting('spotify_url'),
          pickSetting('x_url'),
          pickSetting('youtube_url'),
        ]
      : [
          'NULL AS primary_color',
          'NULL AS secondary_color',
          'NULL AS accent_color',
          'NULL AS button_style',
          'NULL AS font_style',
          'NULL AS font_type',
          'NULL AS font_name',
          'NULL AS font_url',
          'NULL AS font_heading',
          'NULL AS font_body',
          'NULL AS font_size_base',
          'NULL AS line_height',
          'NULL AS letter_spacing',
          'NULL AS palette',
          'NULL AS typography',
          'NULL AS theme',
          'NULL AS nav_position',
          'NULL AS logo',
          'NULL AS banner',
          'NULL AS group_photo',
          'NULL AS lead_image',
          'NULL AS instagram_url',
          'NULL AS facebook_url',
          'NULL AS tiktok_url',
          'NULL AS spotify_url',
          'NULL AS x_url',
          'NULL AS youtube_url',
        ];

    const joinClause = hasSettingsTable
      ? 'LEFT JOIN sites_setting ss ON s.site_id = ss.site_id'
      : '';

    const orderByClause = siteCols.has('created_at') ? 's.created_at DESC' : 's.site_id DESC';

    return `
      SELECT
        ${siteFields.concat(settingFields).join(',\n        ')}
      FROM sites s
      ${joinClause}
      ${whereClause ? `WHERE ${whereClause}` : ''}
      ORDER BY ${orderByClause}
      ${limitOne ? 'LIMIT 1' : ''}
    `;
  }

  getMissingSettingsColumn(err) {
    const message = String(err?.message || '');
    const match = message.match(/Unknown column 'ss\.([A-Za-z0-9_]+)' in 'field list'/i);
    return match?.[1] || null;
  }

  async runSiteSelectQuery({ whereClause = '', limitOne = false, params = [] } = {}) {
    const excludedSettingColumns = new Set();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const siteQuery = await this.buildSiteSelectQuery({
          whereClause,
          limitOne,
          excludedSettingColumns,
        });
        const [sites] = await this.db.query(siteQuery, params);
        return sites;
      } catch (err) {
        const missingColumn = this.getMissingSettingsColumn(err);
        if (!missingColumn || excludedSettingColumns.has(missingColumn)) {
          throw err;
        }

        this.tableColumnsCache.delete('sites_setting');
        excludedSettingColumns.add(missingColumn);
      }
    }

    return [];
  }

  async generateWebsite({
    siteName,
    domain,
    communityType,
    short_bio,
    description,
    db_name,
    db_host,
    db_user,
    db_password,
    templateId,
    template,
    templateName,
    templateKey,
    fontType,
    fontName,
    fontUrl,
    typography,
    theme,
    palette,
    primaryColor,
    secondaryColor,
    accentColor,
    buttonStyle,
    fontStyle,
    logo,
    banner,
    group_photo,
    lead_image,
    instagram_url,
    facebook_url,
    tiktok_url,
    spotify_url,
    x_url,
    youtube_url,
    members,
  }) {
    if (!this.db) await this.connectAdmin();
    const siteCols = await this.getSiteColumns();
    await this.ensureSitesSettingGroupPhotoColumn();
    await this.ensureSitesSettingLeadMediaColumns();

    const normalizedSiteName = String(siteName || '').trim();
    const normalizedCommunityType = String(communityType || '').trim() || 'general';
    const normalizedDomain = String(domain || '').trim() || normalizedSiteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const normalizedShortBio = String(short_bio || '').trim();
    const normalizedDescription = String(description || '').trim();
    const normalizedTemplateId = Number(templateId);
    const normalizedTemplate = String(template || templateKey || templateName || '').trim();
    const normalizedTemplateName = String(templateName || template || '').trim();
    const normalizedTemplateKey = String(templateKey || template || templateName || '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const normalizedFontType = String(fontType || '').trim().toLowerCase();
    const normalizedFontName = String(fontName || '').trim();
    const normalizedFontUrl = String(fontUrl || '').trim();
    const normalizedTypography = typeof typography === 'string' ? typography : JSON.stringify(typography || {});
    const normalizedTheme = typeof theme === 'string' ? theme : JSON.stringify(theme || {});
    const normalizedPalette = typeof palette === 'string' ? palette : JSON.stringify(palette || []);
    let parsedTypography = {};

    try {
      parsedTypography = JSON.parse(normalizedTypography || '{}');
    } catch (_) {
      parsedTypography = {};
    }

    if (!normalizedSiteName) throw new Error('site_name is required');
    if (!normalizedDomain) throw new Error('domain is required');

    const resolvedCommunityId = await this.ensureCommunityRecord(
      normalizedSiteName,
      normalizedDomain,
      normalizedCommunityType,
      normalizedDescription || normalizedShortBio,
    );

    const insertColumns = ['site_name', 'domain'];
    const insertValues = ['?', '?'];
    const insertParams = [normalizedSiteName, normalizedDomain];

    if (siteCols.has('status')) {
      insertColumns.push('status');
      insertValues.push('?');
      insertParams.push('active');
    }
    if (siteCols.has('short_bio')) {
      insertColumns.push('short_bio');
      insertValues.push('?');
      insertParams.push(normalizedShortBio);
    }
    if (siteCols.has('description')) {
      insertColumns.push('description');
      insertValues.push('?');
      insertParams.push(normalizedDescription);
    }
    if (siteCols.has('community_type')) {
      insertColumns.push('community_type');
      insertValues.push('?');
      insertParams.push(normalizedCommunityType);
    }
    if (siteCols.has('community_id')) {
      insertColumns.push('community_id');
      insertValues.push('?');
      insertParams.push(resolvedCommunityId);
    }
    if (siteCols.has('template_id') && Number.isFinite(normalizedTemplateId) && normalizedTemplateId > 0) {
      insertColumns.push('template_id');
      insertValues.push('?');
      insertParams.push(normalizedTemplateId);
    }
    if (siteCols.has('template') && normalizedTemplate) {
      insertColumns.push('template');
      insertValues.push('?');
      insertParams.push(normalizedTemplate);
    }
    if (siteCols.has('template_name') && normalizedTemplateName) {
      insertColumns.push('template_name');
      insertValues.push('?');
      insertParams.push(normalizedTemplateName);
    }
    if (siteCols.has('template_key') && normalizedTemplateKey) {
      insertColumns.push('template_key');
      insertValues.push('?');
      insertParams.push(normalizedTemplateKey);
    }
    if (siteCols.has('created_at')) {
      insertColumns.push('created_at');
      insertValues.push('NOW()');
    }

    const siteQuery = `
      INSERT INTO sites (${insertColumns.join(', ')})
      VALUES (${insertValues.join(', ')})
    `;
    const [siteResult] = await this.db.query(siteQuery, insertParams);
    const siteId = siteResult.insertId;

    const settingsCols = await this.getTableColumns('sites_setting', { refresh: true });
    if (settingsCols.size > 0) {
      const settingColumns = [];
      const settingValues = [];
      const settingParams = [];

      const addSettingValue = (column, value) => {
        if (!settingsCols.has(column)) return;
        settingColumns.push(column);
        settingValues.push('?');
        settingParams.push(value);
      };

      addSettingValue('site_id', siteId);
      addSettingValue('primary_color', primaryColor);
      addSettingValue('secondary_color', secondaryColor);
      addSettingValue('accent_color', accentColor);
      addSettingValue('button_style', buttonStyle);
      addSettingValue('font_style', fontStyle);
      addSettingValue('font_type', normalizedFontType);
      addSettingValue('font_name', normalizedFontName);
      addSettingValue('font_url', normalizedFontUrl);
      addSettingValue('font_heading', String(parsedTypography?.heading?.name || parsedTypography?.font_heading?.name || parsedTypography?.font_heading || '').trim());
      addSettingValue('font_body', String(parsedTypography?.body?.name || parsedTypography?.font_body?.name || parsedTypography?.font_body || normalizedFontName).trim());
      addSettingValue('font_size_base', String(parsedTypography?.fontSizeBase || parsedTypography?.font_size_base || '').trim());
      addSettingValue('line_height', String(parsedTypography?.lineHeight || parsedTypography?.line_height || '').trim());
      addSettingValue('letter_spacing', String(parsedTypography?.letterSpacing || parsedTypography?.letter_spacing || '').trim());
      addSettingValue('palette', normalizedPalette);
      addSettingValue('typography', normalizedTypography);
      addSettingValue('theme', normalizedTheme);
      addSettingValue('logo', logo);
      addSettingValue('banner', banner);
      addSettingValue('group_photo', group_photo);
      addSettingValue('lead_image', lead_image);
      addSettingValue('instagram_url', instagram_url);
      addSettingValue('facebook_url', facebook_url);
      addSettingValue('tiktok_url', tiktok_url);
      addSettingValue('spotify_url', spotify_url);
      addSettingValue('x_url', x_url);
      addSettingValue('youtube_url', youtube_url);

      if (settingsCols.has('created_at')) {
        settingColumns.push('created_at');
        settingValues.push('NOW()');
      }

      if (settingColumns.length > 0) {
        const settingQuery = `
          INSERT INTO sites_setting (${settingColumns.join(', ')})
          VALUES (${settingValues.join(', ')})
        `;
        await this.db.query(settingQuery, settingParams);
      }
    }

    const normalizedMembers = Array.isArray(members) ? members : [];
    const memberCols = await this.getTableColumns('site_members');
    if (normalizedMembers.length > 0 && memberCols.size > 0) {
      for (const member of normalizedMembers) {
        const name = String(member?.name || '').trim();
        const role = String(member?.role || '').trim();
        const memberDescription = String(member?.description || '').trim();
        const birthdate = this.normalizeBirthdate(member?.birthdate);
        const storageRole = role || birthdate || null;
        const imageProfile = String(member?.image || member?.image_profile || '').trim() || null;

        if (!name || (!birthdate && !storageRole)) continue;

        const memberColumns = [];
        const memberValues = [];
        const memberParams = [];

        const addMemberValue = (column, value) => {
          if (!memberCols.has(column)) return;
          memberColumns.push(column);
          memberValues.push('?');
          memberParams.push(value);
        };

        addMemberValue('site_id', siteId);
        addMemberValue('name', name);
        addMemberValue('birthdate', birthdate);
        addMemberValue('role', storageRole);
        addMemberValue('description', memberDescription || null);
        addMemberValue('image_profile', imageProfile);

        if (memberCols.has('created_at')) {
          memberColumns.push('created_at');
          memberValues.push('NOW()');
        }

        if (memberColumns.length === 0) continue;
        const memberQuery = `
          INSERT INTO site_members (${memberColumns.join(', ')})
          VALUES (${memberValues.join(', ')})
        `;
        await this.db.query(memberQuery, memberParams);
      }
    }

    await this.upsertCommunityTable({
      communityId: resolvedCommunityId,
      siteId,
      siteName: normalizedSiteName,
      domain: normalizedDomain,
      status: 'active',
    });

    return siteId;
  }

  async getGeneratedWebsites() {
    try {
      if (!this.db) await this.connectAdmin();
      const sites = await this.runSiteSelectQuery();

      const sitesWithMembers = await Promise.all(
        sites.map(async (site) => {
          const members = await this.getSiteMembersSafe(site.site_id);
          return { ...site, members };
        }),
      );

      const communityRows = await this.getCommunityTableSelections();
      if (!communityRows.length) return sitesWithMembers;

      const byCommunityId = new Map();
      const byDomain = new Map();
      const bySiteName = new Map();

      for (const site of sitesWithMembers) {
        const communityId = Number(site?.community_id || 0) || null;
        const siteId = Number(site?.site_id || 0) || null;
        const domain = String(site?.domain || '').trim().toLowerCase();
        const siteName = String(site?.site_name || '').trim().toLowerCase();

        if (communityId) byCommunityId.set(communityId, site);
        else if (siteId) byCommunityId.set(siteId, site);
        if (domain) byDomain.set(domain, site);
        if (siteName) bySiteName.set(siteName, site);
      }

      const merged = communityRows.map((row) => {
        const communityId = Number(row?.community_id || 0) || null;
        const normalizedDomain = String(row?.domain || '').trim().toLowerCase();
        const normalizedSiteName = String(row?.site_name || '').trim();

        const matched =
          (communityId ? byCommunityId.get(communityId) : null) ||
          byDomain.get(normalizedDomain) ||
          bySiteName.get(normalizedSiteName.toLowerCase()) ||
          null;

        const siteId = Number(matched?.site_id || communityId || 0) || null;
        const mergedStatus = String(
          row?.status || matched?.status || 'active',
        ).trim().toLowerCase();

        return {
          ...matched,
          site_id: siteId,
          id: siteId,
          community_id: communityId || Number(matched?.community_id || 0) || null,
          site_name: normalizedSiteName || matched?.site_name || normalizedDomain,
          domain: normalizedDomain || String(matched?.domain || '').trim().toLowerCase(),
          community_type: normalizedDomain || String(matched?.community_type || matched?.domain || '').trim().toLowerCase(),
          status: mergedStatus || 'active',
          members: Array.isArray(matched?.members) ? matched.members : [],
        };
      }).filter((row) => String(row?.domain || '').trim());

      return merged;
    } catch (err) {
      console.error('Get generated websites error:', err);
      throw new Error('Failed to fetch websites');
    }
  }

  async getCommunityTableSelections() {
    if (!this.db) await this.connectAdmin();
    const hasCommunityTable = await this.hasTable('community_table');
    if (!hasCommunityTable) return [];

    const hasCommunities = await this.hasTable('communities');
    const hasSites = await this.hasTable('sites');
    let communityJoin = '';
    let siteJoin = '';
    let communityKeySql = "LOWER(TRIM(COALESCE(NULLIF(ct.domain, ''), NULLIF(ct.site_name, ''))))";
    let siteNameSql = "COALESCE(NULLIF(TRIM(ct.site_name), ''), NULLIF(TRIM(ct.domain), ''), 'community')";
    let statusSql = "LOWER(TRIM(COALESCE(ct.status, 'active')))";

    if (hasSites) {
      siteJoin = 'LEFT JOIN sites s ON s.site_id = ct.community_id';
      communityKeySql =
        "LOWER(TRIM(COALESCE(NULLIF(s.domain, ''), NULLIF(ct.domain, ''), NULLIF(ct.site_name, ''))))";
      siteNameSql =
        "COALESCE(NULLIF(TRIM(s.site_name), ''), NULLIF(TRIM(ct.site_name), ''), NULLIF(TRIM(ct.domain), ''), 'community')";
      statusSql = "LOWER(TRIM(COALESCE(s.status, ct.status, 'active')))";
    }

    if (hasCommunities) {
      const communityCols = await this.getTableColumns('communities');
      const communityPk = communityCols.has('community_id')
        ? 'community_id'
        : (communityCols.has('id') ? 'id' : null);
      const hasCommunityName = communityCols.has('name');
      if (communityPk) {
        communityJoin = `LEFT JOIN communities c ON c.${communityPk} = ct.community_id`;
        if (hasCommunityName) {
          communityKeySql =
            "LOWER(TRIM(COALESCE(NULLIF(c.name, ''), NULLIF(s.domain, ''), NULLIF(ct.domain, ''), NULLIF(ct.site_name, ''))))";
        }
      }
    }

    const [rows] = await this.db.query(
      `
        SELECT
          ct.community_id,
          ${siteNameSql} AS site_name,
          ${communityKeySql} AS domain,
          ${statusSql} AS status
        FROM community_table ct
        ${siteJoin}
        ${communityJoin}
        ORDER BY ct.community_id ASC
      `,
    );

    return (rows || [])
      .map((row) => ({
        community_id: Number(row?.community_id || 0) || null,
        site_name: String(row?.site_name || '').trim(),
        domain: String(row?.domain || '')
          .trim()
          .toLowerCase()
          .replace(/-website$/, ''),
        status: String(row?.status || 'active').trim().toLowerCase(),
      }))
      .filter((row) => row.community_id && row.domain);
  }

  async getCommunitySelections() {
    if (!this.db) await this.connectAdmin();
    const rows = await this.getCommunityTableSelections();
    if (rows.length) return rows;

    // Fallback for environments that still don't have community_table rows.
    const sites = await this.getGeneratedWebsites();
    return (sites || [])
      .map((site) => ({
        community_id: Number(site?.community_id || site?.site_id || site?.id || 0) || null,
        site_name: String(site?.site_name || site?.name || '').trim(),
        domain: String(site?.domain || site?.community_type || '').trim().toLowerCase(),
        status: String(site?.status || 'active').trim().toLowerCase(),
      }))
      .filter((row) => row.community_id && row.domain);
  }

  async getSiteMembersSafe(siteId) {
    const queries = [
      `
        SELECT
          member_id AS id,
          name,
          NULL AS role,
          birthdate,
          NULL AS description,
          image_profile,
          community_id
        FROM site_members
        WHERE site_id = ?
        ORDER BY created_at ASC
      `,
      `
        SELECT
          member_id AS id,
          name,
          NULL AS role,
          birthdate,
          NULL AS description,
          image_profile,
          community_id
        FROM site_members
        WHERE site_id = ?
        ORDER BY created_at ASC
      `,
      `
        SELECT
          member_id AS id,
          name,
          NULL AS role,
          birthdate,
          NULL AS description,
          image_profile,
          community_id
        FROM site_members
        WHERE site_id = ?
      `,
      `
        SELECT
          member_id AS id,
          name,
          NULL AS role,
          birthdate,
          NULL AS description,
          image_profile,
          community_id
        FROM site_members
        WHERE community_id = ?
        ORDER BY created_at ASC
      `
    ];

    for (const q of queries) {
      try {
        const [members] = await this.db.query(q, [siteId]);
        return members || [];
      } catch (_) {}
    }

    return [];
  }

  async getResolvedSiteMembersSafe(site = {}) {
    const candidateIds = Array.from(new Set([
      Number(site?.site_id || 0) || null,
      Number(site?.community_id || 0) || null,
      Number(site?.id || 0) || null,
    ].filter(Boolean)));

    for (const candidateId of candidateIds) {
      const members = await this.getSiteMembersSafe(candidateId);
      if (Array.isArray(members) && members.length > 0) {
        return members;
      }
    }

    return [];
  }

  async getWebsiteMembers({ siteId = null, communityType = '' } = {}) {
    try {
      if (!this.db) await this.connectAdmin();

      const normalizedSiteId = Number(siteId || 0);
      if (normalizedSiteId > 0) {
        const directMembers = await this.getSiteMembersSafe(normalizedSiteId);
        if (Array.isArray(directMembers) && directMembers.length > 0) {
          return directMembers;
        }
      }//asda

      const normalizedCommunityType = String(communityType || '').trim();
      if (!normalizedCommunityType) {
        return [];
      }

      const site = await this.getWebsiteByCommunityType(normalizedCommunityType);
      if (!site) {
        return await this.getWebsiteMembersByLookup(normalizedCommunityType);
      }

      if (Array.isArray(site?.members) && site.members.length > 0) {
        return site.members;
      }

      const resolvedMembers = await this.getResolvedSiteMembersSafe(site);
      if (Array.isArray(resolvedMembers) && resolvedMembers.length > 0) {
        return resolvedMembers;
      }

      return await this.getWebsiteMembersByLookup(
        normalizedCommunityType,
        Number(site?.site_id || 0) || Number(site?.community_id || 0) || normalizedSiteId,
      );
    } catch (err) {
      console.warn('Get website members fallback:', err?.message || err);
      return [];
    }
  }

  async getWebsiteMembersByLookup(communityType = '', preferredSiteId = null) {
    try {
      const siteCols = await this.getSiteColumns();
      const lookupVariants = Array.from(new Set([
        String(communityType || '').trim().toLowerCase(),
        String(communityType || '').trim().toLowerCase().replace(/-website$/, ''),
        String(communityType || '').trim()
          ? `${String(communityType || '').trim().toLowerCase().replace(/-website$/, '')}-website`
          : '',
      ].filter(Boolean)));

      const candidateIds = new Set();
      if (Number(preferredSiteId || 0) > 0) {
        candidateIds.add(Number(preferredSiteId));
      }

      const whereParts = [];
      const params = [];
      if (siteCols.has('domain')) {
        whereParts.push(...lookupVariants.map(() => 'LOWER(TRIM(s.domain)) = ?'));
        params.push(...lookupVariants);
      }
      if (siteCols.has('community_type')) {
        whereParts.push(...lookupVariants.map(() => 'LOWER(TRIM(s.community_type)) = ?'));
        params.push(...lookupVariants);
      }
      if (siteCols.has('site_name')) {
        whereParts.push(...lookupVariants.map(() => 'LOWER(TRIM(s.site_name)) = ?'));
        params.push(...lookupVariants);
      }

      if (whereParts.length > 0) {
        try {
          const [rows] = await this.db.query(
            `
              SELECT s.site_id, s.community_id, s.domain, s.community_type
              FROM sites s
              WHERE ${whereParts.join(' OR ')}
              ORDER BY s.site_id DESC
            `,
            params,
          );

          (rows || []).forEach((row) => {
            const siteId = Number(row?.site_id || 0);
            const communityId = Number(row?.community_id || 0);
            if (siteId > 0) candidateIds.add(siteId);
            if (communityId > 0) candidateIds.add(communityId);
          });
        } catch (_) {}
      }

      for (const candidateId of candidateIds) {
        const members = await this.getSiteMembersSafe(candidateId);
        if (Array.isArray(members) && members.length > 0) {
          return members;
        }
      }

      if (candidateIds.size > 0) {
        try {
          const [communityRows] = await this.db.query(
            `
              SELECT
                member_id AS id,
                name,
                NULL AS role,
                birthdate,
                NULL AS description,
                image_profile,
                community_id
              FROM site_members
              WHERE community_id IN (${Array.from(candidateIds).map(() => '?').join(', ')})
              ORDER BY created_at ASC
            `,
            Array.from(candidateIds),
          );
          if (Array.isArray(communityRows) && communityRows.length > 0) {
            return communityRows;
          }
        } catch (_) {}
      }

      return [];
    } catch (err) {
      console.warn('Get website members by lookup fallback:', err?.message || err);
      return [];
    }
  }

  async getWebsiteById(siteId) {
    try {
      if (!this.db) await this.connectAdmin();
      const sites = await this.runSiteSelectQuery({
        whereClause: 's.site_id = ?',
        limitOne: true,
        params: [siteId],
      });
      if (!sites || sites.length === 0) return null;
      const site = sites[0];

      const members = await this.getResolvedSiteMembersSafe(site);
      return { ...site, members: members || [] };
    } catch (err) {
      console.warn('Get website by ID fallback:', err?.message || err);
      return null;
    }
  }

  async getWebsiteByCommunityType(communityType) {
    try {
      if (!this.db) await this.connectAdmin();
      const siteCols = await this.getSiteColumns();
      const normalizedInput = String(communityType || '').trim().toLowerCase();
      const lookupVariants = Array.from(new Set([
        normalizedInput,
        normalizedInput.replace(/-website$/, ''),
        normalizedInput ? `${normalizedInput.replace(/-website$/, '')}-website` : '',
      ].filter(Boolean)));
      const whereParts = [];
      const params = [];

      if (siteCols.has('community_type')) {
        whereParts.push(...lookupVariants.map(() => 'LOWER(TRIM(s.community_type)) = ?'));
        params.push(...lookupVariants);
      }
      if (siteCols.has('domain')) {
        whereParts.push(...lookupVariants.map(() => 'LOWER(TRIM(s.domain)) = ?'));
        params.push(...lookupVariants);
      }
      if (siteCols.has('site_name')) {
        whereParts.push(...lookupVariants.map(() => 'LOWER(TRIM(s.site_name)) = ?'));
        params.push(...lookupVariants);
      }

      if (whereParts.length === 0) return null;
      const sites = await this.runSiteSelectQuery({
        whereClause: `(${whereParts.join(' OR ')})`,
        limitOne: false,
        params,
      });
      let site = null;

      if (Array.isArray(sites) && sites.length > 0) {
        const canonicalInput = normalizedInput.replace(/-website$/, '');
        const rankedSites = await Promise.all(
          sites.map(async (candidate) => {
            const candidateMembers = await this.getResolvedSiteMembersSafe(candidate);
            const normalizedDomain = String(candidate?.domain || '').trim().toLowerCase();
            const normalizedCommunityTypeValue = String(candidate?.community_type || '').trim().toLowerCase();
            const normalizedSiteName = String(candidate?.site_name || '').trim().toLowerCase();
            const canonicalDomain = normalizedDomain.replace(/-website$/, '');
            const canonicalCommunityType = normalizedCommunityTypeValue.replace(/-website$/, '');
            const canonicalSiteName = normalizedSiteName.replace(/-website$/, '');
            const exactDomainMatch = normalizedDomain === normalizedInput;
            const exactCommunityTypeMatch = normalizedCommunityTypeValue === normalizedInput;
            const exactSiteNameMatch = normalizedSiteName === normalizedInput;
            const variantDomainMatch = lookupVariants.includes(normalizedDomain);
            const variantCommunityTypeMatch = lookupVariants.includes(normalizedCommunityTypeValue);
            const variantSiteNameMatch = lookupVariants.includes(normalizedSiteName);
            const canonicalDomainMatch = canonicalDomain === canonicalInput;
            const canonicalCommunityTypeMatch = canonicalCommunityType === canonicalInput;
            const canonicalSiteNameMatch = canonicalSiteName === canonicalInput;
            const hasMembers = Array.isArray(candidateMembers) && candidateMembers.length > 0;

            const score =
              (exactDomainMatch ? 80 : 0) +
              (exactCommunityTypeMatch ? 80 : 0) +
              (exactSiteNameMatch ? 80 : 0) +
              (variantDomainMatch ? 25 : 0) +
              (variantCommunityTypeMatch ? 25 : 0) +
              (variantSiteNameMatch ? 25 : 0) +
              (canonicalDomainMatch ? 60 : 0) +
              (canonicalCommunityTypeMatch ? 60 : 0) +
              (canonicalSiteNameMatch ? 60 : 0) +
              (hasMembers ? 220 : 0);

            return {
              site: { ...candidate, members: candidateMembers || [] },
              score,
              memberCount: Array.isArray(candidateMembers) ? candidateMembers.length : 0,
            };
          })
        );

        rankedSites.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount;
          return Number(b.site?.site_id || 0) - Number(a.site?.site_id || 0);
        });

        console.info('[Generate Model Debug] ranked site candidates', {
          requestCommunityType: normalizedInput,
          lookupVariants,
          candidates: rankedSites.map((entry) => ({
            site_id: entry?.site?.site_id,
            domain: entry?.site?.domain,
            community_type: entry?.site?.community_type,
            memberCount: entry?.memberCount,
            score: entry?.score,
          })),
          chosenSiteId: rankedSites[0]?.site?.site_id || null,
        });

        site = rankedSites[0]?.site || null;
      }

      if (!site) {
        const keys = new Set(lookupVariants);
        const communityRows = await this.getCommunityTableSelections();
        const matchedCommunity = communityRows.find((row) => {
          const domain = String(row?.domain || '').trim().toLowerCase();
          const siteName = String(row?.site_name || '').trim().toLowerCase();
          const canonicalDomain = domain.replace(/-website$/, '');
          const canonicalSiteName = siteName.replace(/-website$/, '');
          return keys.has(domain) ||
            keys.has(siteName) ||
            canonicalDomain === normalizedInput.replace(/-website$/, '') ||
            canonicalSiteName === normalizedInput.replace(/-website$/, '');
        });

        if (!matchedCommunity) return null;

        const siteId = Number(matchedCommunity.community_id || 0) || null;
        if (!siteId) return null;
        site = await this.getWebsiteById(siteId);
        if (!site) {
          site = {
            site_id: siteId,
            id: siteId,
            community_id: siteId,
            site_name: matchedCommunity.site_name,
            domain: matchedCommunity.domain,
            community_type: matchedCommunity.domain,
            status: matchedCommunity.status,
            members: [],
          };
        }
      }
      if (Array.isArray(site?.members)) {
        console.info('[Generate Model Debug] resolved site result', {
          requestCommunityType: normalizedInput,
          siteId: site?.site_id,
          domain: site?.domain,
          communityType: site?.community_type,
          membersCount: Array.isArray(site?.members) ? site.members.length : 0,
        });
        return { ...site, members: site.members };
      }

      const members = await this.getResolvedSiteMembersSafe(site);
      console.info('[Generate Model Debug] fetched members after resolve', {
        requestCommunityType: normalizedInput,
        siteId: site?.site_id,
        communityId: site?.community_id,
        membersCount: Array.isArray(members) ? members.length : 0,
      });
      return { ...site, members: members || [] };
    } catch (err) {
      console.warn('Get website by community_type fallback:', err?.message || err);
      return null;
    }
  }

  async updateGeneratedWebsite(
    siteId,
    {
      site_name,
      community_type,
      community_id,
      template_id,
      template,
      template_name,
      template_key,
      status,
      short_bio,
      description,
      primary_color,
      secondary_color,
      accent_color,
      button_style,
      font_style,
      font_type,
      font_name,
      font_url,
      font_heading,
      font_body,
      font_size_base,
      line_height,
      letter_spacing,
      typography,
      palette,
      theme,
      nav_position,
      logo,
      banner,
      group_photo,
      lead_image,
      instagram_url,
      facebook_url,
      tiktok_url,
      spotify_url,
      x_url,
      youtube_url,
      members,
    }
  ) {
    try {
      if (!this.db) await this.connectAdmin();
      const siteCols = await this.getSiteColumns();
      await this.ensureSitesSettingGroupPhotoColumn();
      await this.ensureSitesSettingLeadMediaColumns();
      const settingsCols = await this.getTableColumns('sites_setting', { refresh: true });
      const memberCols = await this.getTableColumns('site_members');

      const updates = [];
      const params = [];

      if (site_name !== undefined) {
        const normalized = String(site_name || '').trim();
        if (!normalized) throw new Error('site_name cannot be empty');
        updates.push('site_name = ?');
        params.push(normalized);
      }

      if (community_type !== undefined) {
        const normalized = String(community_type || '').trim();
        if (!normalized) throw new Error('community_type cannot be empty');
        if (siteCols.has('domain')) {
          updates.push('domain = ?');
          params.push(normalized);
        }
        if (siteCols.has('community_type')) {
          updates.push('community_type = ?');
          params.push(normalized);
        }
        if (siteCols.has('community_id')) {
          const resolvedCommunityId = await this.resolveCommunityId(site_name, normalized, normalized);
          updates.push('community_id = ?');
          params.push(resolvedCommunityId);
        }
      }

      if (community_id !== undefined && siteCols.has('community_id')) {
        const numeric = Number(community_id);
        updates.push('community_id = ?');
        params.push(Number.isFinite(numeric) && numeric > 0 ? numeric : null);
      }

      if (template_id !== undefined && siteCols.has('template_id')) {
        const numeric = Number(template_id);
        updates.push('template_id = ?');
        params.push(Number.isFinite(numeric) && numeric > 0 ? numeric : null);
      }

      if (template !== undefined && siteCols.has('template')) {
        updates.push('template = ?');
        params.push(String(template || '').trim() || null);
      }

      if (template_name !== undefined && siteCols.has('template_name')) {
        updates.push('template_name = ?');
        params.push(String(template_name || '').trim() || null);
      }

      if (template_key !== undefined && siteCols.has('template_key')) {
        updates.push('template_key = ?');
        params.push(String(template_key || '').trim().toLowerCase() || null);
      }

      if (status !== undefined) {
        const normalized = String(status || '').trim().toLowerCase();
        if (!['active', 'inactive'].includes(normalized)) {
          throw new Error('Invalid status value');
        }
        updates.push('status = ?');
        params.push(normalized);
      }

      if (short_bio !== undefined && siteCols.has('short_bio')) {
        updates.push('short_bio = ?');
        params.push(String(short_bio || '').trim());
      }

      if (description !== undefined && siteCols.has('description')) {
        updates.push('description = ?');
        params.push(String(description || '').trim());
      }

      const hasSiteUpdates = updates.length > 0;

      if (hasSiteUpdates) {
        params.push(Number(siteId));

        const [result] = await this.db.query(
          `UPDATE sites SET ${updates.join(', ')} WHERE site_id = ?`,
          params
        );

        if (!result?.affectedRows) return null;
      } else {
        const [existsRows] = await this.db.query(
          'SELECT site_id FROM sites WHERE site_id = ? LIMIT 1',
          [Number(siteId)]
        );
        if (!Array.isArray(existsRows) || !existsRows.length) return null;
      }

      // Upsert settings values if provided
      const settingsInput = {
        primary_color,
        secondary_color,
        accent_color,
        button_style,
        font_style,
        font_type,
        font_name,
        font_url,
        font_heading,
        font_body,
        font_size_base,
        line_height,
        letter_spacing,
        nav_position,
        logo,
        banner,
        group_photo,
        lead_image,
        instagram_url,
        facebook_url,
        tiktok_url,
        spotify_url,
        x_url,
        youtube_url,
      };
      const normalizedTypography = typography === undefined
        ? undefined
        : (typeof typography === 'string' ? typography : JSON.stringify(typography || {}));
      const normalizedPalette = palette === undefined
        ? undefined
        : (typeof palette === 'string' ? palette : JSON.stringify(palette || []));
      const normalizedTheme = theme === undefined
        ? undefined
        : (typeof theme === 'string' ? theme : JSON.stringify(theme || {}));

      if (normalizedTypography !== undefined) settingsInput.typography = normalizedTypography;
      if (normalizedPalette !== undefined) settingsInput.palette = normalizedPalette;
      if (normalizedTheme !== undefined) settingsInput.theme = normalizedTheme;

      const settingsKeys = Object.keys(settingsInput).filter((key) => settingsInput[key] !== undefined);
      if (settingsCols.size > 0 && settingsKeys.length > 0) {
        const [existingSetting] = await this.db.query(
          'SELECT * FROM sites_setting WHERE site_id = ? LIMIT 1',
          [Number(siteId)]
        );

        if (Array.isArray(existingSetting) && existingSetting.length > 0) {
          const setClauses = [];
          const setParams = [];
          for (const key of settingsKeys) {
            if (!settingsCols.has(key)) continue;
            setClauses.push(`${key} = ?`);
            setParams.push(String(settingsInput[key] ?? '').trim());
          }
          if (setClauses.length > 0) {
            setParams.push(Number(siteId));
            await this.db.query(
              `UPDATE sites_setting SET ${setClauses.join(', ')} WHERE site_id = ?`,
              setParams
            );
          }
        } else {
          const insertColumns = [];
          const insertValues = [];
          const insertParams = [];

          if (settingsCols.has('site_id')) {
            insertColumns.push('site_id');
            insertValues.push('?');
            insertParams.push(Number(siteId));
          }

          for (const key of settingsKeys) {
            if (!settingsCols.has(key)) continue;
            insertColumns.push(key);
            insertValues.push('?');
            insertParams.push(String(settingsInput[key] ?? '').trim());
          }

          if (settingsCols.has('created_at')) {
            insertColumns.push('created_at');
            insertValues.push('NOW()');
          }

          if (insertColumns.length > 0) {
            await this.db.query(
              `INSERT INTO sites_setting (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')})`,
              insertParams
            );
          }
        }
      }

      // Replace members when payload explicitly includes members
      if (members !== undefined && memberCols.size > 0) {
        let parsedMembers = members;
        if (typeof members === 'string') {
          try {
            parsedMembers = JSON.parse(members);
          } catch {
            parsedMembers = [];
          }
        }
        const list = Array.isArray(parsedMembers) ? parsedMembers : [];

        await this.db.query('DELETE FROM site_members WHERE site_id = ?', [Number(siteId)]);

        for (const member of list) {
          const name = String(member?.name || '').trim();
          const role = String(member?.role || '').trim();
          const memberDescription = String(member?.description || '').trim();
          const birthdate = this.normalizeBirthdate(member?.birthdate);
          const storageRole = role || birthdate || null;
          const imageProfile = String(member?.image_profile || member?.image || '').trim();
          if (!name || (!birthdate && !storageRole)) continue;

          const memberColumns = [];
          const memberValues = [];
          const memberParams = [];

          const addMemberValue = (column, value) => {
            if (!memberCols.has(column)) return;
            memberColumns.push(column);
            memberValues.push('?');
            memberParams.push(value);
          };

          addMemberValue('site_id', Number(siteId));
          addMemberValue('name', name);
          addMemberValue('birthdate', birthdate);
          addMemberValue('role', storageRole);
          addMemberValue('description', memberDescription || null);
          addMemberValue('image_profile', imageProfile || null);

          if (memberCols.has('created_at')) {
            memberColumns.push('created_at');
            memberValues.push('NOW()');
          }

          if (memberColumns.length > 0) {
            await this.db.query(
              `INSERT INTO site_members (${memberColumns.join(', ')}) VALUES (${memberValues.join(', ')})`,
              memberParams
            );
          }
        }
      }

      return await this.getWebsiteById(Number(siteId));
    } catch (err) {
      console.error('Update generated website error:', err);
      throw err;
    }
  }

  async getTemplateModel() {
    try {
      if (!this.db) await this.connectAdmin();
      const toTemplateKey = (value) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const getCanonicalTemplateKey = (value) => {
        const normalized = toTemplateKey(value);
        if (!normalized) return '';
        if (normalized.includes('minimal')) return 'minimal';
        if (normalized === 'bini' || normalized === 'bini-template') return 'bini';
        if (normalized === 'modern' || normalized === 'modern-template') return 'modern';
        return normalized;
      };
      const getTemplateDisplayName = (templateKey, fallbackName) => {
        if (templateKey === 'bini') return 'Bini Template';
        if (templateKey === 'modern') return 'Modern Template';
        return String(fallbackName || 'Template').trim();
      };
      const builtInTemplates = [
        { template_id: 1, template_name: 'Bini Template', template_key: 'bini' },
        { template_id: 2, template_name: 'Modern Template', template_key: 'modern' },
      ];

      const hasTemplates = await this.hasTable('templates');
      if (hasTemplates) {
        const [templateColsRows] = await this.db.query('SHOW COLUMNS FROM templates');
        const templateCols = new Set(
          (templateColsRows || []).map((row) => String(row?.Field || '').trim())
        );

        const idExpr = templateCols.has('template_id')
          ? 't.template_id AS template_id'
          : templateCols.has('id')
            ? 't.id AS template_id'
            : 'NULL AS template_id';

        const nameExpr = templateCols.has('template_name')
          ? 't.template_name AS template_name'
          : templateCols.has('name')
            ? 't.name AS template_name'
            : '\'Default Template\' AS template_name';
        const keyExpr = templateCols.has('template_key')
          ? 't.template_key AS template_key'
          : templateCols.has('key')
            ? 't.key AS template_key'
            : 'NULL AS template_key';

        const simpleQuery = `
          SELECT ${idExpr}, ${nameExpr}, ${keyExpr}
          FROM templates t
          ORDER BY template_name ASC
        `;
        const [templateRows] = await this.db.query(simpleQuery);
        if (Array.isArray(templateRows) && templateRows.length > 0) {
          const normalizedRows = templateRows.map((row, index) => ({
            template_id: Number(row?.template_id || index + 100),
            template_name: String(row?.template_name || `Template ${index + 1}`).trim(),
            template_key: getCanonicalTemplateKey(
              row?.template_key || row?.template_name || `template-${index + 1}`,
            ),
          }));

          const byKey = new Map();
          [...builtInTemplates, ...normalizedRows].forEach((template) => {
            const key = getCanonicalTemplateKey(template?.template_key || template?.template_name);
            if (!key || key === 'minimal') return;
            byKey.set(key, {
              ...template,
              template_key: key,
              template_name: getTemplateDisplayName(key, template?.template_name),
            });
          });

          return Array.from(byKey.values());
        }
      }

      return builtInTemplates;
    } catch (err) {
      console.error('Get site names error:', err);
      throw new Error('Failed to fetch site names');
    }
  }
}

export default GenerateModel;
