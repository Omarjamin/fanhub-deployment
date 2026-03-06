import { connectAdmin, connect, resolveSiteDatabaseConfig } from '../../core/database.js';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

const ADMIN_DEBUG = String(process.env.ADMIN_DEBUG || '1').trim() !== '0';
const debugLog = (scope, payload) => {
  if (!ADMIN_DEBUG) return;
  console.log(`[ADMIN DEBUG][SiteModel][${scope}]`, payload);
};

async function hasTable(adminDB, tableName) {
  const [rows] = await adminDB.query('SHOW TABLES LIKE ?', [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function getTableColumns(adminDB, tableName) {
  if (!(await hasTable(adminDB, tableName))) return new Set();
  const [rows] = await adminDB.query(`SHOW COLUMNS FROM ${tableName}`);
  return new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
}

async function fetchSites(adminDB, siteKey = 'all', siteName = '') {
  const key = normalize(siteKey);
  const name = normalize(siteName);
  const where = [];
  const params = [];
  const siteCols = await getTableColumns(adminDB, 'sites');
  const hasSiteCommunityId = siteCols.has('community_id');
  const hasSiteDomain = siteCols.has('domain');
  const hasSiteName = siteCols.has('site_name');
  const hasSiteCreatedAt = siteCols.has('created_at');
  const hasCommunities = await hasTable(adminDB, 'communities');
  const hasCommunityTable = await hasTable(adminDB, 'community_table');
  const communityCols = hasCommunities ? await getTableColumns(adminDB, 'communities') : new Set();
  const communityPk = communityCols.has('community_id')
    ? 'community_id'
    : (communityCols.has('id') ? 'id' : null);
  const hasCommunityName = communityCols.has('name');
  const joins = [];

  if (hasCommunities && hasSiteCommunityId && communityPk) {
    joins.push(`LEFT JOIN communities c ON c.${communityPk} = s.community_id`);
  }
  if (hasCommunityTable && hasSiteCommunityId) {
    joins.push('LEFT JOIN community_table ct ON ct.community_id = s.community_id');
  }

  if (key && key !== 'all') {
    const predicates = [];
    if (hasSiteDomain) {
      predicates.push('LOWER(TRIM(s.domain)) = ?');
      params.push(key);
    }
    if (hasSiteName) {
      predicates.push('LOWER(TRIM(s.site_name)) = ?');
      params.push(key);
    }

    if (hasCommunities && hasCommunityName && hasSiteCommunityId && communityPk) {
      predicates.push('LOWER(TRIM(c.name)) = ?');
      params.push(key);
    }

    if (hasCommunityTable) {
      predicates.push('LOWER(TRIM(ct.domain)) = ?');
      predicates.push('LOWER(TRIM(ct.site_name)) = ?');
      params.push(key, key);
    }

    if (key.endsWith('-website')) {
      const trimmedKey = key.replace(/-website$/, '');
      if (trimmedKey) {
        if (hasSiteDomain) {
          predicates.push('LOWER(TRIM(s.domain)) = ?');
          params.push(trimmedKey);
        }
        if (hasSiteName) {
          predicates.push('LOWER(TRIM(s.site_name)) = ?');
          params.push(trimmedKey);
        }
        if (hasCommunities && hasCommunityName && hasSiteCommunityId && communityPk) {
          predicates.push('LOWER(TRIM(c.name)) = ?');
          params.push(trimmedKey);
        }
      }
    } else {
      const websiteKey = `${key}-website`;
      if (hasSiteDomain) {
        predicates.push('LOWER(TRIM(s.domain)) = ?');
        params.push(websiteKey);
      }
      if (hasCommunityTable) {
        predicates.push('LOWER(TRIM(ct.domain)) = ?');
        params.push(websiteKey);
      }
    }

    if (predicates.length) {
      where.push(`(${predicates.join(' OR ')})`);
    }
  }
  if (name && name !== 'all' && hasSiteName) {
    where.push('LOWER(TRIM(s.site_name)) = ?');
    params.push(name);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = hasSiteCreatedAt ? 's.created_at DESC' : 's.site_id DESC';
  const [rows] = await adminDB.query(
    `
      SELECT DISTINCT s.site_id, s.site_name, s.domain, s.status
      FROM sites s
      ${joins.join('\n      ')}
      ${whereSql}
      ORDER BY ${orderBy}
    `,
    params,
  );
  return rows || [];
}

async function enrichSitesWithDbConfig(sites = []) {
  const result = [];
  for (const site of sites) {
    const lookupKey = normalize(site?.domain || site?.site_name);
    if (!lookupKey) continue;

    const cfg = await resolveSiteDatabaseConfig(lookupKey);
    const dbName = String(cfg?.db_name || '').trim();
    if (!dbName) continue;

    result.push({
      site_id: site.site_id,
      site_name: site.site_name,
      domain: site.domain,
      db_name: dbName,
    });
  }
  return result;
}

export async function getDBNamesByCommunityType(communityType, siteName = '') {
  try {
    const adminDB = await connectAdmin();
    const sites = await fetchSites(adminDB, communityType, siteName);
    const mapped = await enrichSitesWithDbConfig(sites);
    const dbNames = mapped.map((x) => x.db_name).filter(Boolean);

    // Single-DB deployment fallback:
    // if site_databases has no row for a community, use the app DB.
    if (dbNames.length === 0) {
      const defaultDb = String(
        process.env.DB_NAME ||
        process.env.DB_DB_NAME ||
        '',
      ).trim();

      if (defaultDb) {
        debugLog('getDBNamesByCommunityType:fallback-default-db', {
          communityType,
          siteName,
          defaultDb,
        });
        return [defaultDb];
      }
    }

    debugLog('getDBNamesByCommunityType:resolved', {
      communityType,
      siteName,
      dbNames,
      siteCount: sites.length,
      mappedCount: mapped.length,
    });
    return dbNames;
  } catch (error) {
    console.error(`Error fetching db_names for "${communityType}":`, error);
    const defaultDb = String(
      process.env.DB_NAME ||
      process.env.DB_DB_NAME ||
      '',
    ).trim();
    if (defaultDb) {
      debugLog('getDBNamesByCommunityType:error-fallback-default-db', {
        communityType,
        siteName,
        defaultDb,
        error: String(error?.message || error || ''),
      });
      return [defaultDb];
    }
    return [];
  }
}

export async function getCommunityAll(communityType = 'all', siteName = '') {
  try {
    const adminDB = await connectAdmin();
    const sites = await fetchSites(adminDB, communityType, siteName);
    if (!sites.length) {
      return {
        sites: [],
        totals: { totalRevenue: 0, totalOrders: 0 },
      };
    }

    const mapped = await enrichSitesWithDbConfig(sites);
    const results = [];
    const totals = { totalRevenue: 0, totalOrders: 0 };

    for (const site of mapped) {
      const dbName = site.db_name;
      if (!dbName) continue;

      try {
        const siteDB = await connect(dbName);
        const [[{ revenue = 0 }]] = await siteDB.query(
          'SELECT IFNULL(SUM(total_amount),0) AS revenue FROM daily_revenue',
        );
        const [[{ orders = 0 }]] = await siteDB.query(
          'SELECT COUNT(*) AS orders FROM orders',
        );

        results.push({
          site_name: site.site_name,
          domain: site.domain,
          db_name: dbName,
          revenue,
          orders,
        });

        totals.totalRevenue += Number(revenue || 0);
        totals.totalOrders += Number(orders || 0);
      } catch (siteErr) {
        console.error(`Error aggregating site "${dbName}":`, siteErr);
      }
    }

    return { sites: results, totals };
  } catch (error) {
    console.error('Error fetching community data:', error);
    throw error;
  }
}

// Backward-compatible helper used by Report-Model:
// keep key name "community_type" but map it to domain since community_type column is removed.
export async function getSiteCommunityTypeMap() {
  const adminDB = await connectAdmin();
  const [siteCols] = await adminDB.query('SHOW COLUMNS FROM sites');
  const siteColumnSet = new Set((siteCols || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
  const communityIdSelect = siteColumnSet.has('community_id') ? 'community_id,' : 'NULL AS community_id,';
  const [rows] = await adminDB.query(
    `
      SELECT
        site_id,
        ${communityIdSelect}
        site_name,
        domain AS community_type,
        domain
      FROM sites
      ORDER BY site_name ASC
    `,
  );
  const mapped = [];
  for (const row of rows || []) {
    const cfg = await resolveSiteDatabaseConfig(row?.domain || row?.site_name || '');
    mapped.push({
      ...row,
      db_name: String(cfg?.db_name || '').trim() || null,
    });
  }
  return mapped;
}
