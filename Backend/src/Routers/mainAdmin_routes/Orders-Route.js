import { Router } from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import OrdersController from '../../Controllers/v1/mainAdmin_controllers/Orders_controller.js';

const router = Router();
const controller = new OrdersController();

router.use(authenticate);
router.use(authorize);

router.get('/', controller.listOrders.bind(controller));
router.get('/with-items', controller.listOrdersWithItems.bind(controller));
router.patch('/:orderId/status', controller.updateOrderStatus.bind(controller));

export default router;

