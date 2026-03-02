import express from 'express';
import ShippingRatesController from '../../Controllers/v1/ecommerce_controllers/shipping_rates_controller.js';

import authenticate from '../../Middlewares/authentication.js';   
import authorize from '../../Middlewares/authorization.js';

const shippingrouter = express.Router();
const shippingcontroller = new ShippingRatesController();

shippingrouter.get('/getShippingRates', authenticate, shippingcontroller.getShippingRates.bind(shippingcontroller));


export default shippingrouter;