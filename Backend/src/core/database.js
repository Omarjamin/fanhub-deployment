import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

/**
 * REQUIRE MYSQL_URL (Railway private connection string)
 */
if (!process.env.MYSQL_URL) {
  throw new Error("MYSQL_URL is not defined. Attach MySQL service to backend.");
}

function getAdminDatabaseName() {
  return String(
    process.env.MYSQL_DATABASE ||
      process.env.MYSQLDATABASE ||
      process.env.DB_NAME_ADMIN ||
      process.env.DB_NAME ||
      ""
  ).trim();
}

function getAdminPoolConfig() {
  const rawUrl = String(process.env.MYSQL_URL || "").trim();
  const fallbackDb = getAdminDatabaseName();

  try {
    const parsed = new URL(rawUrl);
    const dbFromUrl = parsed.pathname.replace(/^\/+/, "").trim();

    if (dbFromUrl) {
      return rawUrl;
    }

    if (!fallbackDb) {
      throw new Error(
        "MYSQL_URL has no database segment and no fallback DB variable is set."
      );
    }

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database: fallbackDb || undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  } catch (err) {
    if (
      err &&
      String(err.message || "").includes(
        "MYSQL_URL has no database segment and no fallback DB variable is set."
      )
    ) {
      throw err;
    }
    // Fallback for non-standard mysql URLs.
    return rawUrl;
  }
}

/**
 * Base admin pool (platform_core_db lives here)
 * This uses Railway internal private network.
 */
const adminPool = mysql.createPool(getAdminPoolConfig());

/**
 * Cache containers
 */
const pools = {};
const dynamicDbLookupCache = {};
const siteNameByDomainCache = {};
let adminSiteColumnsCache = null;

/**
 * Normalize keys (domain, path, site_name)
 */
function normalizeSiteKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  const pathMatch = raw.match(/\/fanhub\/(?:community-platform\/)?([^/?#]+)/i);
  return String(pathMatch?.[1] || raw).trim().toLowerCase();
}

function buildSiteKeyVariants(value) {
  const normalized = normalizeSiteKey(value);
  if (!normalized) return [];

  const variants = new Set([normalized]);
  const withoutWebsite = normalized.replace(/-website$/i, "");
  if (withoutWebsite) variants.add(withoutWebsite);
  if (!/-website$/i.test(normalized)) variants.add(`${normalized}-website`);
  return Array.from(variants).filter(Boolean);
}

/**
 * Resolve site_name from domain
 */
async function resolveSiteNameByDomain(domainRaw) {
  const variants = buildSiteKeyVariants(domainRaw);
  if (!variants.length) return "";

  const primaryKey = variants[0];
  if (siteNameByDomainCache[primaryKey]) {
    return siteNameByDomainCache[primaryKey];
  }

  try {
    for (const key of variants) {
      const [rows] = await adminPool.query(
        `
        SELECT site_name
        FROM sites
        WHERE LOWER(TRIM(domain)) = LOWER(TRIM(?))
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [key]
      );

      const siteName = String(rows?.[0]?.site_name || "")
        .trim()
        .toLowerCase();

      if (siteName) {
        variants.forEach((variant) => {
          siteNameByDomainCache[variant] = siteName;
        });
        return siteName;
      }
    }
  } catch (err) {
    console.error("resolveSiteNameByDomain error:", err.message);
  }

  return "";
}

/**
 * Resolve database config from admin DB mapping
 */
async function resolveSiteDatabaseConfig(siteKeyRaw) {
  const variants = buildSiteKeyVariants(siteKeyRaw);
  if (!variants.length) return null;
  const primaryKey = variants[0];

  if (dynamicDbLookupCache[primaryKey]) {
    return dynamicDbLookupCache[primaryKey];
  }

  try {
    if (!adminSiteColumnsCache) {
      const [columns] = await adminPool.query("SHOW COLUMNS FROM sites");
      adminSiteColumnsCache = new Set(
        columns.map((col) => col.Field.toLowerCase())
      );
    }

    const hasCommunityType = adminSiteColumnsCache.has("community_type");

    let site = null;
    for (const key of variants) {
      const whereParts = [
        "LOWER(TRIM(domain)) = LOWER(TRIM(?))",
        "LOWER(TRIM(site_name)) = LOWER(TRIM(?))",
      ];
      const params = [key, key];

      if (hasCommunityType) {
        whereParts.push("LOWER(TRIM(community_type)) = LOWER(TRIM(?))");
        params.push(key);
      }

      const [siteRows] = await adminPool.query(
        `
        SELECT site_id, site_name, domain
        FROM sites
        WHERE ${whereParts.join(" OR ")}
        ORDER BY created_at DESC
        LIMIT 1
        `,
        params
      );

      if (siteRows?.[0]?.site_id) {
        site = siteRows[0];
        break;
      }
    }

    if (!site?.site_id) {
      variants.forEach((variant) => {
        dynamicDbLookupCache[variant] = null;
      });
      return null;
    }

    const [dbRows] = await adminPool.query(
      `
      SELECT db_name, db_host, db_user, db_password
      FROM site_databases
      WHERE site_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [site.site_id]
    );

    const dbConfig = dbRows?.[0] || null;
    variants.forEach((variant) => {
      dynamicDbLookupCache[variant] = dbConfig;
    });
    return dbConfig;
  } catch (err) {
    console.error("resolveSiteDatabaseConfig error:", err.message);
    return null;
  }
}

/**
 * Create pool safely from config
 */
function createPoolFromConfig(config) {
  return mysql.createPool({
    host: config.db_host,
    user: config.db_user,
    password: config.db_password,
    database: config.db_name,
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

/**
 * Main dynamic connector
 */
async function connect(communityTypeRaw) {
  const key = normalizeSiteKey(communityTypeRaw);

  // Admin direct access
  if (key === "admin") {
    return adminPool;
  }

  if (!key) {
    return adminPool;
  }

  // Resolve site_name if domain was passed
  const resolvedSiteName = await resolveSiteNameByDomain(key);
  const lookupKey = resolvedSiteName || key;

  const dbConfig = await resolveSiteDatabaseConfig(lookupKey);

  if (!dbConfig?.db_name) {
    console.warn(`No database mapping found for: ${lookupKey}`);
    return adminPool;
  }

  const poolKey = `site:${lookupKey}`;

  if (!pools[poolKey]) {
    pools[poolKey] = createPoolFromConfig(dbConfig);
  }

  return pools[poolKey];
}

async function connectAdmin() {
  return adminPool;
}

export {
  connect,
  connectAdmin,
  resolveSiteDatabaseConfig,
  resolveSiteNameByDomain,
};
