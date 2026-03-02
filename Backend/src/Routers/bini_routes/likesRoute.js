import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import LikeController from '../../Controllers/v1/bini_controllers/LikeController.js';

const likesRouter = express.Router();
const likeController = new LikeController();

// Support alternate route shapes used by the frontend
likesRouter.get('/check/:likeType/:Id', authenticate, likeController.isLiked.bind(likeController));
likesRouter.post('/toggle/:likeType/:Id', authenticate, likeController.toggleLike.bind(likeController));
likesRouter.get('/count/:likeType/:Id', authenticate, likeController.getLikeCount.bind(likeController));
likesRouter.get('/users/:likeType/:Id', authenticate, likeController.getUsersWhoLiked.bind(likeController));

export default likesRouter;
