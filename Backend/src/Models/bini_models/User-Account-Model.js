import { connect, resolveCommunityContext } from "../../core/database.js";
import { encryptPassword } from "../../utils/hash.js";
import nodemailer from "nodemailer";

class UserModel {
  constructor() {
    this.activeCommunityId = null;
    this.columnCache = new Map();
    this.connect();
  }
  async connect() {
    this.db = await connect();
  }
  async ensureConnection(community_type) {
    try {
      this.db = await connect(community_type);
      const hasUsers = await this.hasTableOnPool(this.db, "users");
      const hasFollows = await this.hasTableOnPool(this.db, "follows");
      if (!hasUsers) {
        console.warn(
          `[UserModel] Falling back to default DB because users table is missing for community "${community_type}"`,
        );
        this.db = await connect();
      } else if (!hasFollows) {
        console.warn(
          `[UserModel] Falling back to default DB because follows table is missing for community "${community_type}"`,
        );
        this.db = await connect();
      }
      this.columnCache.clear();
      const ctx = await resolveCommunityContext(community_type);
      this.activeCommunityId = Number(ctx?.community_id || 0) || null;
    } catch (err) {
      console.error("<error> UserModel.ensureConnection failed:", err?.message || err);
      this.db = await connect();
      this.columnCache.clear();
      this.activeCommunityId = null;
    }
    return this.db;
  }
  async hasTableOnPool(pool, tableName) {
    try {
      const [rows] = await pool.query(
        `SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
         LIMIT 1`,
        [tableName],
      );
      return Boolean(rows?.length);
    } catch (_) {
      return false;
    }
  }
  async hasColumn(tableName, columnName) {
    const key = `${tableName}:${columnName}`.toLowerCase();
    if (this.columnCache.has(key)) return this.columnCache.get(key);
    try {
      const [rows] = await this.db.query(`SHOW COLUMNS FROM ${tableName}`);
      const exists = (rows || []).some(
        (row) => String(row?.Field || "").trim().toLowerCase() === String(columnName).trim().toLowerCase(),
      );
      this.columnCache.set(key, exists);
      return exists;
    } catch (_) {
      this.columnCache.set(key, false);
      return false;
    }
  }
  async getScopedCondition(tableName, alias = "") {
    const hasCommunityId = await this.hasColumn(tableName, "community_id");
    if (!hasCommunityId || !this.activeCommunityId) return { sql: "", params: [] };
    const col = alias ? `${alias}.community_id` : "community_id";
    return { sql: ` AND ${col} = ?`, params: [this.activeCommunityId] };
  }
  // request password reset
  async requestPasswordReset(email) {
    try {
      const otp = Math.floor(1000 + Math.random() * 9000);
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

      const success = await this.saveResetToken(email, otp, otpExpiry);
      if (!success) {
        throw new Error("No user found with that email address.");
      }

      await this.sendOtpEmail(email, otp);
      return { message: "Password reset token sent to your email." };
    } catch (err) {
      console.error("<error> user.requestPasswordReset", err);
      throw err;
    }
  }
  // send OTP email
  async sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
    });
  }
  // save reset token and expiry to database
  async saveResetToken(email, otp, otpExpiry) {
    const query =
      "UPDATE users SET reset_otp = ?, reset_expr = ? WHERE email = ?";
    const [result] = await this.db.query(query, [otp, otpExpiry, email]);
    return result.affectedRows > 0;
  }
  // verify OTP and reset password
  async verifyOtpAndResetPassword(email, otp, newPassword) {
    const query = "SELECT reset_otp, reset_expr FROM users WHERE email = ?";
    const [results] = await this.db.query(query, [email]);
    const user = results?.[0];

    if (!user) {
      throw new Error("No user found with that email address.");
    }

    const isOtpValid = String(user.reset_otp).trim() === String(otp).trim();
    const isOtpExpired = new Date() > new Date(user.reset_expr);

    if (!isOtpValid || isOtpExpired) {
      throw new Error("Invalid or expired OTP.");
    }

    const hashedPassword = await encryptPassword(newPassword);
    const updateQuery =
      "UPDATE users SET password = ?, reset_otp = NULL, reset_expr = NULL WHERE email = ?";
    const [result] = await this.db.query(updateQuery, [hashedPassword, email]);

    return result.affectedRows > 0;
  }
  // create user
  async createUser({ password, email, fullname, imageUrl }) {
    try {
      const hashedPassword = await encryptPassword(password);
      const query =
        "INSERT INTO users (email, password, fullname, profile_picture) VALUES (?, ?, ?, ?)";
      const [result] = await this.db.query(query, [
        email,
        hashedPassword,
        fullname,
        imageUrl,
      ]);
      return result.insertId;
    } catch (error) {
      console.error("<error> user.createUser  ", error);
      throw new Error("Error inserting user");
    }
  }
  // verify user credentials
  async verify(email, password) {
    try {
      const query =
        "SELECT user_id, email, password, fullname FROM users WHERE email = ?";
      const [results] = await this.db.query(query, [email]);
      const user = results?.[0];

      if (!user) {
        return null;
      }

      const hashedPassword = await encryptPassword(password);
      if (user.password === hashedPassword) {
        return user;
      } else {
        return null;
      }
    } catch (error) {
      console.error("<error> user.verify", error);
      throw new Error("User  verification failed");
    }
  }

  async getActiveSuspensionByUserId(userId) {
    const query = `
      SELECT suspension_id, starts_at, ends_at, reason
      FROM user_suspensions
      WHERE user_id = ?
        AND status = 'active'
        AND starts_at <= NOW()
        AND ends_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [rows] = await this.db.query(query, [userId]);
    return rows[0] || null;
  }
  // logout user
  async logoutUser(req, res) {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    return res.status(200).json({ message: "Logged out successfully" });
  }
  // get user by ID
  async getUserById(userId) {
    const scoped = await this.getScopedCondition("users");
    const query = `SELECT * FROM users WHERE user_id = ?${scoped.sql}`;
    const [result] = await this.db.query(query, [userId, ...scoped.params]);
    return result[0];
  }
  // get all users
  async getAllUsers() {
    const query = "SELECT * FROM users";
    const [result] = await this.db.query(query);
    return result;
  }
  // get user by username
  async getUserByUsername(username) {
    const scoped = await this.getScopedCondition("users");
    const query = `SELECT * FROM users WHERE username = ?${scoped.sql}`;
    const [result] = await this.db.query(query, [username, ...scoped.params]);
    return result[0];
  }
  // follow a user
  async follow(followerId, followedId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const usersScoped = await this.getScopedCondition("users", "u");

    if (usersScoped.sql) {
      const [allowedRows] = await this.db.query(
        `SELECT u.user_id
         FROM users u
         WHERE u.user_id IN (?, ?)${usersScoped.sql}`,
        [followerId, followedId, ...usersScoped.params],
      );
      if ((allowedRows || []).length < 2) {
        throw new Error("Users must belong to the active community");
      }
    }

    const existingQuery = `SELECT follow_id FROM follows f WHERE f.follower_id = ? AND f.followed_id = ?${followsScoped.sql} LIMIT 1`;
    const [existing] = await this.db.query(existingQuery, [followerId, followedId, ...followsScoped.params]);
    if (existing?.length) {
      return { message: "Already following" };
    }

    const hasFollowsCommunity = await this.hasColumn("follows", "community_id");
    const query = hasFollowsCommunity
      ? "INSERT INTO follows (follower_id, followed_id, community_id) VALUES (?, ?, ?)"
      : "INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)";
    const params = hasFollowsCommunity
      ? [followerId, followedId, this.activeCommunityId]
      : [followerId, followedId];
    const [result] = await this.db.query(query, params);

    if (result.affectedRows > 0) {
      await this.createFollowNotification(followerId, followedId);
      return { message: "Followed successfully" };
    } else {
      throw new Error("Failed to follow user");
    }
  }
  // unfollow a user
  async unfollow(followerId, followedId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const query =
      `DELETE FROM follows f WHERE f.follower_id = ? AND f.followed_id = ?${followsScoped.sql}`;
    const [result] = await this.db.query(query, [followerId, followedId, ...followsScoped.params]);

    if (result.affectedRows > 0) {
      await this.deleteFollowNotification(followerId, followedId);
      return { message: "Unfollowed successfully" };
    } else {
      throw new Error("Failed to unfollow user");
    }
  }
  // check if a user is following another user
  async isFollowing(followerId, followedId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const query =
      `SELECT * FROM follows f WHERE f.follower_id = ? AND f.followed_id = ?${followsScoped.sql}`;
    const [result] = await this.db.query(query, [followerId, followedId, ...followsScoped.params]);
    return result.length > 0;
  }
  // create follow notification
  async createFollowNotification(followerId, followedId) {
    const hasNotifCommunity = await this.hasColumn("notifications", "community_id");
    const notificationQuery = hasNotifCommunity
      ? "INSERT INTO notifications (user_id, activity_type, source_user_id, community_id) VALUES (?, ?, ?, ?)"
      : "INSERT INTO notifications (user_id, activity_type, source_user_id) VALUES (?, ?, ?)";
    const params = hasNotifCommunity
      ? [followedId, "follow", followerId, this.activeCommunityId]
      : [followedId, "follow", followerId];
    await this.db.query(notificationQuery, params);
  }
  // delete follow notification
  async deleteFollowNotification(followerId, followedId) {
    const notifScoped = await this.getScopedCondition("notifications");
    const notificationQuery =
      `DELETE FROM notifications WHERE user_id = ? AND activity_type = ? AND source_user_id = ?${notifScoped.sql}`;
    await this.db.query(notificationQuery, [followedId, "follow", followerId, ...notifScoped.params]);
  }
  async getFollowers(userId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const usersScoped = await this.getScopedCondition("users", "u");
    const query = `
      SELECT u.user_id, u.fullname, u.profile_picture
      FROM follows f
      JOIN users u ON u.user_id = f.follower_id
      WHERE f.followed_id = ?${followsScoped.sql}${usersScoped.sql}
      ORDER BY f.created_at DESC
    `;
    const [result] = await this.db.query(query, [userId, ...followsScoped.params, ...usersScoped.params]);
    return result;
  }
  async getFollowing(userId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const usersScoped = await this.getScopedCondition("users", "u");
    const query = `
      SELECT u.user_id, u.fullname, u.profile_picture
      FROM follows f
      JOIN users u ON u.user_id = f.followed_id
      WHERE f.follower_id = ?${followsScoped.sql}${usersScoped.sql}
      ORDER BY f.created_at DESC
    `;
    const [result] = await this.db.query(query, [userId, ...followsScoped.params, ...usersScoped.params]);
    return result;
  }
  async getFollowerCount(userId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const query = `
      SELECT COUNT(*) AS follower_count
      FROM follows f
      WHERE f.followed_id = ?${followsScoped.sql}
    `;
    const [result] = await this.db.query(query, [userId, ...followsScoped.params]);
    return Number(result?.[0]?.follower_count || 0);
  }
  async getFollowingCount(userId) {
    const followsScoped = await this.getScopedCondition("follows", "f");
    const query = `
      SELECT COUNT(*) AS following_count
      FROM follows f
      WHERE f.follower_id = ?${followsScoped.sql}
    `;
    const [result] = await this.db.query(query, [userId, ...followsScoped.params]);
    return Number(result?.[0]?.following_count || 0);
  }
  // update user profile
  async updateUser(userId, { fullname, profile_picture }) {
    try {
      const query =
        "UPDATE users SET fullname = ?, profile_picture = ? WHERE user_id = ?";
      const [result] = await this.db.query(query, [
        fullname,
        profile_picture,
        userId,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("<error> user.updateUser", error);
      throw new Error("Failed to update user profile");
    }
  }
}

export default UserModel;
