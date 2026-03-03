import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import UserModel from "../../../Models/bini_models/User-Account-Model.js";
import { resolveSiteSlug } from "../../../utils/site-scope.js";

class UserController {
  constructor() {
    this.userModel = new UserModel();
  }
  async ensureDbForRequest(req, res) {
    const communityType = resolveSiteSlug(req, res);
    if (!communityType) {
      const err = new Error("community_type is required");
      err.statusCode = 400;
      throw err;
    }
    await this.userModel.ensureConnection(communityType);
  }
  // Create a new user
  async createUser(req, res) {
    const { email, password, fullname, imageUrl } = req.body;

    console.log(req.body);
    // Check if all fields are provided
    if (!password || !email || !fullname) {
      return res.status(400).json({ error: "All fields are required" });
    }
    // Check if email is a Gmail account
    const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .json({ error: "Email must be a valid Gmail account" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const userId = await this.userModel.createUser({
        email,
        password,
        fullname,
        imageUrl,
      });

      console.log(userId);
      return res
        .status(201)
        .json({ message: "User created successfully", userId });
    } catch (error) {
      console.error("Error creating user:", error.message);
      return res.status(500).json({ error: "Failed to create user" });
    }
  }
  // User login
  async loginUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const user = await this.userModel.verify(email, password);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const activeSuspension = await this.userModel.getActiveSuspensionByUserId(user.user_id);
      if (activeSuspension) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          suspension_until: activeSuspension.ends_at,
          message: `Your account is suspended for 3 days until ${new Date(activeSuspension.ends_at).toLocaleString()}`,
        });
      }

      const token = jwt.sign(
        { email: user.email, id: user.user_id },
        process.env.API_SECRET_KEY,
        { expiresIn: "1d" },
      );

      console.log(token);

      return res.status(200).json({ message: "Login successful", token });
    } catch (error) {
      console.error("Error verifying user:", error.message);
      return res.status(500).json({ error: "Login failed" });
    }
  }
  // Request OTP for password reset
  async requestPasswordReset(req, res) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const response = await this.userModel.requestPasswordReset(email);
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error requesting password reset:", error.message);
      return res.status(500).json({ error: "Failed to send OTP" });
    }
  }
  // Password Reset Function
  async resetPassword(req, res) {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ error: "Email, OTP, and new password are required" });
    }
    // Debugging log
    console.log("Reset Password Request:", { email, otp, newPassword });

    try {
      // Verify the OTP and update the password
      const success = await this.userModel.verifyOtpAndResetPassword(
        email,
        otp,
        newPassword,
      );

      if (!success) {
        return res.status(400).json({ error: "Invalid OTP or email." });
      }

      return res
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } catch (error) {
      console.error("Error resetting password:", error.message);
      return res.status(500).json({ error: "Failed to reset password." });
    }
  }
  // Configure the Nodemailer transporter
  async sendResetEmail(email, resetToken) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Please use the following token to reset your password: ${resetToken}`,
      html: `<p>Please use the following token to reset your password:</p><p><strong>${resetToken}</strong></p>`,
    };

    try {
      // Send email
      await transporter.sendMail(mailOptions);
      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("Error sending password reset email:", error.message);
      throw new Error("Failed to send password reset email");
    }
  }
  // Get all users
  async GetAllUser(req, res) {
    try {
      const users = await this.userModel.getAllUsers();

      console.log(users);
      if (!users || users.length === 0) {
        return res.status(404).json({ error: "No users found" });
      }

      return res.status(200).json({ users });
    } catch (error) {
      console.error("Error fetching all users:", error.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }
  // Get current user's profile
  async getUserProfile(req, res) {
    const userId = res.locals.userId;

    console.log(userId);

    try {
      await this.ensureDbForRequest(req, res);
      const user = await this.userModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  }
  // Get another user's profile for follow/unfollow actions
  async getfollowProfile(req, res) {
    const userId = req.params.id;

    try {
      await this.ensureDbForRequest(req, res);
      const user = await this.userModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  }
  // Get user by ID
  async GetUser(req, res) {
    const userId = req.params.id;
    try {
      await this.ensureDbForRequest(req, res);
      const user = await this.userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(200).json({ user });
    } catch (error) {
      console.error("Error fetching user:", error.message);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  }
  // User logout
  async logoutUser(req, res) {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    return res.status(200).json({ message: "Logged out successfully" });
  }
  // Follow another user
  async follow(req, res) {
    const followerId = res.locals.userId;
    const followedId = req.params.id;
    console.log("Follow Request:", { followerId, followedId });

    if (!followedId) {
      return res.status(400).json({ error: "Followed user ID is required" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const success = await this.userModel.follow(followerId, followedId);

      if (success) {
        return res.status(200).json({ message: "Successfully followed user" });
      } else {
        return res.status(400).json({ error: "Failed to follow user" });
      }
    } catch (error) {
      console.error("Error following user:", error.message);
      return res.status(500).json({ error: "Failed to follow user" });
    }
  }
  // Unfollow a user
  async unfollow(req, res) {
    const followerId = res.locals.userId;
    const followedId = req.params.id;

    if (!followedId) {
      return res.status(400).json({ error: "Followed user ID is required" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const success = await this.userModel.unfollow(followerId, followedId);

      if (success) {
        return res
          .status(200)
          .json({ message: "Successfully unfollowed user" });
      } else {
        return res.status(400).json({ error: "Failed to unfollow user" });
      }
    } catch (error) {
      console.error("Error unfollowing user:", error.message);
      return res.status(500).json({ error: "Failed to unfollow user" });
    }
  }
  // Get follower list of a user
  async getFollowerList(req, res) {
    const { id } = req.params;

    try {
      await this.ensureDbForRequest(req, res);
      const followers = await this.userModel.getFollowers(id);

      if (!followers) {
        return res.status(404).json({ error: "No followers found" });
      }

      return res.status(200).json({ followers });
    } catch (error) {
      console.error("Error fetching followers:", error.message);
      return res.status(500).json({ error: "Failed to fetch followers" });
    }
  }
  // Get follower count of a user
  async getFollowerCount(req, res) {
    const userId = req.params.id;
    try {
      await this.ensureDbForRequest(req, res);
      const followerCount = await this.userModel.getFollowerCount(userId);

      if (followerCount === null) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(200).json({ followerCount });
    } catch (error) {
      console.error("Error fetching follower count:", error.message);
      return res.status(500).json({ error: "Failed to fetch follower count" });
    }
  }
  // Get following count of a user
  async getFollowingCount(req, res) {
    const userId = req.params.id;

    try {
      await this.ensureDbForRequest(req, res);
      const count = await this.userModel.getFollowingCount(userId);

      return res.status(200).json({ followingCount: count });
    } catch (error) {
      console.error("Error fetching following count:", error.message);
      return res.status(500).json({ error: "Failed to fetch following count" });
    }
  }
  // Get following list of a user
  async getFollowingList(req, res) {
    const { id } = req.params;

    try {
      await this.ensureDbForRequest(req, res);
      const following = await this.userModel.getFollowing(id);

      if (!following) {
        return res.status(404).json({ error: "No followed users found" });
      }

      return res.status(200).json({ following });
    } catch (error) {
      console.error("Error fetching followed users:", error.message);
      return res.status(500).json({ error: "Failed to fetch followed users" });
    }
  }
  // Check if current user is following another user
  async isfollowing(req, res) {
    const userId = res.locals.userId;
    const followedId = req.params.id;

    if (!followedId) {
      return res.status(400).json({ error: "Followed user ID is required" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const isFollowing = await this.userModel.isFollowing(userId, followedId);

      return res.status(200).json({ isFollowing });
    } catch (error) {
      console.error("Error checking following status:", error.message);
      return res
        .status(500)
        .json({ error: "Failed to check following status" });
    }
  }
  // Update user profile
  async updateUser(req, res) {
    const userId = res.locals.userId;
    const { fullname, profile_picture } = req.body;

    if (!fullname && !profile_picture) {
      return res
        .status(400)
        .json({ error: "At least one field is required to update" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const updates = {};
      if (fullname) updates.fullname = fullname;
      if (profile_picture) updates.profile_picture = profile_picture;

      const success = await this.userModel.updateUser(userId, updates);

      if (success) {
        return res
          .status(200)
          .json({ message: "User profile updated successfully" });
      } else {
        return res.status(400).json({ error: "Failed to update user profile" });
      }
    } catch (error) {
      console.error("Error updating user:", error.message);
      return res.status(500).json({ error: "Failed to update user profile" });
    }
  }
}
export default UserController;
