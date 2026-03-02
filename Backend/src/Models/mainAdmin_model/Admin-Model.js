import { connectAdmin } from '../../core/database.js';
import { encryptPassword } from '../../utils/hash.js';
import nodemailer from 'nodemailer';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function comparePassword(plainTextPassword, hashedPassword) {
  const plain = String(plainTextPassword ?? '');
  const stored = String(hashedPassword ?? '');
  const candidate = encryptPassword(plain);
  const trimmedPlain = plain.trim();
  const trimmedStored = stored.trim();

  const hashMatched = candidate === stored;
  // Backward compatibility for legacy plain-text rows (including accidental whitespace).
  const legacyMatched = plain === stored || (trimmedPlain && trimmedPlain === trimmedStored);

  return {
    valid: hashMatched || legacyMatched,
    hashMatched,
    legacyMatched,
  };
}

class AdminModel {
  constructor() {
    this.db = null;
    this.adminTable = null;
    this.tablePasswordColumnCache = {};
  }

  async connect() {
    try {
      this.db = await connectAdmin();
    } catch (err) {
      console.error('DB connection failed:', err);
      throw new Error('Database connection failed');
    }
  }

  async getAdminTable() {
    if (this.adminTable) return this.adminTable;
    const tables = await this.getAdminTables();
    this.adminTable = tables.includes('platform_admins') ? 'platform_admins' : tables[0];
    return this.adminTable;
  }

  async getAdminTables() {
    if (!this.db) await this.connect();

    const candidates = ['platform_admins', 'admins'];
    const existing = [];
    for (const table of candidates) {
      const [rows] = await this.db.query('SHOW TABLES LIKE ?', [table]);
      if (Array.isArray(rows) && rows.length > 0) {
        existing.push(table);
      }
    }

    if (existing.length > 0) return existing;

    // Auto-create canonical admin table if no legacy/admin table exists yet.
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id INT(11) NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        otp VARCHAR(10) DEFAULT NULL,
        otp_expiry DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_platform_admins_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    return ['platform_admins'];
  }

