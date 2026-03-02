import { connectAdmin, connect, resolveSiteDatabaseConfig } from '../../core/database.js';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

async function fetchSites(adminDB, siteKey = 'all', siteName = '') {
  const key = normalize(siteKey);
  const name = normalize(siteName);
  const where = [];
  const params = [];

  if (key && key !== 'all') {
    where.push('(LOWER(TRIM(domain)) = ? OR LOWER(TRIM(site_name)) = ?)');
    params.push(key, key);
  }
  if (name && name !== 'all') {
    where.push('LOWER(TRIM(site_name)) = ?');
    params.push(name);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await adminDB.query(
    `
      SELECT site_id, site_name, domain, status
      FROM sites
      ${whereSql}
      ORDER BY created_at DESC
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
    return mapped.map((x) => x.db_name).filter(Boolean);
  } catch (error) {
    console.error(`Error fetching db_names for "${communityType}":`, error);
    throw error;
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
  const [rows] = await adminDB.query(
    `
      SELECT
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
