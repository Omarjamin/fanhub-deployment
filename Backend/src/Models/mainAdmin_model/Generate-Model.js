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

  async getSiteColumns() {
    if (this.siteColumns) return this.siteColumns;
    await this.ensureSiteCommunityColumn();
    const [rows] = await this.db.query('SHOW COLUMNS FROM sites');
    this.siteColumns = new Set((rows || []).map((row) => String(row?.Field || '').trim()));
    return this.siteColumns;
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

  async buildSiteSelectQuery({ whereClause = '', limitOne = false } = {}) {
    const siteCols = await this.getSiteColumns();
    const hasSettingsTable = await this.hasTable('sites_setting');
    const settingsCols = hasSettingsTable ? await this.getTableColumns('sites_setting') : new Set();

    const pickSite = (column, fallbackSql = `NULL AS ${column}`) => (
      siteCols.has(column) ? `s.${column}` : fallbackSql
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
          settingsCols.has('primary_color') ? 'ss.primary_color' : 'NULL AS primary_color',
          settingsCols.has('secondary_color') ? 'ss.secondary_color' : 'NULL AS secondary_color',
          settingsCols.has('accent_color') ? 'ss.accent_color' : 'NULL AS accent_color',
          settingsCols.has('button_style') ? 'ss.button_style' : 'NULL AS button_style',
          settingsCols.has('font_style') ? 'ss.font_style' : 'NULL AS font_style',
          settingsCols.has('font_type') ? 'NULLIF(ss.font_type, "") AS font_type' : 'NULL AS font_type',
          settingsCols.has('font_name') ? 'NULLIF(ss.font_name, "") AS font_name' : 'NULL AS font_name',
          settingsCols.has('font_url') ? 'NULLIF(ss.font_url, "") AS font_url' : 'NULL AS font_url',
          settingsCols.has('font_heading') ? 'NULLIF(ss.font_heading, "") AS font_heading' : 'NULL AS font_heading',
          settingsCols.has('font_body') ? 'NULLIF(ss.font_body, "") AS font_body' : 'NULL AS font_body',
          settingsCols.has('font_size_base') ? 'NULLIF(ss.font_size_base, "") AS font_size_base' : 'NULL AS font_size_base',
          settingsCols.has('line_height') ? 'NULLIF(ss.line_height, "") AS line_height' : 'NULL AS line_height',
          settingsCols.has('letter_spacing') ? 'NULLIF(ss.letter_spacing, "") AS letter_spacing' : 'NULL AS letter_spacing',
          settingsCols.has('palette') ? 'ss.palette' : 'NULL AS palette',
          settingsCols.has('typography') ? 'ss.typography' : 'NULL AS typography',
          settingsCols.has('theme') ? 'ss.theme' : 'NULL AS theme',
          settingsCols.has('nav_position') ? 'ss.nav_position' : 'NULL AS nav_position',
          settingsCols.has('logo') ? 'ss.logo' : 'NULL AS logo',
          settingsCols.has('banner') ? 'ss.banner' : 'NULL AS banner',
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
    members,
  }) {
    if (!this.db) await this.connectAdmin();
    const siteCols = await this.getSiteColumns();

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
        const imageProfile = String(member?.image || member?.image_profile || '').trim() || null;

        if (!name || !role) continue;

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
        addMemberValue('role', role);
        addMemberValue('description', memberDescription);
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
      const sitesQuery = await this.buildSiteSelectQuery();
      const [sites] = await this.db.query(sitesQuery);

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
        SELECT id, name, role, description, image_profile
        FROM site_members
        WHERE site_id = ?
        ORDER BY created_at ASC
      `,
      `
        SELECT member_id AS id, name, role, description, image_profile
        FROM site_members
        WHERE site_id = ?
        ORDER BY created_at ASC
      `,
      `
        SELECT name, role, description, image_profile
        FROM site_members
        WHERE site_id = ?
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

  async getWebsiteById(siteId) {
    try {
      if (!this.db) await this.connectAdmin();
      const siteQuery = await this.buildSiteSelectQuery({
        whereClause: 's.site_id = ?',
        limitOne: true,
      });
      const [sites] = await this.db.query(siteQuery, [siteId]);
      if (!sites || sites.length === 0) return null;
      const site = sites[0];

      const members = await this.getSiteMembersSafe(siteId);
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
      const lookupColumn = siteCols.has('community_type') ? 'community_type' : 'domain';
      const siteQuery = await this.buildSiteSelectQuery({
        whereClause: `LOWER(TRIM(s.${lookupColumn})) = LOWER(TRIM(?))`,
        limitOne: true,
      });
      const [sites] = await this.db.query(siteQuery, [communityType]);
      let site = Array.isArray(sites) && sites.length > 0 ? sites[0] : null;

      if (!site) {
        const key = String(communityType || '').trim().toLowerCase();
        const communityRows = await this.getCommunityTableSelections();
        const matchedCommunity = communityRows.find((row) => {
          const domain = String(row?.domain || '').trim().toLowerCase();
          const siteName = String(row?.site_name || '').trim().toLowerCase();
          return domain === key || siteName === key;
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

      const members = await this.getSiteMembersSafe(site.site_id);
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
      status,
      short_bio,
      description,
      primary_color,
      secondary_color,
      accent_color,
      button_style,
      font_style,
      nav_position,
      logo,
      banner,
      members,
    }
  ) {
    try {
      if (!this.db) await this.connectAdmin();
      const siteCols = await this.getSiteColumns();
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
        nav_position,
        logo,
        banner,
      };
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
          const imageProfile = String(member?.image_profile || member?.image || '').trim();
          if (!name || !role) continue;

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
          addMemberValue('role', role);
          addMemberValue('description', memberDescription);
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

        const simpleQuery = `
          SELECT ${idExpr}, ${nameExpr}
          FROM templates t
          ORDER BY template_name ASC
        `;
        const [templateRows] = await this.db.query(simpleQuery);
        if (Array.isArray(templateRows) && templateRows.length > 0) {
          return templateRows;
        }
      }

      const hasSites = await this.hasTable('sites');
      if (hasSites) {
        const [siteRows] = await this.db.query(`
          SELECT
            site_id AS template_id,
            CONCAT(site_name, ' Template') AS template_name
          FROM sites
          ORDER BY site_name ASC
        `);
        if (Array.isArray(siteRows) && siteRows.length > 0) {
          return siteRows;
        }
      }

      return [{ template_id: 1, template_name: 'Default Template' }];
    } catch (err) {
      console.error('Get site names error:', err);
      throw new Error('Failed to fetch site names');
    }
  }
}

export default GenerateModel;
