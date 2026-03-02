import { Router } from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import ThreadController from '../../Controllers/v1/mainAdmin_controllers/Thread-Controller.js';

const router = Router();
const threadController = new ThreadController();

router.use(authenticate);
router.use(authorize);

router.get('/threads', threadController.getAllThreads.bind(threadController));
router.get('/threads/:id', threadController.getThreadById.bind(threadController));
router.post('/threads', threadController.createThread.bind(threadController));
router.put('/threads/:id', threadController.updateThread.bind(threadController));
router.delete('/threads/:id', threadController.deleteThread.bind(threadController));
router.get('/sites', threadController.getSites.bind(threadController));

export default router;
