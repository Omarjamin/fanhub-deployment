import express from express

import PaymentControllers from `../Controllers/v1/ecommerce_controllers/payment_controller.js`

import authenticate from '../../Middlewares/authentication.js';   
import authorize from '../../Middlewares/authorization.js';

const payment_router = express.Router();
const payment_controller = new PaymentControllers();


payment_router.get('/payment', authenticate, payment_controller. add_payment(payment_controller));

