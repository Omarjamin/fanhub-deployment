import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import CommentController from '../../Controllers/v1/bini_controllers/comment_controller.js';

const commentsRouter = express.Router();
const commentController = new CommentController();

// Return comments authored by the authenticated user
commentsRouter.get('/user', authenticate, commentController.getByUser.bind(commentController));

// Get all comments for a specific post
commentsRouter.get('/:post_id', commentController.getAll.bind(commentController));

// Create a new comment for a post
commentsRouter.post('/create/:post_id', authenticate, commentController.create.bind(commentController));

// Create a reply to a comment
commentsRouter.post('/reply/:comment_id', authenticate, commentController.createReply.bind(commentController));

// Get replies for a specific comment
commentsRouter.get('/:comment_id/reply', commentController.getallreply.bind(commentController));

export default commentsRouter;
