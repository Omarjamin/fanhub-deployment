import { connect, resolveCommunityContext } from '../../core/database.js';
import { encryptPassword } from '../../utils/hash.js';
import crypto from "crypto";
import nodemailer from 'nodemailer';

class UserModel {
  constructor() {
    this.userAuthColumnsReady = false;
    this.userColumnSet = null;
    this.activeCommunityId = null;
    this.connect().catch((err) => {
      console.error('<warning> user_model.connect failed', err && err.message ? err.message : err);
    });
  }

  async connect() {
    this.db = await connect();
    this.userAuthColumnsReady = false;
    this.userColumnSet = null;
    this.activeCommunityId = null;
  }

  buildSlugVariants(value = '') {
    const scoped = String(value || '').trim().toLowerCase();
    if (!scoped) return [];
    const set = new Set([scoped]);
    const withoutWebsite = scoped.replace(/-website$/i, '');
    if (withoutWebsite) set.add(withoutWebsite);
    if (!/-website$/i.test(scoped)) set.add(`${scoped}-website`);
    return Array.from(set).filter(Boolean);
  }

  async tableExists(tableName) {
    try {
      const [rows] = await this.db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
         LIMIT 1`,
        [tableName],
      );
      return Number(rows?.[0]?.count || 0) > 0;
    } catch (_) {
      return false;
    }
  }

  async resolveCommunityIdFromCurrentDb(siteKey = '') {
    const scoped = String(siteKey || '').trim().toLowerCase();
    if (!scoped) return null;

    const hasCommunitiesTable = await this.tableExists('communities');
    if (!hasCommunitiesTable) return null;

    const [columns] = await this.db.query('SHOW COLUMNS FROM communities');
    const colSet = new Set((columns || []).map((c) => String(c?.Field || '').trim().toLowerCase()));
    if (!colSet.has('community_id')) return null;

    const lookupCols = ['community_type', 'site_slug', 'domain', 'site_name', 'name']
      .filter((col) => colSet.has(col));
    if (!lookupCols.length) return null;

    const variants = this.buildSlugVariants(scoped);
    if (!variants.length) return null;

    const placeholders = variants.map(() => '?').join(', ');
    const where = lookupCols.map((col) => `LOWER(TRIM(${col})) IN (${placeholders})`).join(' OR ');
    const params = lookupCols.flatMap(() => variants);

    const [rows] = await this.db.query(
      `
      SELECT community_id
      FROM communities
      WHERE ${where}
      ORDER BY community_id ASC
      LIMIT 1
      `,
      params,
    );

    const id = Number(rows?.[0]?.community_id || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  async ensureConnection(community_type, site_slug) {
    const normalizedSite = String(community_type || '').trim().toLowerCase();
    const normalizedSlug = String(site_slug || '').trim().toLowerCase();
    const scopedKey = normalizedSite || normalizedSlug;

    try {
      this.db = await connect(scopedKey);
      this.userAuthColumnsReady = false;
      this.userColumnSet = null;
      const fallbackCommunity = await resolveCommunityContext(scopedKey);
      const resolvedContextId = Number(fallbackCommunity?.community_id || 0) || null;
      this.activeCommunityId = resolvedContextId || await this.resolveCommunityIdFromCurrentDb(scopedKey);
      if (scopedKey && !this.activeCommunityId) {
        const scopeErr = new Error(`Site/community not found for "${scopedKey}"`);
        scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
        throw scopeErr;
      }
      await this.ensureUserAuthColumns();
      await this.ensureRegistrationVerificationTable();
    } catch (err) {
      console.error('<error> ensureConnection failed:', {
        code: err?.code || '',
        message: err?.message || String(err || ''),
        scopedKey,
      });
      if (err?.code === 'SITE_SCOPE_NOT_FOUND') {
        throw err;
      }
      this.db = await connect();
      this.userAuthColumnsReady = false;
      this.userColumnSet = null;
      this.activeCommunityId = await this.resolveCommunityIdFromCurrentDb(scopedKey);
      if (scopedKey && !this.activeCommunityId) {
        const scopeErr = new Error(`Site/community not found for "${scopedKey}"`);
        scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
        throw scopeErr;
      }
      await this.ensureUserAuthColumns();
      await this.ensureRegistrationVerificationTable();
    }
    return this.db;
  }

  async getUserColumns() {
    if (!this.db) return new Set();
    if (this.userColumnSet) return this.userColumnSet;
    const [rows] = await this.db.query('SHOW COLUMNS FROM users');
    this.userColumnSet = new Set(
      (rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()),
    );
    return this.userColumnSet;
  }

  async ensureUserAuthColumns() {
    if (!this.db || this.userAuthColumnsReady) return;
    try {
      const [rows] = await this.db.query('SHOW COLUMNS FROM users');
      const columns = new Set((rows || []).map((row) => String(row?.Field || '').trim().toLowerCase()));
      const alters = [];

      if (!columns.has('google_id')) {
        alters.push('ADD COLUMN google_id VARCHAR(255) NULL AFTER profile_picture');
      }
      if (!columns.has('auth_provider')) {
        alters.push("ADD COLUMN auth_provider ENUM('local','google') NOT NULL DEFAULT 'local' AFTER google_id");
      }
      if (!columns.has('failed_login_attempts')) {
        alters.push('ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0 AFTER auth_provider');
      }
      if (!columns.has('community_id')) {
        alters.push('ADD COLUMN community_id INT NULL AFTER user_id');
      }

      if (alters.length > 0) {
        try {
          await this.db.query(`ALTER TABLE users ${alters.join(', ')}`);
        } catch (migrationErr) {
          // Keep auth flow working even when DB user has no ALTER privilege.
          console.warn('<warning> ensureUserAuthColumns migration skipped:', {
            code: migrationErr?.code || '',
            message: migrationErr?.message || String(migrationErr || ''),
          });
        }
      }

      if (!columns.has('community_id')) {
        try {
          await this.db.query('ALTER TABLE users ADD INDEX idx_users_community_id (community_id)');
        } catch (_) {}
      }
    } finally {
      this.userAuthColumnsReady = true;
      this.userColumnSet = null;
    }
  }

  async ensureRegistrationVerificationTable() {
    if (!this.db) return;
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS registration_verifications (
        email VARCHAR(100) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async createUser({ password, email, firstname, lastname, imageUrl = '', community_type, site_slug }) {
    try {
      const hashedPassword = await encryptPassword(password);
      const fullname = `${firstname} ${lastname}`;
      const db = await this.ensureConnection(community_type, site_slug);
      const columns = await this.getUserColumns();
      const hasCommunityColumn = columns.has('community_id');

      const userColumns = ['email', 'fullname', 'password', 'profile_picture', 'google_id', 'auth_provider', 'failed_login_attempts'];
      const placeholders = ['?', '?', '?', '?', 'NULL', "'local'", '0'];
      const params = [email, fullname, hashedPassword, imageUrl || 'none'];
      if (hasCommunityColumn) {
        if ((community_type || site_slug) && !this.activeCommunityId) {
          const scopeErr = new Error(`Site/community not found for "${community_type || site_slug}"`);
          scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
          throw scopeErr;
        }
        userColumns.push('community_id');
        placeholders.push('?');
        params.push(this.activeCommunityId);
      }

      const userQuery = `
        INSERT INTO users (${userColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;

      const [result] = await db.query(userQuery, params);

      if (hasCommunityColumn && (community_type || site_slug)) {
        const [verifyRows] = await db.query(
          'SELECT community_id FROM users WHERE user_id = ? LIMIT 1',
          [result.insertId],
        );
        const insertedCommunityId = Number(verifyRows?.[0]?.community_id || 0) || null;
        if (!insertedCommunityId) {
          const scopeErr = new Error(`Failed to persist community scope for "${community_type || site_slug}"`);
          scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
          throw scopeErr;
        }
      }

      return result.insertId;
    } catch (error) {
      console.error('<error> user.createUser', { errorMessage: error.message, errorCode: error.code });
      throw new Error(error.message || 'Error inserting user');
    }
  }

  async requestRegistrationOtp(email, community_type, site_slug) {
    const db = await this.ensureConnection(community_type, site_slug);

    const existingUser = await this.findUserByEmail(email, community_type, site_slug);
    if (existingUser) {
      return { status: 'error', message: 'Email already registered.' };
    }

    const [rows] = await db.query(
      'SELECT expires_at FROM registration_verifications WHERE email = ? LIMIT 1',
      [email],
    );
    const activeOtp = rows?.[0];
    if (activeOtp?.expires_at && new Date(activeOtp.expires_at) > new Date()) {
      const remainingMs = new Date(activeOtp.expires_at) - new Date();
      const remainingSec = Math.ceil(remainingMs / 1000);
      return {
        status: 'success',
        message: `Verification code already sent. Please check your inbox or wait ${remainingSec} seconds before resending.`,
        requires_email_verification: true,
        already_sent: true,
        remaining_seconds: remainingSec,
      };
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `
        INSERT INTO registration_verifications (email, otp, expires_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP
      `,
      [email, otp, expiresAt],
    );

    try {
      await this.sendOtpEmail(email, otp, 'Email verification code');
      return { status: 'success', message: 'Verification code sent to your email.' };
    } catch (error) {
      // Roll back pending registration OTP if email delivery failed,
      // so user can request a fresh OTP immediately.
      try {
        await db.query('DELETE FROM registration_verifications WHERE email = ?', [email]);
      } catch (_) {}
      return {
        status: 'error',
        code: 'OTP_EMAIL_SEND_FAILED',
        message: error?.message || 'Failed to send verification email. Please try again.',
      };
    }
  }

  async verifyRegistrationOtp(email, otp, community_type, site_slug) {
    const db = await this.ensureConnection(community_type, site_slug);
    const [rows] = await db.query(
      'SELECT otp, expires_at FROM registration_verifications WHERE email = ? LIMIT 1',
      [email],
    );
    const record = rows?.[0];
    if (!record) {
      return { status: 'error', message: 'No verification code found. Please request a new one.' };
    }

    const isExpired = new Date() > new Date(record.expires_at);
    const isMatch = String(record.otp).trim() === String(otp || '').trim();
    if (isExpired || !isMatch) {
      return { status: 'error', message: 'Invalid or expired verification code.' };
    }

    await db.query('DELETE FROM registration_verifications WHERE email = ?', [email]);
    return { status: 'success' };
  }

  async incrementFailedLoginAttempts(userId, dbConn = null) {
    const db = dbConn || this.db;
    await db.query(
      `
        UPDATE users
        SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
        WHERE user_id = ?
      `,
      [userId],
    );

    const [rows] = await db.query(
      `SELECT failed_login_attempts FROM users WHERE user_id = ? LIMIT 1`,
      [userId],
    );

    return Number(rows?.[0]?.failed_login_attempts || 0);
  }

  async resetFailedLoginAttempts(userId, dbConn = null) {
    const db = dbConn || this.db;
    await db.query('UPDATE users SET failed_login_attempts = 0 WHERE user_id = ?', [userId]);
  }

  async verify(email, password, community_type, site_slug) {
    try {
      const db = await this.ensureConnection(community_type, site_slug);
      const columns = await this.getUserColumns();
      const whereParts = ['email = ?'];
      const queryParams = [email];
      if (columns.has('community_id') && this.activeCommunityId) {
        whereParts.push('community_id = ?');
        queryParams.push(this.activeCommunityId);
      }

      const userQuery = `
        SELECT user_id, email, password, fullname, auth_provider, failed_login_attempts
        FROM users
        WHERE ${whereParts.join(' AND ')}
        LIMIT 1
      `;
      const [userRows] = await db.query(userQuery, queryParams);
      const user = userRows?.[0];

      if (!user) {
        return { status: 'error', message: 'User not found' };
      }

      if (String(user.auth_provider || 'local').toLowerCase() === 'google') {
        return {
          status: 'error',
          message: 'This account uses Google sign-in. Please continue with Google.',
        };
      }

      const hashedPassword = await encryptPassword(password);
      if (user.password !== hashedPassword) {
        const nextAttempts = await this.incrementFailedLoginAttempts(user.user_id, db);
        if (nextAttempts >= 5) {
          return {
            status: 'reset_required',
            message: 'Too many failed login attempts. Please reset your password.',
            code: 'PASSWORD_RESET_REQUIRED',
            failedLoginAttempts: nextAttempts,
            email: user.email,
          };
        }

        return {
          status: 'error',
          message: `Incorrect password (${nextAttempts}/5).`,
          failedLoginAttempts: nextAttempts,
        };
      }

      if (Number(user.failed_login_attempts || 0) > 0) {
        await this.resetFailedLoginAttempts(user.user_id, db);
      }

      const activeSuspension = await this.getActiveSuspensionByUserId(
        user.user_id,
        community_type,
        site_slug,
      );
      if (activeSuspension) {
        return {
          status: 'suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspension_until: activeSuspension.ends_at,
          message: `Your account has been suspended until ${new Date(activeSuspension.ends_at).toLocaleString()}`,
        };
      }

      return {
        status: 'success',
        user: {
          user_id: user.user_id,
          fullname: user.fullname,
        },
      };
    } catch (error) {
      console.error('<error> user.verify', error);
      const wrappedError = new Error(error?.message || 'User verification failed');
      wrappedError.code = error?.code;
      throw wrappedError;
    }
  }

  async getActiveSuspensionByUserId(userId, community_type, site_slug) {
    try {
      const db = await this.ensureConnection(community_type, site_slug);
      const [tableRows] = await db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'user_suspensions'
         LIMIT 1`,
      );
      if (Number(tableRows?.[0]?.count || 0) === 0) return null;

      const [rows] = await db.query(
        `SELECT suspension_id, starts_at, ends_at, reason
         FROM user_suspensions
         WHERE user_id = ?
           AND status = 'active'
           AND starts_at <= NOW()
           AND ends_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId],
      );
      return rows?.[0] || null;
    } catch (_) {
      return null;
    }
  }

