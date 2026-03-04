import GenerateModel from '../../../Models/mainAdmin_model/Generate-Model.js'; // fixed path to model
import cloudinary from '../../../core/cloudinary.js';

class GenerateController {
  constructor() {
    this.model = new GenerateModel();
  }


  isCloudinaryConfigured() {
    const hasDiscreteConfig = Boolean(
      String(process.env.CLOUDINARY_CLOUD_NAME || '').trim() &&
      String(process.env.CLOUDINARY_API_KEY || '').trim() &&
      String(process.env.CLOUDINARY_API_SECRET || '').trim()
    );

    if (hasDiscreteConfig) return true;

    const cloudinaryUrl = String(process.env.CLOUDINARY_URL || '').trim();
    if (!cloudinaryUrl) return false;

    try {
      const parsed = new URL(cloudinaryUrl);
      return Boolean(parsed.hostname && parsed.username && parsed.password);
    } catch {
      return false;
    }
  }

  async uploadToCloudinary(source, folder) {
    const result = await cloudinary.uploader.upload(source, { folder });
    return result?.secure_url || null;
  }

  async uploadMemberImages(members, cloudinaryReady, folder = 'websites/members') {
    if (!Array.isArray(members) || members.length === 0) return [];

    const uploadedMembers = [];
    for (const member of members) {
      const normalizedMember = { ...member };
      const imageSource = normalizedMember?.image || normalizedMember?.image_profile;

      if (!imageSource || typeof imageSource !== 'string') {
        uploadedMembers.push(normalizedMember);
        continue;
      }

      if (!cloudinaryReady) {
        uploadedMembers.push(normalizedMember);
        continue;
      }

      const isCloudinaryUrl = imageSource.includes('res.cloudinary.com');
      if (isCloudinaryUrl) {
        uploadedMembers.push(normalizedMember);
        continue;
      }

      try {
        const uploadedUrl = await this.uploadToCloudinary(imageSource, folder);
        normalizedMember.image = uploadedUrl;
        normalizedMember.image_profile = uploadedUrl;
      } catch (uploadErr) {
        console.warn('[GenerateController] Failed to upload member image:', uploadErr?.message || uploadErr);
      }

      uploadedMembers.push(normalizedMember);
    }

    return uploadedMembers;
  }

