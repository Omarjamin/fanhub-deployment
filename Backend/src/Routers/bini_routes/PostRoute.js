import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import PostController from '../../Controllers/v1/bini_controllers/postcontroller.js';
import CommentController from '../../Controllers/v1/bini_controllers/comment_controller.js';
import LikeController from '../../Controllers/v1/bini_controllers/LikeController.js';
import ThreadController from '../../Controllers/v1/bini_controllers/threadController.js';

const postRouter = express.Router();
const postController = new PostController();
const commentController = new CommentController();
const likeController = new LikeController();
const threadController = new ThreadController();

postRouter.get('/threads', threadController.getThreads.bind(threadController));

postRouter.use(authenticate);
postRouter.use(authorize);


postRouter.post('/create', postController.createPost.bind(postController));

// Reporting endpoints for posts (handled by PostController)
postRouter.post('/:postId/report', postController.reportPost.bind(postController));
postRouter.post('/report/:postId', postController.reportPost.bind(postController));
postRouter.get('/reports/all', authenticate, postController.getAllReportedPosts.bind(postController));
postRouter.get('/reports/:postId', authenticate, postController.getPostReports.bind(postController));

// STATIC repost routes FIRST - must come before /:userId/repost and /:postId/repost
postRouter.get('/repost', postController.getrepost.bind(postController));  
postRouter.get('/repost/count/:postId', postController.getRepostCount.bind(postController));
postRouter.get('/mypost', postController.getUserPosts.bind(postController));
postRouter.get('/following', postController.getFollowingPosts.bind(postController));
postRouter.get('/getrandomposts', postController.randomPosts.bind(postController));

// NUMERIC param routes with static segments (/something/:id/something)
postRouter.get('/:postId/likes/count', likeController.getLikeCount.bind(likeController));
postRouter.get('/:postId/likes/check', likeController.isLiked.bind(likeController));
postRouter.get('/:postId/likes/users', likeController.getUsersWhoLiked.bind(likeController));
postRouter.post('/:postId/likes/toggle', likeController.toggleLike.bind(likeController));

postRouter.get('/:postId/repost', postController.getRepostsForPost.bind(postController));
postRouter.patch('/:postId/repost', postController.repostPost.bind(postController));

postRouter.get('/:post_id/comments', authenticate, commentController.getAll.bind(commentController));
postRouter.post('/:post_id/comments/create', authenticate, commentController.create.bind(commentController));

postRouter.get('/:comment_id/reply', authenticate, commentController.getallreply.bind(commentController));
postRouter.post('/:comment_id/reply', authenticate, commentController.createReply.bind(commentController));

// STATIC comment routes with static segments first
postRouter.get('/comments/count/:post_id', authenticate, commentController.getCommentCount.bind(commentController));
postRouter.get('/comments/user', authenticate, commentController.getByUser.bind(commentController));

// Simple :id routes next
postRouter.get('/:userId/posts', postController.getOtherUserPosts.bind(postController));
postRouter.get('/:userId/repost', postController.getothersreposts.bind(postController));
postRouter.delete('/:postId', postController.deletePost.bind(postController));
postRouter.patch('/:postId', postController.updatePost.bind(postController));
postRouter.patch('/:comment_id', authenticate, commentController.update.bind(commentController));
postRouter.delete('/:comment_id', authenticate, commentController.delete.bind(commentController));

// CATCH-ALL - MUST BE LAST
postRouter.get('/:postId', postController.getPostById.bind(postController));




export default postRouter;
