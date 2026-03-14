import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import checkoutDraftController from '../../Controllers/v1/ecommerce_controllers/checkout_draft_controller.js';

const checkoutDraftRouter = express.Router();

checkoutDraftRouter.get('/', authenticate, checkoutDraftController.getDraft.bind(checkoutDraftController));
checkoutDraftRouter.put('/', authenticate, checkoutDraftController.saveDraft.bind(checkoutDraftController));
checkoutDraftRouter.delete('/', authenticate, checkoutDraftController.clearDraft.bind(checkoutDraftController));

export default checkoutDraftRouter;
