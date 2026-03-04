import express from 'express';
import ShopController from '../../Controllers/v1/ecommerce_controllers/shop_controller.js';

import authorize from '../../Middlewares/authorization.js';

const shoprouter = express.Router();
const shopcontroller = new ShopController();

// Support both collection list and community-specific collections
shoprouter.get('/getCollections', shopcontroller.getCollections.bind(shopcontroller));
shoprouter.get('/getCollections/:community', shopcontroller.getCollections.bind(shopcontroller));

shoprouter.get('/getProductCollection/:collection_id', shopcontroller.getProductsByCollection.bind(shopcontroller));

// product detail + variants
shoprouter.get('/getProductDetails/:product_id', shopcontroller.getProductDetails.bind(shopcontroller));

shoprouter.use(authorize);

export default shoprouter;