  async findUserByEmail(email, community_type, site_slug, options = {}) {
    const ignoreCommunity = Boolean(options?.ignoreCommunity);
    const db = await this.ensureConnection(community_type, site_slug);
    const columns = await this.getUserColumns();
    const whereParts = ['email = ?'];
    const params = [email];
    if (!ignoreCommunity && columns.has('community_id') && this.activeCommunityId) {
      whereParts.push('community_id = ?');
      params.push(this.activeCommunityId);
    }
    const [rows] = await db.query(
      `
        SELECT user_id, email, fullname, profile_picture, auth_provider, google_id, community_id
        FROM users
        WHERE ${whereParts.join(' AND ')}
        LIMIT 1
      `,
      params,
    );
    return rows?.[0] || null;
  }

  async findOrCreateGoogleUser({ email, fullname, imageUrl = '', googleId = '', community_type, site_slug }) {
    const db = await this.ensureConnection(community_type, site_slug);
    const columns = await this.getUserColumns();
    const hasCommunityColumn = columns.has('community_id');
    const existing =
      (await this.findUserByEmail(email, community_type, site_slug)) ||
      (await this.findUserByEmail(email, community_type, site_slug, { ignoreCommunity: true }));

    if (existing) {
      if (hasCommunityColumn && (community_type || site_slug) && !this.activeCommunityId) {
        const scopeErr = new Error(`Site/community not found for "${community_type || site_slug}"`);
        scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
        throw scopeErr;
      }
      const updateSql = hasCommunityColumn
        ? `
          UPDATE users
          SET auth_provider = 'google',
              google_id = COALESCE(NULLIF(google_id, ''), ?),
              failed_login_attempts = 0,
              community_id = COALESCE(community_id, ?)
          WHERE user_id = ?
        `
        : `
          UPDATE users
          SET auth_provider = 'google',
              google_id = COALESCE(NULLIF(google_id, ''), ?),
              failed_login_attempts = 0
          WHERE user_id = ?
        `;
      const updateParams = hasCommunityColumn
        ? [googleId || null, this.activeCommunityId, existing.user_id]
        : [googleId || null, existing.user_id];
      await db.query(updateSql, updateParams);

      return {
        ...existing,
        auth_provider: 'google',
        google_id: existing.google_id || googleId || null,
      };
    }

    const randomPassword = await encryptPassword(crypto.randomUUID());
    const safeFullname = String(fullname || email).trim() || email;
    const safeImage = String(imageUrl || 'none').trim() || 'none';

    try {
      const insertColumns = ['email', 'fullname', 'password', 'profile_picture', 'google_id', 'auth_provider', 'failed_login_attempts'];
      const insertPlaceholders = ['?', '?', '?', '?', '?', "'google'", '0'];
      const insertParams = [email, safeFullname, randomPassword, safeImage, googleId || null];
      if (hasCommunityColumn) {
        if ((community_type || site_slug) && !this.activeCommunityId) {
          const scopeErr = new Error(`Site/community not found for "${community_type || site_slug}"`);
          scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
          throw scopeErr;
        }
        insertColumns.push('community_id');
        insertPlaceholders.push('?');
        insertParams.push(this.activeCommunityId);
      }

      const [result] = await db.query(
        `
          INSERT INTO users (${insertColumns.join(', ')})
          VALUES (${insertPlaceholders.join(', ')})
        `,
        insertParams,
      );

      return {
        user_id: result.insertId,
        email,
        fullname: safeFullname,
        profile_picture: safeImage,
      };
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY' && String(err?.sqlMessage || '').toLowerCase().includes('users.email')) {
        const dupUser = await this.findUserByEmail(email, community_type, site_slug, { ignoreCommunity: true });
        if (dupUser?.user_id) {
          if (hasCommunityColumn && (community_type || site_slug) && !this.activeCommunityId) {
            const scopeErr = new Error(`Site/community not found for "${community_type || site_slug}"`);
            scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
            throw scopeErr;
          }
          const updateDupSql = hasCommunityColumn
            ? `
              UPDATE users
              SET auth_provider = 'google',
                  google_id = COALESCE(NULLIF(google_id, ''), ?),
                  failed_login_attempts = 0,
                  community_id = COALESCE(community_id, ?)
              WHERE user_id = ?
            `
            : `
              UPDATE users
              SET auth_provider = 'google',
                  google_id = COALESCE(NULLIF(google_id, ''), ?),
                  failed_login_attempts = 0
              WHERE user_id = ?
            `;
          const updateDupParams = hasCommunityColumn
            ? [googleId || null, this.activeCommunityId, dupUser.user_id]
            : [googleId || null, dupUser.user_id];
          await db.query(updateDupSql, updateDupParams);
          return {
            ...dupUser,
            auth_provider: 'google',
            google_id: dupUser.google_id || googleId || null,
          };
        }
      }

      if (err?.code === 'ER_BAD_NULL_ERROR' && String(err?.sqlMessage || '').toLowerCase().includes('username')) {
        const baseUsername = String(email || '').split('@')[0] || 'google_user';
        const username = `${baseUsername}_${Date.now().toString().slice(-6)}`;
        const insertColumns = ['username', 'email', 'fullname', 'password', 'profile_picture', 'google_id', 'auth_provider', 'failed_login_attempts'];
        const insertPlaceholders = ['?', '?', '?', '?', '?', '?', "'google'", '0'];
        const insertParams = [username, email, safeFullname, randomPassword, safeImage, googleId || null];
        if (hasCommunityColumn) {
          if ((community_type || site_slug) && !this.activeCommunityId) {
            const scopeErr = new Error(`Site/community not found for "${community_type || site_slug}"`);
            scopeErr.code = 'SITE_SCOPE_NOT_FOUND';
            throw scopeErr;
          }
          insertColumns.push('community_id');
          insertPlaceholders.push('?');
          insertParams.push(this.activeCommunityId);
        }

        const [result] = await db.query(
          `
            INSERT INTO users (${insertColumns.join(', ')})
            VALUES (${insertPlaceholders.join(', ')})
          `,
          insertParams,
        );

        return {
          user_id: result.insertId,
          email,
          fullname: safeFullname,
          profile_picture: safeImage,
        };
      }
      throw err;
    }
  }

  async requestPasswordReset(email, community_type, site_slug) {
    try {
      const db = await this.ensureConnection(community_type, site_slug);
      const columns = await this.getUserColumns();
      const whereParts = ['email = ?'];
      const params = [email];
      if (columns.has('community_id') && this.activeCommunityId) {
        whereParts.push('community_id = ?');
        params.push(this.activeCommunityId);
      }
      const [rows] = await db.query(
        `SELECT reset_expr FROM users WHERE ${whereParts.join(' AND ')} LIMIT 1`,
        params,
      );
      const user = rows?.[0];

      if (!user) {
        return { status: 'error', message: 'No user found with that email address.' };
      }

      if (user.reset_expr && new Date() < new Date(user.reset_expr)) {
        const remainingMs = new Date(user.reset_expr) - new Date();
        const remainingSec = Math.ceil(remainingMs / 1000);
        return {
          status: 'error',
          message: `OTP already sent. Please wait ${remainingSec} seconds before requesting again.`,
        };
      }

      const otp = crypto.randomInt(100000, 999999);
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

      const success = await this.saveResetToken(email, otp, otpExpiry, community_type, site_slug);
      if (!success) {
        return { status: 'error', message: 'Failed to save OTP in database.' };
      }

      try {
        await this.sendOtpEmail(email, otp);
      } catch (sendErr) {
        // Roll back reset OTP if email send fails to avoid "OTP already sent" dead-end.
        try {
          const columns = await this.getUserColumns();
          const whereParts = ['email = ?'];
          const params = [email];
          if (columns.has('community_id') && this.activeCommunityId) {
            whereParts.push('community_id = ?');
            params.push(this.activeCommunityId);
          }
          await db.query(
            `UPDATE users SET reset_otp = NULL, reset_expr = NULL WHERE ${whereParts.join(' AND ')}`,
            params,
          );
        } catch (_) {}
        throw sendErr;
      }

      return {
        status: 'success',
        message: 'Password reset OTP sent successfully to your email.',
      };
    } catch (err) {
      console.error('<error> user.requestPasswordReset', err);
      return {
        status: 'error',
        message: 'An unexpected error occurred while sending the OTP.',
        error: err.message,
      };
    }
  }

  async sendOtpEmail(email, otp, subject = 'Password Reset OTP') {
    const smtpUser = String(process.env.EMAIL_USER || '').trim();
    const smtpPass = String(process.env.EMAIL_PASS || '').trim();
    if (!smtpUser || !smtpPass) {
      throw new Error('Email service is not configured (missing EMAIL_USER/EMAIL_PASS).');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    const sendPromise = transporter.sendMail({
      from: smtpUser,
      to: email,
      subject,
      text: `${subject}: ${otp}`,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email service timeout while sending OTP.')), 12000);
    });

    try {
      await Promise.race([sendPromise, timeoutPromise]);
    } catch (error) {
      console.error('<error> sendOtpEmail failed', {
        message: error?.message || String(error || ''),
        code: error?.code || '',
        responseCode: error?.responseCode || '',
        command: error?.command || '',
      });
      throw error;
    }
  }

  async saveResetToken(email, otp, otpExpiry, community_type, site_slug) {
    const db = await this.ensureConnection(community_type, site_slug);
    const columns = await this.getUserColumns();
    const whereParts = ['email = ?'];
    const params = [otp, otpExpiry, email];
    if (columns.has('community_id') && this.activeCommunityId) {
      whereParts.push('community_id = ?');
      params.push(this.activeCommunityId);
    }
    const query = `UPDATE users SET reset_otp = ?, reset_expr = ? WHERE ${whereParts.join(' AND ')}`;
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }

  async verifyOtpAndResetPassword(email, otp, newPassword, community_type, site_slug) {
    const db = await this.ensureConnection(community_type, site_slug);
    const columns = await this.getUserColumns();
    const whereParts = ['email = ?'];
    const selectParams = [email];
    if (columns.has('community_id') && this.activeCommunityId) {
      whereParts.push('community_id = ?');
      selectParams.push(this.activeCommunityId);
    }
    const query = `SELECT reset_otp, reset_expr FROM users WHERE ${whereParts.join(' AND ')} LIMIT 1`;
    const [results] = await db.query(query, selectParams);
    const user = results?.[0];

    if (!user) {
      throw new Error('No user found with that email address.');
    }

    const isOtpValid = String(user.reset_otp).trim() === String(otp).trim();
    const isOtpExpired = new Date() > new Date(user.reset_expr);

    if (!isOtpValid || isOtpExpired) {
      throw new Error('Invalid or expired OTP.');
    }

    const hashedPassword = await encryptPassword(newPassword);
    const updateParams = [hashedPassword, email];
    if (columns.has('community_id') && this.activeCommunityId) {
      updateParams.push(this.activeCommunityId);
    }
    const updateQuery = `UPDATE users SET password = ?, reset_otp = NULL, reset_expr = NULL, failed_login_attempts = 0 WHERE ${whereParts.join(' AND ')}`;
    const [result] = await db.query(updateQuery, updateParams);

    return result.affectedRows > 0;
  }

  async getCommunities() {
    const connection = await this.connect();
    try {
      const [rows] = await connection.query('SELECT community_id, name, description FROM communities');
      return rows;
    } catch (error) {
      console.error('Error fetching communities:', error);
      throw error;
    }
  }
}

export default UserModel;
