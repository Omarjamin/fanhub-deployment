import { connect } from '../../core/database.js';

class TemplateModel {
  constructor() {
    this.connect();
  }

  async connect() {
    this.db = await connect();
  }

  // CREATE template
  async createTemplate(data) {
    const query = `
      INSERT INTO templates (
        title, description, hero_section, latest_video, about,
        members_img, members_name, members_role, members_description,
        music_title, music_img, music_link,
        event_name, event_img,
        announcement_description, announcement_img
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.title,
      data.description,
      data.hero_section,
      data.latest_video,
      data.about,
      data.members_img,
      data.members_name,
      data.members_role,
      data.members_description,
      data.music_title,
      data.music_img,
      data.music_link,
      data.event_name,
      data.event_img,
      data.announcement_description,
      data.announcement_img
    ];

    const [result] = await this.db.query(query, params);
    return result.insertId;
  }

  // GET all templates
  async getAllTemplates() {
    const query = 'SELECT * FROM templates ORDER BY created_at DESC';
    const [rows] = await this.db.query(query);
    return rows;
  }

  // GET template by ID
  async getTemplateById(id) {
    const query = 'SELECT * FROM templates WHERE id = ?';
    const [rows] = await this.db.query(query, [id]);
    return rows[0];
  }

  // DELETE template
  async deleteTemplate(id) {
    const query = 'DELETE FROM templates WHERE id = ?';
    const [result] = await this.db.query(query, [id]);
    return result.affectedRows > 0;
  }
}

export default TemplateModel;
