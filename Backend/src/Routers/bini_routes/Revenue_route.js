import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';

import RevenueController from '../../Controllers/v1/mainAdmin_controllers/Revenue_controller.js';
const revenueRouter = express.Router();

revenueRouter.use(authenticate);
revenueRouter.use(authorize);

revenueRouter.get('/community', RevenueController.getRevenueByCommunity.bind(RevenueController));
revenueRouter.get('/stats', RevenueController.getCommunityStats.bind(RevenueController));

export default revenueRouter;
