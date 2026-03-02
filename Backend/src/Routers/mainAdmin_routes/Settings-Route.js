import express from 'express';
import SettingsController from '../../Controllers/v1/mainAdmin_controllers/Settings-Controller.js';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';

const router = express.Router();
const controller = new SettingsController();

router.get('/shipping-regions', authenticate, authorize, controller.getShippingRegions.bind(controller));
router.put('/shipping-regions', authenticate, authorize, controller.saveShippingRegions.bind(controller));
router.get('/event-posters', authenticate, authorize, controller.getEventPosters.bind(controller));
router.put('/event-posters', authenticate, authorize, controller.saveEventPosters.bind(controller));

export default router;
