import { connectAdmin } from "../../core/database.js";

class SuggestionModel {
  constructor() {
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      this.db = await connectAdmin();
    }
    return this.db;
  }

  async ensureTable() {
    const db = await this.connect();
    await db.query(`
      CREATE TABLE IF NOT EXISTS community_suggestions (
        suggestion_id INT(11) NOT NULL AUTO_INCREMENT,
        community_name VARCHAR(150) NOT NULL,
        suggestion_text TEXT NOT NULL,
        contact_email VARCHAR(255) DEFAULT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        read_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (suggestion_id),
        KEY idx_suggestions_read_created (is_read, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  async createSuggestion({ communityName, suggestionText, contactEmail }) {
    await this.ensureTable();
    const db = await this.connect();
    const [result] = await db.query(
      `
        INSERT INTO community_suggestions (community_name, suggestion_text, contact_email)
        VALUES (?, ?, ?)
      `,
      [communityName, suggestionText, contactEmail || null],
    );

    const insertedId = Number(result?.insertId || 0);
    const [rows] = await db.query(
      `
        SELECT suggestion_id, community_name, suggestion_text, contact_email, is_read, read_at, created_at
        FROM community_suggestions
        WHERE suggestion_id = ?
        LIMIT 1
      `,
      [insertedId],
    );
    return rows?.[0] || null;
  }

  normalizeScope(scope = '') {
    return String(scope || '').trim().toLowerCase();
  }

  async getUnreadSuggestions(limit = 30, community = '') {
    await this.ensureTable();
    const db = await this.connect();
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(200, Number(limit))) : 30;
    const scoped = this.normalizeScope(community);
    const whereParts = ['is_read = 0'];
    const params = [];
    if (scoped) {
      whereParts.push('LOWER(TRIM(community_name)) = LOWER(TRIM(?))');
      params.push(scoped);
    }
    params.push(safeLimit);
    const [rows] = await db.query(
      `
        SELECT suggestion_id, community_name, suggestion_text, contact_email, is_read, read_at, created_at
        FROM community_suggestions
        WHERE ${whereParts.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT ?
      `,
      params,
    );
    return Array.isArray(rows) ? rows : [];
  }

  async markSuggestionRead(suggestionId) {
    await this.ensureTable();
    const db = await this.connect();
    const id = Number(suggestionId);
    if (!Number.isFinite(id) || id <= 0) return false;

    const [result] = await db.query(
      `
        UPDATE community_suggestions
        SET is_read = 1,
            read_at = NOW()
        WHERE suggestion_id = ?
      `,
      [id],
    );
    return Number(result?.affectedRows || 0) > 0;
  }

  async markAllRead(community = '') {
    await this.ensureTable();
    const db = await this.connect();
    const scoped = this.normalizeScope(community);
    const whereParts = ['is_read = 0'];
    const params = [];
    if (scoped) {
      whereParts.push('LOWER(TRIM(community_name)) = LOWER(TRIM(?))');
      params.push(scoped);
    }
    const [result] = await db.query(
      `
        UPDATE community_suggestions
        SET is_read = 1,
            read_at = NOW()
        WHERE ${whereParts.join(' AND ')}
      `,
      params,
    );
    return Number(result?.affectedRows || 0);
  }
}

export default SuggestionModel;
