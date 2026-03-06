import jwt from 'jsonwebtoken';
import UserModel from '../../../Models/ecommerce_model/user_model.js';

class UserController {
  constructor() {
    this.userModel = new UserModel();
  }

  async verifyRecaptchaToken(token, remoteIp = '') {
    const secret = String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
    if (!secret) {
      // Local/dev fallback: do not block auth flows when reCAPTCHA secret is absent.
      // Production should set RECAPTCHA_SECRET_KEY.
      console.warn('RECAPTCHA_SECRET_KEY is not configured; skipping reCAPTCHA verification.');
      return true;
    }
    if (!token) return false;

    let timeoutId = null;
    try {
      const body = new URLSearchParams();
      body.append('secret', secret);
      body.append('response', token);
      if (remoteIp) body.append('remoteip', remoteIp);
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      return Boolean(data?.success);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error('reCAPTCHA verification failed:', error?.message || error);
      return false;
    }
  }

  async verifyGoogleCredential(credential) {
    if (!credential) throw new Error('Missing Google credential');

    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload = await res.json().catch(() => ({}));

    if (!res.ok || !payload?.email) {
      throw new Error('Invalid Google credential');
    }

    if (String(payload.email_verified || '').toLowerCase() !== 'true') {
      throw new Error('Google email is not verified');
    }

    const rawAudiences = String(
      process.env.GOOGLE_CLIENT_IDS ||
      process.env.GOOGLE_CLIENT_ID ||
      '',
    ).trim();
    const expectedAudiences = rawAudiences
      .split(',')
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    if (expectedAudiences.length > 0 && !expectedAudiences.includes(String(payload.aud || '').trim())) {
      throw new Error('Google credential audience mismatch');
    }

    return {
      email: payload.email,
      fullname: payload.name || payload.email,
      imageUrl: payload.picture || '',
      sub: payload.sub || '',
    };
  }


