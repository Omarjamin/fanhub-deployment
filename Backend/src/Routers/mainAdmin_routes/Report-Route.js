import { Router } from 'express';
import ReportController from '../../Controllers/v1/mainAdmin_controllers/Report-Controller.js';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';

const router = Router();
const reportCtrl = new ReportController();

router.use(authenticate);
router.use(authorize);

router.get('/users/reported', reportCtrl.getReportedUsers.bind(reportCtrl));
router.get('/posts/reported', reportCtrl.getReportedPosts.bind(reportCtrl));
router.get('/users/:userId/reports', reportCtrl.getUserReports.bind(reportCtrl));
router.get('/posts/:postId/reports', reportCtrl.getPostReports.bind(reportCtrl));
router.post('/users/:userId/action', reportCtrl.takeUserAction.bind(reportCtrl));
router.post('/posts/:postId/action', reportCtrl.takePostAction.bind(reportCtrl));
router.get('/stats', reportCtrl.getReportStats.bind(reportCtrl));

export default router;

