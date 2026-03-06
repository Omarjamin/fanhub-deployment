import PostModel from "../../../Models/bini_models/PostModels.js";
import { resolveSiteSlug } from "../../../utils/site-scope.js";
import sanitizeHtml from "sanitize-html";

class PostController {
  constructor() {
    this.postModel = new PostModel();
  }
  async ensureDbForRequest(req, res) {
    const communityType = resolveSiteSlug(req, res);
    if (!communityType) {
      const err = new Error("community_type is required");
      err.statusCode = 400;
      throw err;
    }
    await this.postModel.ensureConnection(communityType);
  }
  // Regex Function ito yun pag hiwalay nang hashtag at plain text
  extractHashtagsAndContent(content) {
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    console.log("Hashtags:", hashtags);

    const plainContent = content
      .replace(/#[a-zA-Z0-9_]+/g, "")
      .replace(/[.,]/g, "")
      .trim();

    return { hashtags, plainContent };
  }

  sanitizePostContent(content) {
    return sanitizeHtml(String(content || ""), {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  }

  // Create new post
  async createPost(req, res) {
    await this.ensureDbForRequest(req, res);
    const { img_url } = req.body;
    const content = this.sanitizePostContent(req.body?.content);
    const user_id = res.locals.userId;
    const communityType =
      res.locals.communityType ||
      String(req.headers["x-community-type"] || "").trim().toLowerCase();

    if (!communityType) {
      return res.status(400).json({ error: "community_type is required" });
    }

    console.log(req.body, user_id);

    if (!user_id || !content) {
      return res
        .status(400)
        .json({ error: "user_id and content fields are required" });
    }

    if (content.length > 500) {
      return res
        .status(400)
        .json({ error: "Content must be less than 500 characters" });
    }

    try {
      // Extract hashtags and plain content
      const { hashtags, plainContent } =
        this.extractHashtagsAndContent(content);

      console.log(hashtags, plainContent);

      // Create new post
      const newPost = await this.postModel.createPost(
        user_id,
        plainContent,
        img_url || null,
        hashtags,
        communityType,
      );
      res.status(201).json(newPost);
    } catch (err) {
      if (err?.code === "CONTENT_MODERATION_BLOCKED") {
        return res.status(400).json({
          error: err.message || "Suspicious words detected. Please revise your post.",
          warning: "Suspicious words detected",
          moderation: err?.moderation || null,
        });
      }
      res.status(500).json({ error: err.message });
    }
  }
  // Get posts of another user
  async getOtherUserPosts(req, res) {
    await this.ensureDbForRequest(req, res);
    const userId = req.params.userId; // Get the userId from the request parameters
    try {
      const posts = await this.postModel.getOtherUserPosts(userId);

      // Return empty array instead of 404 when no posts found
      if (!posts || posts.length === 0) {
        return res.status(200).json([]);
      }

      res.status(200).json(posts);
    } catch (err) {
      console.error("Error in getOtherUserPosts:", err);
      res.status(500).json({ error: err.message });
    }
  }
  // Delete post
  async deletePost(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const { postId } = req.params;
      const userId = res.locals.userId;
      const deletedRows = await this.postModel.deletePost(postId, userId);
      if (deletedRows === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
      console.error("Error in deletePost:", err);
      res.status(500).json({ error: err.message });
    }
  }
  // Update post
  async updatePost(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const { postId } = req.params;
      const userId = res.locals.userId;
      const { img_url } = req.body;
      const content =
        req.body?.content !== undefined
          ? this.sanitizePostContent(req.body.content)
          : undefined;
      const post = await this.postModel.getPostById(postId);
      const updatedContent = content !== undefined ? content : post.content;
      const updatedImgUrl = img_url !== undefined ? img_url : post.img_url;
      const updatedRows = await this.postModel.updatePost(
        postId,
        userId,
        updatedContent,
        updatedImgUrl,
      );
      if (updatedRows === 0) {
        return res
          .status(404)
          .json({ error: "Post not found or no changes made" });
      }

      res.status(200).json({ message: "Post updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Repost post
  async repostPost(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const { postId } = req.params;
      const userId = res.locals.userId;

      const post = await this.postModel.getPostById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const alreadyReposted = await this.postModel.hasUserReposted(userId, postId);
      if (alreadyReposted) {
        return res.status(409).json({ error: "You have already reposted this post." });
      }

      await this.postModel.repostPost(userId, postId);
      res.status(201).json({ message: "Post reposted successfully.", post });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Get user posts
  async getUserPosts(req, res) {
    await this.ensureDbForRequest(req, res);
    const userId = res.locals.userId;

    try {
      const posts = await this.postModel.getUserPosts(userId);
      res.status(200).json(posts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Get random posts
  async randomPosts(req, res) {
    const limit = parseInt(req.query.limit) || 7;
    const offset = parseInt(req.query.offset) || 0;
    const communityType = resolveSiteSlug(req, res);

    if (!communityType) {
      return res.status(400).json({ error: 'community_type is required' });
    }
    try {
      await this.ensureDbForRequest(req, res);
      const posts = await this.postModel.getRandomPost(limit, offset, communityType);
      res.status(200).json(posts);
    } catch (error) {
      console.error("Error in randomPosts controller:", error);
      res.status(500).json({ error: error.message });
    }
  }
  // Get posts of users the current user is following
  async getFollowingPosts(req, res) {
    await this.ensureDbForRequest(req, res);
    const userId = res.locals.userId;

    try {
      const posts = await this.postModel.getFollowingPosts(userId);
      if (!posts || posts.length === 0) {
        return res.status(404).json({ error: "No posts found for this user" });
      }

      res.status(200).json(posts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Get reposts of another user
  async getothersreposts(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const userId = req.params.userId;
      const reposts = await this.postModel.getReposts(userId); // Use getReposts, not getothersReposts
      res.json(reposts);
    } catch (error) {
      console.error("Error in getothersreposts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  // Get reposts of current user
  async getrepost(req, res) {
    await this.ensureDbForRequest(req, res);
    const userId = res.locals.userId;

    try {
      const reposts = await this.postModel.getReposts(userId);
      if (!reposts || reposts.length === 0) {
        return res
          .status(404)
          .json({ error: "No reposts found for this user" });
      }

      res.status(200).json(reposts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get reposts for a specific post (with user check if authenticated)
  async getRepostsForPost(req, res) {
    await this.ensureDbForRequest(req, res);
    const { postId } = req.params;
    const userId = res.locals.userId; // userId from auth middleware

    try {
      const reposts = await this.postModel.getRepostsForPost(postId);

      // Check if current user has reposted this post
      const hasUserReposted = await this.postModel.hasUserReposted(
        userId,
        postId,
      );

      res.status(200).json({
        reposts,
        hasUserReposted,
        repostCount: reposts.length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get repost count for a specific post
  async getRepostCount(req, res) {
    await this.ensureDbForRequest(req, res);
    const { postId } = req.params;

    try {
      const repostCount = await this.postModel.getRepostCount(postId);
      res.status(200).json({ repostCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get post by ID
  async getPostById(req, res) {
    await this.ensureDbForRequest(req, res);
    const { postId } = req.params;

    try {
      const post = await this.postModel.getPostById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.status(200).json(post);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Report a post
  async reportPost(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const reporter_id = req.user?.user_id || res.locals.userId;
      const postIdParam = req.params.postId || req.params.id;
      const postId = parseInt(postIdParam, 10);
      const {
        category,
        reason,
        image_url,
        message_id,
      } = req.body || {};

      if (!reporter_id) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (!postId || !category || !reason || !image_url) {
        return res.status(400).json({ error: 'postId, category, reason, and image_url are required.' });
      }

      const normalizedCategory = String(category || '').trim().toLowerCase();
      const normalizedReason = sanitizeHtml(String(reason || ''), {
        allowedTags: [],
        allowedAttributes: {},
      }).trim();
      const normalizedImageUrl = String(image_url || '').trim() || null;
      const validCategories = [
        'spam',
        'harassment',
        'misleading information',
        'inappropriate content',
        'other',
      ];
      if (!validCategories.includes(normalizedCategory)) {
        return res.status(400).json({ error: `Invalid category. Must be: ${validCategories.join(', ')}` });
      }

      if (!normalizedReason) {
        return res.status(400).json({ error: 'Reason is required.' });
      }

      if (normalizedReason.length > 500) {
        return res.status(400).json({ error: 'Reason must be less than 500 characters.' });
      }

      const post = await this.postModel.getPostById(postId);
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      if (!post.user_id || post.fullname == null) {
        return res.status(404).json({ error: 'Post owner not found. Cannot create report for this post.' });
      }

      const reported_user_id = post.user_id;

      if (reporter_id === reported_user_id) {
        return res.status(400).json({ error: 'You cannot report your own post.' });
      }

      try {
        await this.postModel.reportPost(
          reporter_id,
          reported_user_id,
          postId,
          normalizedCategory,
          message_id || null,
          {
            reason: normalizedReason,
            image_url: normalizedImageUrl,
          },
        );
      } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'You have already reported this post.' });
        }
        if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
          return res.status(400).json({ error: 'Invalid report payload. User or post reference not found.' });
        }
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
          return res.status(500).json({ error: 'Reporting table is missing in database schema.' });
        }
        if (err && err.code === 'ER_BAD_NULL_ERROR') {
          return res.status(400).json({ error: 'Invalid report payload. Required fields are missing.' });
        }
        throw err;
      }

      const reportCount = await this.postModel.getPostReportCount(reported_user_id);

      let action = null;
      if (reportCount >= 4 && reportCount <= 5) {
        action = 'ban_recommended';
      } else if (reportCount === 3) {
        action = 'warning_issued';
      }

      if (req.io) {
        req.io.to('admin_room').emit('new_post_report', {
          reporter_id,
          reported_user_id,
          post_id: postId,
          category: normalizedCategory,
          reason: normalizedReason,
          image_url: normalizedImageUrl,
          message_id: message_id || null,
          report_count: reportCount,
          action,
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Post reported successfully.',
        data: {
          reporter_id,
          reported_user_id,
          post_id: postId,
          category: normalizedCategory,
          reason: normalizedReason,
          image_url: normalizedImageUrl,
          report_count: reportCount,
          action,
        }
      });
    } catch (err) {
      console.error('Error reporting post:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to report post',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  // Admin: list reported posts
  async getAllReportedPosts(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const rows = await this.postModel.getAllReportedPosts();
      res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to get reported posts' });
    }
  }

  // Admin: get reports for a specific post
  async getPostReports(req, res) {
    try {
      await this.ensureDbForRequest(req, res);
      const postId = parseInt(req.params.postId, 10);
      if (!postId) return res.status(400).json({ error: 'postId is required.' });
      const rows = await this.postModel.getPostReports(postId);
      res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to get post reports' });
    }
  }
}

export default PostController;
