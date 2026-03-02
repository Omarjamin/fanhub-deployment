import AdminModel from '../../../Models/mainAdmin_model/Admin-Model.js';
import jwt from 'jsonwebtoken';

class AdminController {
  constructor() {
    this.adminModel = new AdminModel();
  }

  // =========================
  // CREATE ADMIN
  // =========================
  async createAdmin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
          message: 'Please provide both email and password'
        });
      }

      const adminId = await this.adminModel.createAdmin({ email, password });
      
      return res.status(201).json({
        success: true,
        data: { id: adminId, email },
        message: 'Admin created successfully'
      });

    } catch (error) {
      console.error('Error in createAdmin:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create admin',
        message: 'An error occurred while creating admin'
      });
    }
  }

  // =========================
  // LOGIN
  // =========================
  async loginAdmin(req, res) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
          message: 'Please provide both email and password'
        });
      }

      const admin = await this.adminModel.loginAdmin(email, password);
      
      // Generate JWT token
      const jwtSecret = process.env.API_SECRET_KEY || process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT signing secret is not configured');
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email },
        jwtSecret,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        data: {
          id: admin.id,
          email: admin.email,
          token
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Error in loginAdmin:', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Authentication failed',
        message: 'Invalid email or password'
      });
    }
  }

  // =========================
  // GET ADMIN PROFILE
  // =========================
  async getAdminProfile(req, res) {
    try {
      const adminId = res.locals.userId || req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthenticated user',
        });
      }
      const admin = await this.adminModel.getAdminById(adminId);

      return res.status(200).json({
        success: true,
        data: admin,
        message: 'Admin profile retrieved successfully'
      });

    } catch (error) {
      console.error('Error in getAdminProfile:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve admin profile',
        message: 'An error occurred while retrieving admin profile'
      });
    }
  }

  // =========================
  // UPDATE ADMIN
  // =========================
  async updateAdmin(req, res) {
    try {
      const adminId = res.locals.userId || req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthenticated user',
        });
      }
      const updateData = {};

      // Only include fields that are provided
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.password) updateData.password = req.body.password;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
          message: 'Please provide at least one field to update'
        });
      }

      const updatedAdmin = await this.adminModel.updateAdmin(adminId, updateData);

      return res.status(200).json({
        success: true,
        data: updatedAdmin,
        message: 'Admin updated successfully'
      });

    } catch (error) {
      console.error('Error in updateAdmin:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update admin',
        message: 'An error occurred while updating admin'
      });
    }
  }

  // =========================
  // DELETE ADMIN
  // =========================
  async deleteAdmin(req, res) {
    try {
      const adminId = res.locals.userId || req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthenticated user',
        });
      }
      await this.adminModel.deleteAdmin(adminId);

      return res.status(200).json({
        success: true,
        message: 'Admin deleted successfully'
      });

    } catch (error) {
      console.error('Error in deleteAdmin:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete admin',
        message: 'An error occurred while deleting admin'
      });
    }
  }

  // =========================
  // REQUEST PASSWORD RESET
  // =========================
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          message: 'Please provide an email address'
        });
      }

      await this.adminModel.sendOtp(email);

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });

    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send OTP',
        message: 'An error occurred while processing your request'
      });
    }
  }

  // =========================
  // VERIFY OTP AND RESET PASSWORD
  // =========================
  async verifyOtpAndResetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required',
          message: 'Please provide email, OTP, and new password'
        });
      }

      const result = await this.adminModel.verifyOtp(email, otp, newPassword);

      if (!result) {
        throw new Error('Failed to reset password');
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Error in verifyOtpAndResetPassword:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to reset password',
        message: error.message || 'Invalid or expired OTP'
      });
    }
  }

  // =========================
  // LOGOUT
  // =========================
  async logoutAdmin(req, res) {
    try {
      await this.adminModel.logoutAdmin(req);

      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Error in logoutAdmin:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to logout',
        message: 'An error occurred while logging out'
      });
    }
  }

  // =========================
  // UPDATE PASSWORD
  // =========================
  async updatePassword(req, res) {
    try {
      const adminId = res.locals.userId || req.user?.id;
      const { currentPassword, newPassword } = req.body || {};

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthenticated user',
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'currentPassword and newPassword are required',
        });
      }

      const ok = await this.adminModel.updatePassword(adminId, currentPassword, newPassword);
      if (!ok) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update password',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      console.error('Error in updatePassword:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update password',
        message: 'An error occurred while updating password',
      });
    }
  }
}

export default AdminController;