  // register user 
  async createUser(req, res) {
  const {
    username,
    password,
    email,
    firstname,
    lastname,
    imageUrl,
    site_slug,
    domain,
    site_name,
    recaptcha_token,
    email_otp,
    request_email_otp,
  } = req.body;
  const activeSiteName = String(domain || site_slug || site_name || '').trim().toLowerCase();

  console.log(req.body)

  if (!activeSiteName) {
    return res.status(400).json({ error: 'domain/site_slug is required' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Check if email is a Gmail account
  const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Email must be a valid Gmail account' });
  }

  try {
    // Step 1: Request OTP for email verification
    if (request_email_otp || !email_otp) {
      const recaptchaOk = await this.verifyRecaptchaToken(recaptcha_token, req.ip);
      if (!recaptchaOk) {
        return res.status(400).json({ error: 'Failed reCAPTCHA verification' });
      }

      const otpResult = await this.userModel.requestRegistrationOtp(email, activeSiteName, domain || site_slug);
      if (otpResult.status === 'error') {
        let statusCode = 400;
        if (otpResult.message.includes('Please wait')) statusCode = 429;
        if (otpResult.code === 'OTP_EMAIL_SEND_FAILED') statusCode = 503;
        return res.status(statusCode).json({ error: otpResult.message });
      }
      return res.status(200).json({
        message: otpResult.message,
        requires_email_verification: true,
      });
    }

    // Step 2: Verify OTP and create local account
    if (!username || !password || !firstname || !lastname) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const otpVerification = await this.userModel.verifyRegistrationOtp(
      email,
      email_otp,
      activeSiteName,
      domain || site_slug,
    );
    if (otpVerification.status !== 'success') {
      return res.status(400).json({ error: otpVerification.message });
    }

    const userId = await this.userModel.createUser({
      username,
      password,
      email,
      firstname,
      lastname,
      imageUrl,
      community_type: activeSiteName,
      site_slug,
    });
    return res.status(201).json({
      message: 'User created successfully',
      userId,
      email_verified: true,
    });
  } catch (error) {
    console.error('Error creating user:', error.message);
    if (error?.code === 'SITE_DB_NOT_FOUND' || error?.code === 'SITE_SCOPE_NOT_FOUND') {
      return res.status(404).json({ error: `Site/community not found for "${activeSiteName}"` });
    }

    // If error message comes from model (e.g. "Username already taken")
    if (
      error.message === 'Username already taken' ||
      error.message === 'Email already registered'
    ) {
      return res.status(400).json({ error: error.message });
    }

    // Default server error
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

  async loginUser(req, res) {
    const { email, password, site_slug, domain, site_name, recaptcha_token } = req.body;
    const activeSiteName = String(domain || site_slug || site_name || '').trim().toLowerCase();
    console.log('Received body:', req.body);

    if (!email || !password || !activeSiteName) {
      return res.status(400).json({ error: 'Email, password, and domain/site_slug are required' });
    }

    try {
      const recaptchaOk = await this.verifyRecaptchaToken(recaptcha_token, req.ip);
      if (!recaptchaOk) {
        return res.status(400).json({ error: 'Failed reCAPTCHA verification' });
      }

      console.log('Attempting login for email:', email);

      // Call verify()
      const result = await this.userModel.verify(email, password, activeSiteName, domain || site_slug);
      console.log('Verification result:', result);

      if (!result || result.status !== 'success') {
        if (result?.status === 'suspended') {
          return res.status(403).json({
            error: result.message,
            code: result.code || 'ACCOUNT_SUSPENDED',
            suspension_until: result.suspension_until || null,
          });
        }
        if (result?.status === 'locked') {
          return res.status(423).json({
            error: result.message,
            code: result.code || 'ACCOUNT_TEMP_LOCKED',
            email,
            failed_login_attempts: result.failedLoginAttempts || 5,
            locked_until: result.locked_until || null,
          });
        }
        const message = result?.message || 'Invalid credentials';
        console.log('Login failed:', message);
        return res.status(401).json({ error: message });
      }

      const user = result.user;

      const token = jwt.sign(
        { email: email, id: user.user_id },
        process.env.API_SECRET_KEY,
        { expiresIn: '1d' }
      );

      console.log('User authenticated successfully:', email);

      return res.status(200).json({ message: 'Login successful', token });

    } catch (error) {
      console.error('Error during login:', error);
      if (error?.code === 'SITE_DB_NOT_FOUND' || error?.code === 'SITE_SCOPE_NOT_FOUND') {
        return res.status(404).json({
          error: `Site/community not found for "${activeSiteName}"`,
        });
      }
      return res.status(500).json({ error: 'Login failed: ' + error.message });
    }
  }

  async googleAuth(req, res) {
    const { credential, site_slug, domain, site_name, recaptcha_token } = req.body || {};
    const activeSiteName = String(domain || site_slug || site_name || '').trim().toLowerCase();

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }
    if (!activeSiteName) {
      return res.status(400).json({ error: 'domain/site_slug is required' });
    }

    try {
      const recaptchaOk = await this.verifyRecaptchaToken(recaptcha_token, req.ip);
      if (!recaptchaOk) {
        return res.status(400).json({ error: 'Failed reCAPTCHA verification' });
      }

      const googleUser = await this.verifyGoogleCredential(credential);
      const user = await this.userModel.findOrCreateGoogleUser({
        email: googleUser.email,
        fullname: googleUser.fullname,
        imageUrl: googleUser.imageUrl,
        googleId: googleUser.sub,
        community_type: activeSiteName,
        site_slug: site_slug || domain,
      });

      const activeSuspension = await this.userModel.getActiveSuspensionByUserId(
        user.user_id,
        activeSiteName,
        site_slug || domain,
      );
      if (activeSuspension) {
        return res.status(403).json({
          error: `Your account has been suspended until ${new Date(activeSuspension.ends_at).toLocaleString()}`,
          code: 'ACCOUNT_SUSPENDED',
          suspension_until: activeSuspension.ends_at,
        });
      }

      const token = jwt.sign(
        { email: googleUser.email, id: user.user_id },
        process.env.API_SECRET_KEY,
        { expiresIn: '1d' },
      );

      return res.status(200).json({
        message: 'Google authentication successful',
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          fullname: user.fullname,
          profile_picture: user.profile_picture || null,
        },
      });
    } catch (error) {
      console.error('Error during googleAuth:', error);
      if (error?.code === 'SITE_DB_NOT_FOUND' || error?.code === 'SITE_SCOPE_NOT_FOUND') {
        return res.status(404).json({ error: `Site/community not found for "${activeSiteName}"` });
      }
      return res.status(401).json({ error: error.message || 'Google authentication failed' });
    }
  }



  // Request OTP for password reset
  async requestPasswordReset(req, res) {
    const { email, site_slug, domain, site_name } = req.body;
    const activeSiteName = String(domain || site_slug || site_name || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!activeSiteName) {
      return res.status(400).json({ error: 'domain/site_slug is required.' });
    }

    try {
      const response = await this.userModel.requestPasswordReset(email, activeSiteName, domain || site_slug);

      if (response.status === 'error') {
        if (response.message.includes('No user')) {
          return res.status(404).json(response);
        } else if (response.message.includes('Please wait')) {
          return res.status(429).json(response);
        }
        return res.status(400).json(response);
      }

      return res.status(200).json(response);

    } catch (error) {
      console.error('Error requesting password reset:', error.message);
      if (error?.code === 'SITE_DB_NOT_FOUND' || error?.code === 'SITE_SCOPE_NOT_FOUND') {
        return res.status(404).json({ error: `Site/community not found for "${activeSiteName}"` });
      }
      return res.status(500).json({ error: 'Failed to send OTP.' });
    }
  }


  async resetPassword(req, res) {
    const { email, otp, newPassword, site_slug, domain, site_name } = req.body;
    const activeSiteName = String(domain || site_slug || site_name || '').trim().toLowerCase();

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }
    if (!activeSiteName) {
      return res.status(400).json({ error: 'domain/site_slug is required.' });
    }

    try {
      const success = await this.userModel.verifyOtpAndResetPassword(
        email,
        otp,
        newPassword,
        activeSiteName,
        domain || site_slug,
      );

      if (!success) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
      }

      return res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
      console.error('Error resetting password:', error.message);
      if (error?.code === 'SITE_DB_NOT_FOUND' || error?.code === 'SITE_SCOPE_NOT_FOUND') {
        return res.status(404).json({ error: `Site/community not found for "${activeSiteName}"` });
      }
      return res.status(500).json({ error: 'Failed to reset password.' });
    }
  }



