import { connect } from "../../core/database.js";

class UserCommunityModel {
  constructor() {
    this.connect();
  }

  async connect() {
    this.db = await connect();
  }

  async userHasAccess(userId, communityId) {
    const query = `
      SELECT 1
      FROM user_communities
      WHERE user_id = ? AND community_id = ?
      LIMIT 1
    `;

    try {
      const [rows] = await this.db.execute(query, [userId, communityId]);
      return rows.length > 0;
    } catch (err) {
      console.error("Error checking user-community access:", err);
      throw err;
    }
  }
}

export default new UserCommunityModel();
