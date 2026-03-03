import { connectAdmin } from '../../core/database.js';
import mysql from 'mysql2/promise';

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

  async getSiteColumns() {
    if (this.siteColumns) return this.siteColumns;
    const [rows] = await this.db.query('SHOW COLUMNS FROM sites');
    this.siteColumns = new Set((rows || []).map((row) => String(row?.Field || '').trim()));
    return this.siteColumns;
  }

  async getTableColumns(tableName) {
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

  async buildSiteSelectQuery({ whereClause = '', limitOne = false } = {}) {
    const siteCols = await this.getSiteColumns();
    const hasSettingsTable = await this.hasTable('sites_setting');

    const pickSite = (column, fallbackSql = `NULL AS ${column}`) => (
      siteCols.has(column) ? `s.${column}` : fallbackSql
    );

    const siteFields = [
      's.site_id',
      's.site_name',
      pickSite('short_bio'),
      pickSite('description'),
      's.domain',
      pickSite('community_type', 's.domain AS community_type'),
      pickSite('status'),
      pickSite('created_at'),
    ];

    const settingFields = hasSettingsTable
      ? [
          'ss.primary_color',
          'ss.secondary_color',
          'ss.accent_color',
          'ss.button_style',
          'ss.font_style',
          'ss.nav_position',
          'ss.logo',
          'ss.banner',
        ]
      : [
          'NULL AS primary_color',
          'NULL AS secondary_color',
          'NULL AS accent_color',
          'NULL AS button_style',
          'NULL AS font_style',
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
    primaryColor,
    secondaryColor,
    accentColor,
    buttonStyle,
    fontStyle,
    navPosition,
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

    if (!normalizedSiteName) throw new Error('site_name is required');
    if (!normalizedDomain) throw new Error('domain is required');

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

    const settingsCols = await this.getTableColumns('sites_setting');
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
      addSettingValue('nav_position', navPosition);
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

    const dbName = String(db_name || `community_${normalizedCommunityType.toLowerCase()}`).trim();
    await this.db.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    const dbHost = db_host || process.env.DB_HOST || 'localhost';
    const dbUser = db_user || process.env.DB_USER || 'root';
    const dbPassword = db_password ?? process.env.DB_PASSWORD ?? '';

    const siteDbCols = await this.getTableColumns('site_databases');
    if (siteDbCols.size > 0) {
      const dbColumns = [];
      const dbValues = [];
      const dbParams = [];

      const addDbValue = (column, value) => {
        if (!siteDbCols.has(column)) return;
        dbColumns.push(column);
        dbValues.push('?');
        dbParams.push(value);
      };

      addDbValue('site_id', siteId);
      addDbValue('db_name', dbName);
      addDbValue('db_host', dbHost);
      addDbValue('db_user', dbUser);
      addDbValue('db_password', dbPassword);

      if (siteDbCols.has('created_at')) {
        dbColumns.push('created_at');
        dbValues.push('NOW()');
      }

      if (dbColumns.length > 0) {
        await this.db.query(
          `INSERT INTO site_databases (${dbColumns.join(', ')}) VALUES (${dbValues.join(', ')})`,
          dbParams
        );
      }
    }

    const pool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
    });
    const tablesSQL = [
    // carts
      
      `CREATE TABLE IF NOT EXISTS user_suspensions (
         suspension_id int(11) NOT NULL AUTO_INCREMENT,
         user_id int(11) NOT NULL,
         imposed_by_admin_id int(11) DEFAULT NULL,
         reason text DEFAULT NULL,
         starts_at datetime NOT NULL DEFAULT current_timestamp(),
         ends_at datetime NOT NULL,
         duration_days int(11) NOT NULL DEFAULT 3,
         status enum('active','expired','lifted') NOT NULL DEFAULT 'active',
         created_at datetime DEFAULT current_timestamp(),
         updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
         PRIMARY KEY (suspension_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,


    `CREATE TABLE IF NOT EXISTS carts (
      cart_id INT(11) NOT NULL AUTO_INCREMENT,
      user_id INT(11) NOT NULL,
      community_id INT(11) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (cart_id),
      UNIQUE KEY unique_user_community (user_id, community_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    `CREATE TABLE IF NOT EXISTS reports  (
       report_id int(11) NOT NULL AUTO_INCREMENT,
       reporter_id int(11) NOT NULL,
       reported_user_id int(11) NOT NULL,
       report_type enum('chat','post') NOT NULL,
       message_id int(11) DEFAULT NULL,
       post_id int(11) DEFAULT NULL,
       reason  enum('harassment','sending fake links','inappropriate chat','malicious photo','inappropriate picture') NOT NULL,
       status  enum('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
       admin_notes text DEFAULT NULL,
       created_at timestamp NOT NULL DEFAULT current_timestamp(),
       updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
       PRIMARY KEY (report_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,


    // cart_items
    `CREATE TABLE IF NOT EXISTS cart_items (
      item_id INT(11) NOT NULL AUTO_INCREMENT,
      cart_id INT(11) NOT NULL,
      variant_id INT(11) NOT NULL,
      quantity INT(11) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (item_id),
      UNIQUE KEY unique_cart_variant (cart_id, variant_id),
      KEY idx_cart_items_cart_id (cart_id),
      KEY idx_cart_items_variant_id (variant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // collections
    `CREATE TABLE IF NOT EXISTS collections (
      collection_id INT(11) NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      img_url VARCHAR(250) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // collection_categories
    `CREATE TABLE IF NOT EXISTS collection_categories (
      category_id INT(11) NOT NULL AUTO_INCREMENT,
      collection_id INT(11) NOT NULL,
      category_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (category_id),
      KEY idx_collection_categories_collection_id (collection_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // comments
    `CREATE TABLE IF NOT EXISTS comments (
      comment_id INT(11) NOT NULL AUTO_INCREMENT,
      post_id INT(11) DEFAULT NULL,
      user_id INT(11) DEFAULT NULL,
      content TEXT NOT NULL,
      parent_comment_id INT(11) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (comment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // communities
    `CREATE TABLE IF NOT EXISTS communities (
      community_id INT(11) NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (community_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // community_threads
    `CREATE TABLE IF NOT EXISTS community_threads (
      id INT(11) NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      venue TEXT NOT NULL,
      date DATE NOT NULL,
      author VARCHAR(50) NOT NULL,
      is_pinned TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // daily_revenue
    `CREATE TABLE IF NOT EXISTS daily_revenue (
      id INT(11) NOT NULL AUTO_INCREMENT,
      order_id INT(11) NULL,
      date DATE NOT NULL,
      time TIME NULL,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_daily_revenue_order_id (order_id),
      KEY idx_daily_revenue_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // discography
    `CREATE TABLE IF NOT EXISTS discography (
      album_id INT(11) NOT NULL AUTO_INCREMENT,
      title VARCHAR(100) NOT NULL,
      year YEAR(4) DEFAULT NULL,
      cover_image VARCHAR(255) DEFAULT NULL,
      songs INT(100) NOT NULL,
      album_link TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (album_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // events
    `CREATE TABLE IF NOT EXISTS events (
      event_id INT(11) NOT NULL AUTO_INCREMENT,
      ticket_link TEXT NOT NULL,
      image_url VARCHAR(255) DEFAULT NULL,
      PRIMARY KEY (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // follows
    `CREATE TABLE IF NOT EXISTS follows (
      follow_id INT(11) NOT NULL AUTO_INCREMENT,
      follower_id INT(11) DEFAULT NULL,
      followed_id INT(11) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follow_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // hashtags
    `CREATE TABLE IF NOT EXISTS hashtags (
      hashtag_id INT(11) NOT NULL AUTO_INCREMENT,
      post_id INT(11) DEFAULT NULL,
      tag VARCHAR(255) NOT NULL,
      PRIMARY KEY (hashtag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;`,

    // likes
    `CREATE TABLE IF NOT EXISTS likes (
      like_id INT(11) NOT NULL AUTO_INCREMENT,
      post_id INT(11) DEFAULT NULL,
      user_id INT(11) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      like_type VARCHAR(20) NOT NULL DEFAULT 'post',
      PRIMARY KEY (like_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // messages
    `CREATE TABLE IF NOT EXISTS messages (
      message_id INT(11) NOT NULL AUTO_INCREMENT,
      sender_id INT(11) NOT NULL,
      receiver_id INT(11) NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read TINYINT(1) DEFAULT 0,
      read_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (message_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // music
    `CREATE TABLE IF NOT EXISTS music (
      music_id INT(11) NOT NULL AUTO_INCREMENT,
      album_id INT(11) NOT NULL,
      title VARCHAR(150) NOT NULL,
      duration TIME DEFAULT NULL,
      audio_url VARCHAR(255) DEFAULT NULL,
      lyrics TEXT DEFAULT NULL,
      PRIMARY KEY (music_id),
      KEY album_id (album_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT(11) NOT NULL AUTO_INCREMENT,
      user_id INT(11) DEFAULT NULL,
      activity_type ENUM('like','comment','repost','follow','warning','suspended') NOT NULL,
      source_user_id INT(11) DEFAULT NULL,
      post_id INT(11) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (notification_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // orders
    `CREATE TABLE IF NOT EXISTS orders (
      order_id INT(11) NOT NULL AUTO_INCREMENT,
      user_id INT(11) NOT NULL,
      community_id INT(11) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(50) DEFAULT NULL,
      shipping_address LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(shipping_address)),
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // order_items
    `CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INT(11) NOT NULL AUTO_INCREMENT,
      order_id INT(11) NOT NULL,
      product_id INT(11) NOT NULL,
      variant_id INT(11) NOT NULL,
      quantity INT(11) NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (order_item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // posts
    `CREATE TABLE IF NOT EXISTS posts (
      post_id INT(11) NOT NULL AUTO_INCREMENT,
      user_id INT(11) DEFAULT NULL,
      content TEXT NOT NULL,
      img_url VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      repost_id INT(11) DEFAULT NULL,
      PRIMARY KEY (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // products
    `CREATE TABLE IF NOT EXISTS products (
      product_id INT(11) NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      collection_id INT(11) DEFAULT NULL,
      product_category VARCHAR(100) NOT NULL,
      image_url VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // product_variants
    `CREATE TABLE IF NOT EXISTS product_variants (
      variant_id INT(11) NOT NULL AUTO_INCREMENT,
      product_id INT(11) NOT NULL,
      variant_name VARCHAR(150) DEFAULT NULL,
      variant_values VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      price DECIMAL(10,2) NOT NULL,
      stock INT(11) DEFAULT 0,
      weight_g DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      PRIMARY KEY (variant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // shipping_zones
    `CREATE TABLE IF NOT EXISTS shipping_zones (
      id INT(11) NOT NULL AUTO_INCREMENT,
      community_id INT(11) NOT NULL,
      zone_name VARCHAR(20) NOT NULL,
      shipping_fee DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY unique_zone (community_id, zone_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

   
    // users
    `CREATE TABLE IF NOT EXISTS users (
      user_id INT(11) NOT NULL AUTO_INCREMENT,
      email VARCHAR(100) NOT NULL,
      fullname VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL,
      profile_picture VARCHAR(255) DEFAULT NULL,
      google_id VARCHAR(255) DEFAULT NULL,
      auth_provider ENUM('local','google') NOT NULL DEFAULT 'local',
      failed_login_attempts INT(11) NOT NULL DEFAULT 0,
      role ENUM('customer','main_admin','sub_admin') NOT NULL DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reset_otp VARCHAR(10) DEFAULT NULL,
      reset_expr DATETIME DEFAULT NULL,
      PRIMARY KEY (user_id),
      UNIQUE KEY email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    // zone_locations
    `CREATE TABLE IF NOT EXISTS zone_locations (
      id INT(11) NOT NULL AUTO_INCREMENT,
      community_id INT(11) NOT NULL,
      zone_id INT(11) NOT NULL,
      province_name VARCHAR(50) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY unique_location (community_id, province_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    `CREATE TABLE IF NOT EXISTS registration_verifications (
      email VARCHAR(100) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`
  ];

    for (const sql of tablesSQL) {
      try {
        await pool.query(sql);
      } catch (err) {
        console.error('[GenerateModel] Table creation failed:', {
          database: dbName,
          statement: sql,
          error: err?.message,
        });
        throw new Error(`Community schema creation failed: ${err?.message || 'Unknown error'}`);
      }
    }
    await pool.end();

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

      return sitesWithMembers;
    } catch (err) {
      console.error('Get generated websites error:', err);
      throw new Error('Failed to fetch websites');
    }
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

      const membersQuery = `
        SELECT site_id, name, role, description, image_profile
        FROM site_members
        WHERE site_id = ?
        ORDER BY created_at ASC
      `;
      const [members] = await this.db.query(membersQuery, [siteId]);

      return { ...site, members: members || [] };
    } catch (err) {
      console.error('Get website by ID error:', err);
      throw new Error('Failed to fetch website');
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
      if (!sites || sites.length === 0) return null;
      const site = sites[0];

      const membersQuery = `
        SELECT site_id, name, role, description, image_profile
        FROM site_members
        WHERE site_id = ?
        ORDER BY created_at ASC
      `;
      const [members] = await this.db.query(membersQuery, [site.site_id]);

      return { ...site, members: members || [] };
    } catch (err) {
      console.error('Get website by community_type error:', err);
      throw new Error('Failed to fetch website');
    }
  }

  async updateGeneratedWebsite(
    siteId,
    {
      site_name,
      community_type,
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
      const settingsCols = await this.getTableColumns('sites_setting');
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