  async GetAllUser(req, res) {
    try {
      const users = await this.userModel.getAllUsers();

      console.log(users);
      if (!users || users.length === 0) {
        return res.status(404).json({ error: 'No users found' });

      }

      return res.status(200).json({ users });
    } catch (error) {
      console.error('Error fetching all users:', error.message);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getUserProfile(req, res) {
    const userId = res.locals.userId;

    try {
      const user = await this.userModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  async getfollowProfile(req, res) {
    const userId = req.params.id;

    try {
      const user = await this.userModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  async GetUser(req, res) {
    const userId = req.params.id;
    try {
      const user = await this.userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ user });
    } catch (error) {
      console.error('Error fetching user:', error.message);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }


  
  async logoutUser (req, res) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    return res.status(200).json({ message: 'Logged out successfully' });
}

  async follow(req, res) {
    const followerId = res.locals.userId;
    const followedId = req.params.id;

    console.log('Follow Request:', { followerId, followedId });

    if (!followedId) {
      return res.status(400).json({ error: 'Followed user ID is required' });
    }

    try {
      const success = await this.userModel.follow(followerId, followedId);

      if (success) {
        return res.status(200).json({ message: 'Successfully followed user' });
      } else {
        return res.status(400).json({ error: 'Failed to follow user' });
      }
    } catch (error) {
      console.error('Error following user:', error.message);
      return res.status(500).json({ error: 'Failed to follow user' });
    }
  }

  async unfollow(req, res) {
    const followerId = res.locals.userId;
    const followedId = req.params.id;

    if (!followedId) {
      return res.status(400).json({ error: 'Followed user ID is required' });
    }

    try {
      const success = await this.userModel.unfollow(followerId, followedId);

      if (success) {
        return res.status(200).json({ message: 'Successfully unfollowed user' });
      } else {
        return res.status(400).json({ error: 'Failed to unfollow user' });
      }
    } catch (error) {
      console.error('Error unfollowing user:', error.message);
      return res.status(500).json({ error: 'Failed to unfollow user' });
    }
  }

  async getFollowerList(req, res) {
    const { id } = req.params;

    try {
      const followers = await this.userModel.getFollowers(id);

      if (!followers) {
        return res.status(404).json({ error: 'No followers found' });
      }

      return res.status(200).json({ followers });
    } catch (error) {
      console.error('Error fetching followers:', error.message);
      return res.status(500).json({ error: 'Failed to fetch followers' });
    }
  }

  async getFollowerCount(req, res) {
    const userId = req.params.id;
    try {
      const followerCount = await this.userModel.getFollowerCount(userId);

      if (followerCount === null) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ followerCount });
    } catch (error) {
      console.error('Error fetching follower count:', error.message);
      return res.status(500).json({ error: 'Failed to fetch follower count' });
    }
  }

  async getFollowingCount(req, res) {
    const userId = req.params.id;

    try {
      const count = await this.userModel.getFollowingCount(userId);

      return res.status(200).json({ followingCount: count });
    } catch (error) {
      console.error('Error fetching following count:', error.message);
      return res.status(500).json({ error: 'Failed to fetch following count' });
    }
  }

  async getFollowingList(req, res) {
    const { id } = req.params;

    try {
      const following = await this.userModel.getFollowing(id);

      if (!following) {
        return res.status(404).json({ error: 'No followed users found' });
      }

      return res.status(200).json({ following });
    } catch (error) {
      console.error('Error fetching followed users:', error.message);
      return res.status(500).json({ error: 'Failed to fetch followed users' });
    }
  }


  async isfollowing(req, res) {
    const userId = res.locals.userId;
    const followedId = req.params.id;

    if (!followedId) {
      return res.status(400).json({ error: 'Followed user ID is required' });
    }

    try {
      const isFollowing = await this.userModel.isFollowing(userId, followedId);

      return res.status(200).json({ isFollowing });
    } catch (error) {
      console.error('Error checking following status:', error.message);
      return res.status(500).json({ error: 'Failed to check following status' });
    }
  }

  async updateUser(req, res) {
    const userId = res.locals.userId;
    const { fullname, profile_picture } = req.body;

    if (!fullname && !imageUrl) {
      return res.status(400).json({ error: 'At least one field is required to update' });
    }

    try {
      const updates = {};
      if (fullname) updates.fullname = fullname;
      if (profile_picture) updates.profile_picture = profile_picture;

      const success = await this.userModel.updateUser(userId, updates);

      if (success) {
        return res.status(200).json({ message: 'User profile updated successfully' });
      } else {
        return res.status(400).json({ error: 'Failed to update user profile' });
      }
    } catch (error) {
      console.error('Error updating user:', error.message);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }
  }

  async getCommunities(req, res) {
    try {
      const communities = await this.userModel.getCommunities();
      return res.status(200).json({ communities });
    } catch (error) {
      console.error('Error fetching communities:', error);
      return res.status(500).json({ error: 'Failed to fetch communities' });
    }
  }

}


export default UserController;