  // POST /generate-website
  async generateWebsite(req, res) {
    try {
      const {
        siteName,
        domain,
        db_user,
        db_password,
        db_host,
        dbName,
        dbUser,
        dbPassword,
        dbHost,
        short_bio,
        shortBio,
        description,
        community_type,
        communityType,
        subdomain,
        primaryColor,
        secondaryColor,
        accentColor,
        buttonStyle,
        fontStyle,
        bannerLink,
        members // array of objects {name, role, description, image}
      } = req.body;

      const normalizedSiteName = String(siteName || '').trim();
      const normalizedCommunityType = String(communityType || community_type || '').trim();
      const normalizedDbName = normalizedSiteName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const rawDomain = String(
        subdomain || domain || normalizedSiteName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      ).trim();
      const normalizedDomain = (rawDomain && rawDomain !== 'undefined' && rawDomain !== 'null')
        ? rawDomain
        : normalizedSiteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const normalizedShortBio = shortBio ?? short_bio ?? '';

      if (!normalizedSiteName) {
        return res.status(400).json({
          success: false,
          message: 'siteName is required'
        });
      }

      if (!normalizedDomain) {
        return res.status(400).json({
          success: false,
          message: 'subdomain/domain is required'
        });
      }

      // Handle file uploads
      let logoUrl = null;
      let bannerUrl = bannerLink || null;
      const cloudinaryReady = this.isCloudinaryConfigured();
      let parsedMembers = [];

      if (members) {
        try {
          parsedMembers = JSON.parse(members);
        } catch {
          parsedMembers = [];
        }
      }

      if (req.files) {
        if (req.files.logo) {
          if (!cloudinaryReady) {
            console.warn('[GenerateController] Cloudinary not configured. Skipping logo upload.');
          } else {
            const logoFile = req.files.logo;
            logoUrl = await this.uploadToCloudinary(
              logoFile.tempFilePath || logoFile.path,
              'websites'
            );
          }
        }
        if (req.files.banner) {
          if (!cloudinaryReady) {
            console.warn('[GenerateController] Cloudinary not configured. Skipping banner upload.');
          } else {
            const bannerFile = req.files.banner;
            bannerUrl = await this.uploadToCloudinary(
              bannerFile.tempFilePath || bannerFile.path,
              'websites'
            );
          }
        }
      }

      const normalizedMembers = await this.uploadMemberImages(
        parsedMembers,
        cloudinaryReady,
      );

      // Save to DB via model
      const siteId = await this.model.generateWebsite({
        siteName: normalizedSiteName,
        domain: normalizedDomain,
        db_user: db_user ?? dbUser,
        db_password: db_password ?? dbPassword,
        db_host: db_host ?? dbHost,
        db_name: normalizedDbName || dbName,
        short_bio: normalizedShortBio,
        description,
        primaryColor,
        communityType: normalizedCommunityType,
        community_type: normalizedCommunityType,
        secondaryColor,
        accentColor,
        buttonStyle,
        fontStyle,
        logo: logoUrl,
        banner: bannerUrl,
        members: normalizedMembers
      });

      res.status(200).json({
        success: true,
        message: 'Website generated successfully',
        siteId,
        subdomain
      });

    } catch (err) {
      console.error('GenerateController error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to generate website',
        error: err.message
      });
    }
  }

  // GET /generated-websites
  async getGeneratedWebsites(req, res) {
    try {
      const websites = await this.model.getGeneratedWebsites();

      res.status(200).json({
        success: true,
        message: 'Websites fetched successfully',
        data: websites,
        total: websites.length
      });

    } catch (err) {
      console.error('GetGeneratedWebsites error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch websites',
        error: err.message
      });
    }
  }

  // GET /community-selections
  async getCommunitySelections(req, res) {
    try {
      const rows = await this.model.getCommunitySelections();
      res.status(200).json({
        success: true,
        message: 'Community selections fetched successfully',
        data: rows,
        total: rows.length,
      });
    } catch (err) {
      console.error('GetCommunitySelections error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch community selections',
        error: err.message,
      });
    }
  }

  // GET /generated-websites/:id
  async getWebsiteById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid website ID'
        });
      }

      const website = await this.model.getWebsiteById(parseInt(id));

      if (!website) {
        return res.status(404).json({
          success: false,
          message: 'Website not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Website fetched successfully',
        data: website
      });

    } catch (err) {
      console.error('GetWebsiteById error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch website',
        error: err.message
      });
    }
  }

  // GET /generated-websites/type/:communityType
  async getWebsiteByCommunityType(req, res) {
    try {
      const { communityType } = req.params;
      const normalized = String(communityType || '').trim();

      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: 'communityType is required',
        });
      }

      const website = await this.model.getWebsiteByCommunityType(normalized);

      if (!website) {
        return res.status(404).json({
          success: false,
          message: 'Website not found for the specified communityType',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Website fetched successfully',
        data: website
      });
    } catch (err) {
      console.error('GetWebsiteByCommunityType error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch website',
        error: err.message,
      });
    }
  }

  // GET /generated-websites/names
  async getTemplate(req, res) {
    try {
      const sites = await this.model.getTemplateModel(); // dapat may function sa model
      res.status(200).json({
        success: true,
        message: 'Site templates fetched successfully',
        data: sites
      });
    } catch (err) {
      console.error('GetTemplate error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch site templates',
        error: err.message
      });
    }
  }

  // PUT /generated-websites/:id
  async updateGeneratedWebsite(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid website ID'
        });
      }

      const {
        site_name,
        community_type,
        status,
        short_bio,
        description,
        primary_color,
        secondary_color,
        accent_color,
        button_style,
        font_style,
        nav_position,
        logo,
        banner,
        members,
      } = req.body || {};
      const updated = await this.model.updateGeneratedWebsite(Number(id), {
        site_name,
        community_type,
        status,
        short_bio,
        description,
        primary_color,
        secondary_color,
        accent_color,
        button_style,
        font_style,
        nav_position,
        logo,
        banner,
        members
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Website not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Website updated successfully',
        data: updated
      });
    } catch (err) {
      console.error('UpdateGeneratedWebsite error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update website',
        error: err.message
      });
    }
  }

}

export default new GenerateController();
