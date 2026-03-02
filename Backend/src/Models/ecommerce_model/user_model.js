import { connect, resolveSiteDatabaseConfig, resolveSiteNameByDomain } from '../../core/database.js';
import { encryptPassword } from '../../utils/hash.js';
import crypto from "crypto";
import nodemailer from 'nodemailer';

class UserModel {
  constructor() {
    this.userAuthColumnsReady = false;
    this.connect().catch((err) => {
      console.error('<warning> user_model.connect failed', err && err.message ? err.message : err);
    });
  }

  async connect() {
    this.db = await connect();
    this.userAuthColumnsReady = false;
  }

  async ensureConnection(community_type, site_slug) {
    const normalizedSite = String(community_type || '').trim().toLowerCase();
    const normalizedSlug = String(site_slug || '').trim().toLowerCase();
    const candidates = [];
    if (normalizedSite) candidates.push(normalizedSite);
    if (normalizedSlug && normalizedSlug !== normalizedSite) candidates.push(normalizedSlug);

    try {
      if (candidates.length > 0) {
        let resolvedKey = '';
        for (const key of candidates) {
          const siteName = await resolveSiteNameByDomain(key);
          const lookupKey = siteName || key;
          const siteDbConfig = await resolveSiteDatabaseConfig(lookupKey);
          if (siteDbConfig?.db_name) {
            resolvedKey = lookupKey;
            break;
          }
        }

        if (!resolvedKey) {
          const notFoundError = new Error(`No database mapping found for site "${normalizedSite || normalizedSlug}"`);
          notFoundError.code = 'SITE_DB_NOT_FOUND';
          throw notFoundError;
        }

        this.db = await connect(resolvedKey);
        this.userAuthColumnsReady = false;
        await this.ensureUserAuthColumns();
        await this.ensureRegistrationVerificationTable();
        return this.db;
      }

      this.db = await connect();
      this.userAuthColumnsReady = false;
      await this.ensureUserAuthColumns();
      await this.ensureRegistrationVerificationTable();
    } catch (err) {
      console.error('<error> ensureConnection failed:', err);
      if (candidates.length > 0) throw err;
      this.db = await connect();
      this.userAuthColumnsReady = false;
      await this.ensureUserAuthColumns();
      await this.ensureRegistrationVerificationTable();
    }
    return this.db;
  }

  async ensureUserAuthColumns() {
    if (!this.db || this.userAuthColumnsReady) return;

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

    if (alters.length > 0) {
      await this.db.query(`ALTER TABLE users ${alters.join(', ')}`);
    }

    this.userAuthColumnsReady = true;
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

      const userQuery = `
        INSERT INTO users (email, fullname, password, profile_picture, google_id, auth_provider, failed_login_attempts)
        VALUES (?, ?, ?, ?, NULL, 'local', 0)
      `;

      const [result] = await (await this.ensureConnection(community_type, site_slug)).query(userQuery, [
        email,
        fullname,
        hashedPassword,
        imageUrl || 'none',
      ]);

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
        status: 'error',
        message: `Verification code already sent. Please wait ${remainingSec} seconds.`,
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

    await this.sendOtpEmail(email, otp, 'Email verification code');
    return { status: 'success', message: 'Verification code sent to your email.' };
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

      const userQuery = `
        SELECT user_id, email, password, fullname, auth_provider, failed_login_attempts
        FROM users
        WHERE email = ?
        LIMIT 1
      `;
      const [userRows] = await db.query(userQuery, [email]);
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

  async findUserByEmail(email, community_type, site_slug) {
    const db = await this.ensureConnection(community_type, site_slug);
    const [rows] = await db.query(
      `
        SELECT user_id, email, fullname, profile_picture, auth_provider, google_id
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email],
    );
    return rows?.[0] || null;
  }

  async findOrCreateGoogleUser({ email, fullname, imageUrl = '', googleId = '', community_type, site_slug }) {
    const db = await this.ensureConnection(community_type, site_slug);
    const existing = await this.findUserByEmail(email, community_type, site_slug);

    if (existing) {
      await db.query(
        `
          UPDATE users
          SET auth_provider = 'google',
              google_id = COALESCE(NULLIF(google_id, ''), ?),
              failed_login_attempts = 0
          WHERE user_id = ?
        `,
        [googleId || null, existing.user_id],
      );

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
      const [result] = await db.query(
        `
          INSERT INTO users (email, fullname, password, profile_picture, google_id, auth_provider, failed_login_attempts)
          VALUES (?, ?, ?, ?, ?, 'google', 0)
        `,
        [email, safeFullname, randomPassword, safeImage, googleId || null],
      );

      return {
        user_id: result.insertId,
        email,
        fullname: safeFullname,
        profile_picture: safeImage,
      };
    } catch (err) {
      if (err?.code === 'ER_BAD_NULL_ERROR' && String(err?.sqlMessage || '').toLowerCase().includes('username')) {
        const baseUsername = String(email || '').split('@')[0] || 'google_user';
        const username = `${baseUsername}_${Date.now().toString().slice(-6)}`;
        const [result] = await db.query(
          `
            INSERT INTO users (username, email, fullname, password, profile_picture, google_id, auth_provider, failed_login_attempts)
            VALUES (?, ?, ?, ?, ?, ?, 'google', 0)
          `,
          [username, email, safeFullname, randomPassword, safeImage, googleId || null],
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
      const [rows] = await db.query(
        'SELECT reset_expr FROM users WHERE email = ?',
        [email],
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

      await this.sendOtpEmail(email, otp);

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
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject,
      text: `${subject}: ${otp}`,
    });
  }

  async saveResetToken(email, otp, otpExpiry, community_type, site_slug) {
    const query = 'UPDATE users SET reset_otp = ?, reset_expr = ? WHERE email = ?';
    const [result] = await (await this.ensureConnection(community_type, site_slug)).query(query, [otp, otpExpiry, email]);
    return result.affectedRows > 0;
  }

  async verifyOtpAndResetPassword(email, otp, newPassword, community_type, site_slug) {
    const query = 'SELECT reset_otp, reset_expr FROM users WHERE email = ?';
    const [results] = await (await this.ensureConnection(community_type, site_slug)).query(query, [email]);
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
    const updateQuery = 'UPDATE users SET password = ?, reset_otp = NULL, reset_expr = NULL, failed_login_attempts = 0 WHERE email = ?';
    const [result] = await (await this.ensureConnection(community_type, site_slug)).query(updateQuery, [hashedPassword, email]);

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