  async findAdminRowByEmail(email) {
    if (!this.db) await this.connect();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const tables = await this.getAdminTables();
    for (const table of tables) {
      const passwordColumn = await this.getPasswordColumnForTable(table);
      if (!passwordColumn) continue;
      const [rows] = await this.db.query(
        `SELECT * FROM ${table} WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
        [normalizedEmail],
      );
      if (rows?.length) return { table, admin: rows[0], passwordColumn };
    }
    return null;
  }

  async getPasswordColumnForTable(table) {
    if (this.tablePasswordColumnCache[table]) {
      return this.tablePasswordColumnCache[table];
    }

    const [columns] = await this.db.query(`SHOW COLUMNS FROM ${table}`);
    const fieldSet = new Set((columns || []).map((col) => String(col?.Field || '').trim().toLowerCase()));
    const passwordColumn = fieldSet.has('password') ? 'password' : (fieldSet.has('password_hash') ? 'password_hash' : null);
    this.tablePasswordColumnCache[table] = passwordColumn;
    return passwordColumn;
  }

  async findAdminByIdAcrossTables(id, selectClause = 'id, email, created_at, updated_at') {
    if (!this.db) await this.connect();
    const tables = await this.getAdminTables();

    for (const table of tables) {
      const [rows] = await this.db.query(
        `SELECT ${selectClause} FROM ${table} WHERE id = ? LIMIT 1`,
        [id],
      );
      if (rows?.length) return { table, admin: rows[0] };
    }

    return null;
  }

  // =========================
  // CREATE ADMIN
  // =========================
  async createAdmin({ email, password }) {
    try {
      if (!this.db) await this.connect();
      const table = await this.getAdminTable();
      const passwordColumn = await this.getPasswordColumnForTable(table);
      if (!passwordColumn) throw new Error('No password column found in admin table');
      const hashed = await encryptPassword(password);
      const normalizedEmail = normalizeEmail(email);

      const query = `INSERT INTO ${table} (email, ${passwordColumn}) VALUES (?, ?)`;

      const [result] = await this.db.query(query, [normalizedEmail, hashed]);

      return result.insertId;
    } catch (err) {
      console.error('Create admin error:', err);
      throw new Error('Failed to create admin');
    }
  }

  // =========================
  // LOGIN
  // =========================
  async loginAdmin(email, password) {
    try {
      if (!this.db) await this.connect();
      const match = await this.findAdminRowByEmail(email);
      if (!match) {
        throw new Error('Invalid email or password');
      }

      const { admin, passwordColumn } = match;
      const storedPassword = admin?.[passwordColumn];
      const passwordCheck = await comparePassword(password, storedPassword);

      if (!passwordCheck.valid) {
        throw new Error('Invalid email or password');
      }

      // If this account still stores plain-text password, migrate it to hash immediately.
      if (passwordCheck.legacyMatched && !passwordCheck.hashMatched) {
        const migratedHash = encryptPassword(String(password ?? '').trim());
        await this.db.query(
          `UPDATE ${match.table} SET ${passwordColumn} = ? WHERE id = ?`,
          [migratedHash, admin.id],
        );
      }

      // Remove sensitive data before returning
      const { password: _, ...adminData } = admin;
      return adminData;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  // =========================
  // CHECK ADMIN BY EMAIL
  // =========================
  async findAdminByEmail(email) {
    try {
      if (!this.db) await this.connect();
      const match = await this.findAdminRowByEmail(email);
      if (!match) return null;
      return { id: match.admin.id, email: match.admin.email };
    } catch (err) {
      console.error('findAdminByEmail error:', err);
      return null;
    }
  }

  // =========================
  // GET ADMIN BY ID
  // =========================
  async getAdminById(id) {
    try {
      if (!this.db) await this.connect();
      const match = await this.findAdminByIdAcrossTables(id, 'id, email, created_at, updated_at');
      if (!match) {
        throw new Error('Admin not found');
      }

      return match.admin;
    } catch (err) {
      console.error('Get admin by ID error:', err);
      throw err;
    }
  }

  // =========================
  // UPDATE ADMIN
  // =========================
  async updateAdmin(id, { email, password }) {
    try {
      if (!this.db) await this.connect();
      const match = await this.findAdminByIdAcrossTables(id, 'id');
      if (!match) throw new Error('Admin not found');
      const table = match.table;

      let query = `UPDATE ${table} SET `;
      const params = [];
      const updates = [];

      if (email) {
        updates.push('email = ?');
        params.push(normalizeEmail(email));
      }

      if (password) {
        const passwordColumn = await this.getPasswordColumnForTable(table);
        if (!passwordColumn) throw new Error('No password column found in admin table');
        const hashed = await encryptPassword(password);
        updates.push(`${passwordColumn} = ?`);
        params.push(hashed);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      const [result] = await this.db.query(query, params);

      if (result.affectedRows === 0) {
        throw new Error('Admin not found');
      }

      return this.getAdminById(id);
    } catch (err) {
      console.error('Update admin error:', err);
      throw err;
    }
  }

  // =========================
  // DELETE ADMIN
  // =========================
  async deleteAdmin(id) {
    try {
      if (!this.db) await this.connect();
      const match = await this.findAdminByIdAcrossTables(id, 'id');
      if (!match) throw new Error('Admin not found');
      const table = match.table;

      const query = `DELETE FROM ${table} WHERE id = ?`;
      const [result] = await this.db.query(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Admin not found');
      }

      return true;
    } catch (err) {
      console.error('Delete admin error:', err);
      throw err;
    }
  }

  // =========================
  // SEND OTP
  // =========================
  async sendOtp(email) {
    try {
      if (!this.db) await this.connect();
      const normalizedEmail = normalizeEmail(email);
      const match = await this.findAdminRowByEmail(normalizedEmail);
      if (!match) {
        throw new Error('Admin not found');
      }
      const table = match.table;

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Store OTP in database
      await this.db.query(
        `UPDATE ${table} SET otp = ?, otp_expiry = ? WHERE id = ?`,
        [otp, otpExpiry, match.admin.id]
      );

      // In a real app, you would send this OTP via email
      console.log(`OTP for ${email}: ${otp}`);

      return { message: 'OTP sent successfully' };
    } catch (err) {
      console.error('Send OTP error:', err);
      throw err;
    }
  }

  // =========================
  // VERIFY OTP
  // =========================
  async verifyOtp(email, otp, newPassword) {
    try {
      if (!this.db) await this.connect();
      const normalizedEmail = normalizeEmail(email);
      const match = await this.findAdminRowByEmail(normalizedEmail);
      if (!match) throw new Error('Invalid or expired OTP');
      const table = match.table;
      const passwordColumn = await this.getPasswordColumnForTable(table);
      if (!passwordColumn) throw new Error('No password column found in admin table');
      const hashed = await encryptPassword(newPassword);

      const [admins] = await this.db.query(
        `SELECT id FROM ${table} WHERE id = ? AND otp = ? AND otp_expiry > NOW()`,
        [match.admin.id, otp]
      );

      if (admins.length === 0) {
        throw new Error('Invalid or expired OTP');
      }

      // Update password and clear OTP
      const [result] = await this.db.query(
        `UPDATE ${table} SET ${passwordColumn} = ?, otp = NULL, otp_expiry = NULL WHERE id = ?`,
        [hashed, match.admin.id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error('Verify OTP error:', err);
      throw err;
    }
  }

  // =========================
  // UPDATE PASSWORD
  // =========================
  async updatePassword(adminId, currentPassword, newPassword) {
    try {
      if (!this.db) await this.connect();
      const match = await this.findAdminByIdAcrossTables(adminId, 'id');
      if (!match) throw new Error('Admin not found');
      const table = match.table;
      const passwordColumn = await this.getPasswordColumnForTable(table);
      if (!passwordColumn) throw new Error('No password column found in admin table');
      const [adminRows] = await this.db.query(
        `SELECT id, ${passwordColumn} FROM ${table} WHERE id = ? LIMIT 1`,
        [adminId],
      );
      if (!adminRows?.length) throw new Error('Admin not found');

      // Get current password hash
      const currentHash = adminRows[0][passwordColumn];

      // Verify current password
      const currentPasswordCheck = await comparePassword(currentPassword, currentHash);
      if (!currentPasswordCheck.valid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await encryptPassword(newPassword);

      // Update password
      const [result] = await this.db.query(
        `UPDATE ${table} SET ${passwordColumn} = ? WHERE id = ?`,
        [hashedNewPassword, adminId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error('Update password error:', err);
      throw err;
    }
  }

  // =========================
  // LOGOUT
  // =========================
  async logoutAdmin(req) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new Error('Token required');
      }

      return { message: 'Logout successful' };
    } catch (err) {
      console.error('Logout error:', err);
      throw err;
    }
  }
}

export default AdminModel;
