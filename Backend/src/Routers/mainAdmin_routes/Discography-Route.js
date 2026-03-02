import { Router } from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import DiscographyController from '../../Controllers/v1/mainAdmin_controllers/Discography-Controller.js';

const router = Router();
const controller = new DiscographyController();

router.use(authenticate);
router.use(authorize);

router.get('/', controller.list.bind(controller));
router.get('/communities/list', controller.getCommunities.bind(controller));
router.get('/debug/columns', controller.debugColumns.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));

export default router;
