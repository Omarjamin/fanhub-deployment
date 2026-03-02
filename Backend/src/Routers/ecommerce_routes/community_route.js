import express from 'express';
import CommunityController from '../../Controllers/v1/ecommerce_controllers/community_controller.js';
import authenticate from '../../Middlewares/authentication.js';

const communityrouter = express.Router();
const communitycontroller = new CommunityController();


communityrouter.get('/enterBini', authenticate, communitycontroller.enterBini.bind(communitycontroller));

export default communityrouter;