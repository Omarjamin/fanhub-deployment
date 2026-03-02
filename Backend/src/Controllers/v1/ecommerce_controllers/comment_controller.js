import Comment from '../../../Models/ecommerce_model/comment_model.js';

class CommentController {
  constructor() {
    this.comment = new Comment();
  }
  async init() {
    await this.comment.init();
  }
  // Create a new comment on a post
  async create(req, res) {
    await this.init();
    const { post_id } = req.params;
    const { content } = req.body || {};
    const user_id = res.locals.userId;

    try {
      const result = await this.comment.create(post_id, user_id, content, null);
      res.status(201).json({ message: 'Comment created successfully'});
    } catch (error) {
      console.error('<error> comment.create#', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  // Create a reply to an existing comment
  async createReply(req, res) {
    await this.init();
    const { content } = req.body; 
    const { userId } = res.locals; 
    const { comment_id } = req.params; // Parent comment ID
    try {
        // Validation: Check for missing input
        if (!content || !comment_id || !userId) {
            return res.status(400).json({ message: "Missing content, comment_id, or userId!" });
        }
        // Call model function
        const result = await this.comment.createReply(null, userId, content, comment_id);
        res.status(201).json({ message: 'Reply created successfully', result });
    } catch (error) {
        console.error('<error> comment.createReply', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
  // Get all comments for a specific post
  async getAll(req, res) {
    await this.init();
    const { post_id } = req.params;
    try {
      const comments = await this.comment.getAllByPost(post_id);
      res.status(200).json(comments);
    } catch (error) {
      console.error('<error> comment.getAllByPost', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  // Get all replies for a specific comment
  async getallreply(req, res) {
  await this.init();  
  const { comment_id } = req.params; 
  try {
    const comments = await this.comment.getRepliesByComment(comment_id);

    if (comments.length > 0) {
      return res.status(200).json({ replies: comments });
    } else {
      return res.status(404).json({ message: 'No replies found for this comment.' });
    }
  } catch (error) {
    console.error('<error> getallreply', error);  
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
  // Update an existing comment
  async update(req, res) {
    await this.init();
    const { comment_id } = req.params;
    const { content } = req.body || {};
    try {
      const result = await this.comment.update(comment_id, content);
      res.status(200).json({ message: 'Comment updated successfully', result });
    } catch (error) {
      console.error('<error> comment.update', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  // Delete a comment
  async delete(req, res) {
    await this.init();
    const { comment_id } = req.params;
    try {
      const result = await this.comment.delete(comment_id);
      res.status(200).json({ message: 'Comment deleted successfully', result });
    } catch (error) {
      console.error('<error> comment.delete', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
export default CommentController;
