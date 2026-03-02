import express from 'express';
import FollowController from '../../Controllers/v1/bini_controllers/follow_controller.js';
import authenticate from '../../Middlewares/authentication.js';
import authorization from '../../Middlewares/authorization.js';

const follow_router = express.Router();
const followController = new FollowController();

follow_router.use(authorization);
follow_router.get('/suggested-followers', authenticate, followController.getSuggestedFollowers.bind(followController));
follow_router.get('/following', authenticate, followController.getFollowing.bind(followController));
follow_router.get('/followers', authenticate, followController.getFollowers.bind(followController));
follow_router.get('/chat-users', authenticate, followController.getChatUsers.bind(followController));

export default follow_router;
