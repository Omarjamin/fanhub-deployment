import { Router } from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import MarketplaceController from '../../Controllers/v1/mainAdmin_controllers/Marketplace_controller.js';

const router = Router();
const controller = new MarketplaceController();

router.use(authenticate);
router.use(authorize);

router.get('/', controller.listProducts.bind(controller));
router.get('/collections', controller.listCollections.bind(controller));
router.post('/collections', controller.createCollection.bind(controller));
router.get('/categories', controller.listCategories.bind(controller));
router.post('/categories', controller.createCategory.bind(controller));
router.post('/', controller.createProduct.bind(controller));
router.put('/:productId', controller.updateProduct.bind(controller));
router.delete('/:productId', controller.deleteProduct.bind(controller));

export default router;
