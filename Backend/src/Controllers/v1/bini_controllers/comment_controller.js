import Comment from "../../../Models/bini_models/comment_model.js";
import { resolveSiteSlug } from "../../../utils/site-scope.js";

class CommentController {
  constructor() {
    this.comment = new Comment();
  }
  async init(req, res) {
    const communityType = resolveSiteSlug(req, res);
    if (!communityType) {
      const err = new Error("community_type is required");
      err.statusCode = 400;
      throw err;
    }
    await this.comment.ensureConnection(communityType);
  }
  // Create a new comment on a post
  async create(req, res) {
    try {
      await this.init(req, res);
      const { post_id } = req.params;
      const { content } = req.body || {};
      const user_id = res.locals.userId;
      const result = await this.comment.create(post_id, user_id, content, null);

      console.log(result);
      res.status(201).json({ message: "Comment created successfully" });

      // return res.json({success: true, message: `Inserted with id ${result[0].insertId}`})
    } catch (error) {
      console.error("<error> comment.create#", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
  async createReply(req, res) {
    try {
      await this.init(req, res);
      const { content } = req.body;
      const userId = res.locals.userId;
      const { comment_id } = req.params; // Parent comment ID
      console.log("[comment.createReply] incoming", {
        comment_id,
        userId,
        content,
      });
      // Validation: Check for missing input
      if (!content || !comment_id || !userId) {
        return res
          .status(400)
          .json({ message: "Missing content, comment_id, or userId!" });
      }
      // Model will fetch the parent comment's post_id automatically
      const result = await this.comment.createReply(
        null,
        userId,
        content,
        comment_id,
      );
      res.status(201).json({ message: "Reply created successfully", result });
    } catch (error) {
      console.error("<error> comment.createReply", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Internal server error", details: error.message });
    }
  }
  // Get all comments for a specific post
  async getAll(req, res) {
    try {
      await this.init(req, res);
      const { post_id } = req.params;
      const comments = await this.comment.getAllByPost(post_id);
      res.status(200).json(comments);
    } catch (error) {
      console.error("<error> comment.getAllByPost", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get comments made by the authenticated user
  async getByUser(req, res) {
    try {
      await this.init(req, res);
      const user_id = res.locals.userId;
      if (!user_id) return res.status(401).json({ message: "Unauthenticated" });
      const comments = await this.comment.getByUser(user_id);
      res.status(200).json(comments);
    } catch (error) {
      console.error("<error> comment.getByUser", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get comment count for a specific post
  async getCommentCount(req, res) {
    try {
      await this.init(req, res);
      const { post_id } = req.params;
      console.log("Fetching comment count for post_id:", post_id);
      const count = await this.comment.countByPost(post_id);
      res.status(200).json({ commentCount: count, count: count });
    } catch (error) {
      console.error("<error> comment.getCommentCount", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
  // Get all replies for a specific comment
  async getallreply(req, res) {
    try {
      await this.init(req, res);
      const { comment_id } = req.params;
      const comments = await this.comment.getRepliesByComment(comment_id);
      // Always return 200 with replies array (empty if no replies found)
      return res.status(200).json({ replies: comments || [] });
    } catch (error) {
      console.error("<error> getallreply", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      return res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  }
  // Update an existing comment
  async update(req, res) {
    try {
      await this.init(req, res);
      const { comment_id } = req.params;
      const { content } = req.body || {};
      const result = await this.comment.update(comment_id, content);
      res.status(200).json({ message: "Comment updated successfully", result });
    } catch (error) {
      console.error("<error> comment.update", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
  // Delete a comment
  async delete(req, res) {
    try {
      await this.init(req, res);
      const { comment_id } = req.params;
      const result = await this.comment.delete(comment_id);
      res.status(200).json({ message: "Comment deleted successfully", result });
    } catch (error) {
      console.error("<error> comment.delete", error);
      if (error?.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
export default CommentController;
