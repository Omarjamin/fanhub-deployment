import PostModel from '../../../Models/ecommerce_model/PostModels.js';
import sanitizeHtml from 'sanitize-html';

class PostController {
  constructor() {
    this.postModel = new PostModel();
  }
  // Regex Function ito yun pag hiwalay nang hashtag at plain text  
  extractHashtagsAndContent(content) {
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    console.log("Hashtags:", hashtags);

    const plainContent = content
      .replace(/#[a-zA-Z0-9_]+/g, '')
      .replace(/[.,]/g, '')
      .trim();

    return { hashtags, plainContent };
  }

  sanitizePostContent(content) {
    return sanitizeHtml(String(content || ''), {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  }

  // Create new post
  async createPost(req, res) {
    const { img_url } = req.body;
    const content = this.sanitizePostContent(req.body?.content);
    const user_id = res.locals.userId;

    if (!user_id || !content) {
      return res.status(400).json({ error: "user_id and content fields are required" });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: "Content must be less than 500 characters" });
    }

    try {
      // Extract hashtags and plain content
      const { hashtags, plainContent } = this.extractHashtagsAndContent(content);

      // Create new post
      const newPost = await this.postModel.createPost(user_id, plainContent, img_url || null, hashtags);
      res.status(201).json(newPost);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Get posts of another user
  async getOtherUserPosts(req, res) {
    const userId = req.params.userId; // Get the userId from the request parameters
    try {
      const posts = await this.postModel.getOtherUserPosts(userId);
      
      // Return empty array instead of 404 when no posts found
      if (!posts || posts.length === 0) {
        return res.status(200).json([]);
      }

      res.status(200).json(posts);
    }
    catch (err) {
      console.error('Error in getOtherUserPosts:', err);
      res.status(500).json({ error: err.message });
    }
  }
  // Delete post
  async deletePost(req, res) {
    try {
      const { postId } = req.params; 
      const userId = res.locals.userId; 
      const deletedRows = await this.postModel.deletePost(postId, userId);
      if (deletedRows === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
      console.error('Error in deletePost:', err);
      res.status(500).json({ error: err.message });
    }
  }
  // Update post
  async updatePost(req, res) {
    try {
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
      const updatedRows = await this.postModel.updatePost(postId, userId, updatedContent, updatedImgUrl);
      if (updatedRows === 0) {
        return res.status(404).json({ error: "Post not found or no changes made" });
      }

      res.status(200).json({ message: "Post updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Repost post
  async repostPost(req, res) {
    try {
      const { postId } = req.params; 
      const userId = res.locals.userId; 

      const post = await this.postModel.getPostById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      await this.postModel.repostPost(userId, postId); 
      res.status(201).json({ message: "Post reposted successfully.", post });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  // Get user posts
  async getUserPosts(req, res) {
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
    try {
      const posts = await this.postModel.getRandomPost(limit, offset); 
      res.status(200).json(posts);
    } catch (error) {
      console.error('Error in randomPosts controller:', error);
      res.status(500).json({ error: error.message });
    }
  }
  // Get posts of users the current user is following
  async getFollowingPosts(req, res) {
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
      const userId = req.params.userId;
      const reposts = await this.postModel.getReposts(userId); // Use getReposts, not getothersReposts
      res.json(reposts);
    } catch (error) {
      console.error('Error in getothersreposts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  // Get reposts of current user
  async getrepost(req, res) {
    const userId = res.locals.userId;

    try {
      const reposts = await this.postModel.getReposts(userId);
      if (!reposts || reposts.length === 0) {
        return res.status(404).json({ error: "No reposts found for this user" });
      }

      res.status(200).json(reposts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get post by ID
  async getPostById(req, res) {
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

}

export default PostController;
