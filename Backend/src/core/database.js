import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Default Pools
const pools = {};
const dynamicDbLookupCache = {};
const siteNameByDomainCache = {};
let adminSiteColumnsCache = null;
let communityTableEnsured = false;
const poolHealthCache = new Map();
const poolHealthLogCache = new Map();

function isSingleDatabaseMode() {
  const explicitSingle = String(
    process.env.SINGLE_DB_MODE ||
    process.env.DB_SINGLE_MODE ||
    process.env.FORCE_SINGLE_DB ||
    '',
  ).trim();
  if (['1', 'true', 'yes', 'on'].includes(explicitSingle.toLowerCase())) {
    return true;
  }

  const appDb = String(process.env.DB_NAME || '').trim().toLowerCase();
  const adminDb = String(process.env.DB_NAME_ADMIN || '').trim().toLowerCase();
  return Boolean(appDb && adminDb && appDb === adminDb);
}

function normalizeSiteKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  const pathMatch = raw.match(/\/fanhub\/(?:community-platform\/)?([^/?#]+)/i);
  return String(pathMatch?.[1] || raw).trim().toLowerCase();
}

function guessDbNamesFromSite(site = {}, lookupKey = "") {
  const siteName = normalizeSiteKey(site.site_name || "");
  const domain = normalizeSiteKey(site.domain || "");
  const key = normalizeSiteKey(lookupKey || "");
  const guesses = new Set();

  if (siteName) guesses.add(siteName);
  if (domain) guesses.add(domain);
  if (key) guesses.add(key);

  // Common cleanup for domains like "bini-website" -> "bini"
  const baseCandidates = [siteName, domain, key].filter(Boolean);
  baseCandidates.forEach((value) => {
    guesses.add(value.replace(/-website$/i, ""));
    guesses.add(value.replace(/[^a-z0-9_]/gi, ""));
  });

  return [...guesses].filter(Boolean);
}

async function ensureCommunityTable(adminPool) {
  if (communityTableEnsured) return;
  await adminPool.query(`
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
  communityTableEnsured = true;
}

// Function to create a pool given env prefix
function createPool(envPrefix, fallback = {}) {
  return mysql.createPool({
    host: process.env[`${envPrefix}_DB_HOST`] || fallback.host || process.env.DB_HOST,
    user: process.env[`${envPrefix}_DB_USER`] || fallback.user || process.env.DB_USER || "root",
    password: process.env[`${envPrefix}_DB_PASSWORD`] ?? fallback.password ?? process.env.DB_PASSWORD ?? "",
    database: process.env[`${envPrefix}_DB_NAME`] || fallback.database || process.env.DB_NAME,
    port: process.env[`${envPrefix}_DB_PORT`] || fallback.port || process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

function createPoolFromMysqlUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const dbName = String(parsed.pathname || "").replace(/^\/+/, "").trim();
    return mysql.createPool({
      host: parsed.hostname,
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: dbName || undefined,
      port: Number(parsed.port || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  } catch (err) {
    console.error("Invalid MYSQL_URL:", err?.message || err);
    return null;
  }
}

async function isPoolHealthy(pool, cacheKey = "", ttlMs = 30000) {
  if (!pool) return false;
  const key = String(cacheKey || "").trim().toLowerCase() || "default";
  const now = Date.now();
  const cached = poolHealthCache.get(key);
  const cachedTtl = cached?.ok ? ttlMs : Math.max(ttlMs, 120000);
  if (cached && now - cached.ts < cachedTtl) {
    return Boolean(cached.ok);
  }

  try {
    await pool.query("SELECT 1 AS ok");
    poolHealthCache.set(key, { ok: true, ts: now });
    return true;
  } catch (error) {
    poolHealthCache.set(key, { ok: false, ts: now });
    const code = String(error?.code || "").trim();
    const message = String(error?.message || error || "").trim();
    const logKey = `${key}:${code}:${message}`;
    const lastLogAt = Number(poolHealthLogCache.get(logKey) || 0);
    if (now - lastLogAt > 180000) {
      const level = code === "ECONNREFUSED" || /pool is closed/i.test(message) ? "warn" : "error";
      console[level]("[database] pool health check failed", { key, code, message });
      poolHealthLogCache.set(logKey, now);
    }
    return false;
  }
}

// 🔹 Pre-create pools (optional: lazy-load)
const mysqlUrlPool = createPoolFromMysqlUrl(
  process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL
);
pools['admin'] = mysqlUrlPool || createPool('DB_ADMIN', {
  host: process.env.DB_HOST_ADMIN,
  user: process.env.DB_USER_ADMIN,
  password: process.env.DB_PASSWORD_ADMIN,
  database: process.env.DB_NAME_ADMIN,
  port: process.env.DB_PORT_ADMIN,
});

pools['default'] = mysqlUrlPool || createPool('DB');

async function resolveSiteDatabaseConfig(domainOrSiteRaw) {
  const key = normalizeSiteKey(domainOrSiteRaw);
  if (!key) return null;

  if (dynamicDbLookupCache[key]) {
    return dynamicDbLookupCache[key];
  }

  try {
    const adminPool = pools['admin'];
    if (!adminPool) return null;

    if (!adminSiteColumnsCache) {
      const [columnRows] = await adminPool.query('SHOW COLUMNS FROM sites');
      adminSiteColumnsCache = new Set(
        (columnRows || []).map((row) => String(row?.Field || '').trim().toLowerCase()),
      );
    }

    const hasCommunityType = adminSiteColumnsCache.has('community_type');
    const whereParts = [
      'LOWER(TRIM(s.domain)) = LOWER(TRIM(?))',
      'LOWER(TRIM(s.site_name)) = LOWER(TRIM(?))',
    ];
    const queryParams = [key, key];
    if (hasCommunityType) {
      whereParts.push('LOWER(TRIM(s.community_type)) = LOWER(TRIM(?))');
      queryParams.push(key);
    }

    // 1) Resolve site by domain first. Fallback to site_name for compatibility.
    const siteQuery = `
      SELECT
        s.site_id,
        s.site_name,
        s.domain,
        ${hasCommunityType ? 's.community_type' : 'NULL AS community_type'}
      FROM sites s
      WHERE ${whereParts.join('\n         OR ')}
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    const [siteRows] = await adminPool.query(siteQuery, queryParams);
    const site = siteRows?.[0] || null;
    if (!site?.site_id) {
      dynamicDbLookupCache[key] = null;
      return null;
    }

    // 2) Use resolved site identity to fetch DB config.
    const dbQuery = `
      SELECT
        sd.db_name,
        sd.db_host,
        sd.db_user,
        sd.db_password,
        ? AS site_name,
        ? AS site_domain
      FROM site_databases sd
      WHERE sd.site_id = ?
      ORDER BY sd.created_at DESC
      LIMIT 1
    `;
    const [rows] = await adminPool.query(dbQuery, [site.site_name, site.domain, site.site_id]);
    let dbConfig = rows?.[0] || null;

    // Fallback for legacy setups without site_databases row:
    // infer DB name from site_name/domain and verify it exists.
    if (!dbConfig?.db_name) {
      const guessedDbNames = guessDbNamesFromSite(site, key);
      for (const dbName of guessedDbNames) {
        const [schemaRows] = await adminPool.query(
          `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE LOWER(SCHEMA_NAME) = LOWER(?) LIMIT 1`,
          [dbName],
        );
        if (!schemaRows?.length) continue;
        dbConfig = {
          db_name: String(schemaRows[0].SCHEMA_NAME || dbName),
          db_host: process.env.DB_HOST || "localhost",
          db_user: process.env.DB_USER || "root",
          db_password: process.env.DB_PASSWORD ?? "",
          site_name: site.site_name,
          site_domain: site.domain,
        };
        break;
      }
    }
    dynamicDbLookupCache[key] = dbConfig;
    if (dbConfig && site.site_name) {
      dynamicDbLookupCache[String(site.site_name).trim().toLowerCase()] = dbConfig;
    }
    if (dbConfig && site.domain) {
      dynamicDbLookupCache[String(site.domain).trim().toLowerCase()] = dbConfig;
    }
    if (dbConfig && site.community_type) {
      dynamicDbLookupCache[String(site.community_type).trim().toLowerCase()] = dbConfig;
    }
    return dbConfig;
  } catch (error) {
    console.error('resolveSiteDatabaseConfig failed:', error?.message || error);
    return null;
  }
}

async function resolveSiteNameByDomain(domainOrPathRaw) {
  const domain = normalizeSiteKey(domainOrPathRaw);
  if (!domain) return "";
  if (siteNameByDomainCache[domain]) return siteNameByDomainCache[domain];

  try {
    const adminPool = pools["admin"];
    if (!adminPool) return "";

    const siteQuery = `
      SELECT s.site_name
      FROM sites s
      WHERE LOWER(TRIM(s.domain)) = LOWER(TRIM(?))
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    const [rows] = await adminPool.query(siteQuery, [domain]);
    const siteName = String(rows?.[0]?.site_name || "").trim().toLowerCase();
    if (siteName) {
      siteNameByDomainCache[domain] = siteName;
      return siteName;
    }
  } catch (error) {
    console.error("resolveSiteNameByDomain failed:", error?.message || error);
  }
  return "";
}

async function resolveCommunityContext(siteKeyRaw) {
  const key = normalizeSiteKey(siteKeyRaw);
  if (!key) return null;

  const adminPool = pools["admin"];
  if (!adminPool) return null;

  try {
    if (!adminSiteColumnsCache) {
      const [columnRows] = await adminPool.query("SHOW COLUMNS FROM sites");
      adminSiteColumnsCache = new Set(
        (columnRows || []).map((row) => String(row?.Field || "").trim().toLowerCase()),
      );
    }

    const hasCommunityType = adminSiteColumnsCache.has("community_type");
    const whereParts = [
      "LOWER(TRIM(s.domain)) = LOWER(TRIM(?))",
      "LOWER(TRIM(s.site_name)) = LOWER(TRIM(?))",
    ];
    const params = [key, key];
    if (hasCommunityType) {
      whereParts.push("LOWER(TRIM(s.community_type)) = LOWER(TRIM(?))");
      params.push(key);
    }

    const [rows] = await adminPool.query(
      `
      SELECT
        s.site_id,
        ${adminSiteColumnsCache.has("community_id") ? "s.community_id," : ""}
        s.site_name,
        s.domain,
        s.status
      FROM sites s
      WHERE ${whereParts.join(" OR ")}
      ORDER BY s.created_at DESC
      LIMIT 1
      `,
      params,
    );

    const row = rows?.[0];
    if (!row?.site_id) return null;

    await ensureCommunityTable(adminPool);
    const linkedCommunityId = Number(
      row?.community_id || row?.site_id || 0,
    ) || Number(row?.site_id || 0);

    await adminPool.query(
      `
      INSERT INTO community_table (community_id, site_name, domain, status)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        site_name = VALUES(site_name),
        domain = VALUES(domain),
        status = VALUES(status)
      `,
      [
        linkedCommunityId,
        String(row.site_name || "").trim(),
        String(row.domain || "").trim(),
        String(row.status || "active").trim() || "active",
      ],
    );

    return {
      community_id: linkedCommunityId,
      site_name: String(row.site_name || "").trim(),
      domain: String(row.domain || "").trim(),
      status: String(row.status || "active").trim() || "active",
    };
  } catch (error) {
    console.error("resolveCommunityContext failed:", error?.message || error);
    return null;
  }
}

// ✅ Dynamic connect function
async function connect(community_type) {
  // Normalize
  const type = normalizeSiteKey(community_type);

  if (type === 'admin') return pools['admin'];

  // Single DB mode: always use default pool for non-admin requests.
  // Community isolation is handled at query-level via community_id/site scope.
  if (isSingleDatabaseMode()) {
    return pools['default'];
  }
  
  // For other community types, you can have dedicated env vars like:
  // DB_BINI_HOST, DB_BINI_USER, etc.
  if (type && process.env[`DB_${type.toUpperCase()}_DB_NAME`]) {
    if (!pools[type]) {
      pools[type] = createPool(`DB_${type.toUpperCase()}`, {
        database: process.env[`DB_${type.toUpperCase()}_DB_NAME`],
      });
    }
    const healthy = await isPoolHealthy(pools[type], `env:${type}`);
    if (healthy) return pools[type];
    return pools['default'];
  }

  // Resolve from generated sites DB mapping (sites + site_databases in admin DB)
  if (type) {
    // Required flow:
    // 1) domain -> site_name (sites table in platform_core_db)
    // 2) site_name -> db mapping (site_databases)
    const resolvedSiteName = await resolveSiteNameByDomain(type);
    const lookupKey = resolvedSiteName || type;
    const dbConfig = await resolveSiteDatabaseConfig(lookupKey);
    if (dbConfig?.db_name) {
      const poolKey = `site:${lookupKey}`;
      if (!pools[poolKey]) {
        pools[poolKey] = mysql.createPool({
          host: dbConfig.db_host || process.env.DB_HOST || 'localhost',
          user: dbConfig.db_user || process.env.DB_USER || 'root',
          password: dbConfig.db_password ?? process.env.DB_PASSWORD ?? '',
          database: dbConfig.db_name,
          port: process.env.DB_PORT || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      }
      const healthy = await isPoolHealthy(pools[poolKey], poolKey);
      if (healthy) return pools[poolKey];
      try {
        await pools[poolKey].end();
      } catch (_) {}
      delete pools[poolKey];
      return pools['default'];
    }
  }

  // fallback to default
  return pools['default'];
}

async function connectAdmin() {
  return pools['admin'];
}

export {
  connect,
  connectAdmin,
  resolveSiteDatabaseConfig,
  resolveSiteNameByDomain,
  resolveCommunityContext,
};
