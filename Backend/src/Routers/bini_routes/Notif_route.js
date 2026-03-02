import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import NotificationController from '../../Controllers/v1/bini_controllers/Notif_controller.js';

const notificationRouter = express.Router();
const notifroute = new NotificationController();

notificationRouter.use(authorize);

notificationRouter.post('/comment', authenticate, notifroute.notifyOnComment.bind(notifroute));
notificationRouter.post('/repost', authenticate, notifroute.notifyOnRepost.bind(notifroute));
notificationRouter.get('/mynotif', authenticate, notifroute.getUserNotifications.bind(notifroute));

export default notificationRouter;