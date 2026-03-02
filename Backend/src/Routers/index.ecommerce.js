import { Router } from 'express';

import accountrouter from './ecommerce_routes/user_route.js';
import shoprouter from './ecommerce_routes/shop_route.js';
import communitycontroller from './ecommerce_routes/community_route.js';
import cartrouter from './ecommerce_routes/cart_route.js';
import shippingrouter from './ecommerce_routes/shipping_route.js';
import orderrouter from './ecommerce_routes/order_route.js';
import discographyRouter from './ecommerce_routes/discography_route.js';
import eventsRouter from './ecommerce_routes/events_route.js';

const ecommerce_v1 = Router();


ecommerce_v1.use('/users', accountrouter); 
ecommerce_v1.use('/shop', shoprouter);
ecommerce_v1.use('/community', communitycontroller);
ecommerce_v1.use('/cart', cartrouter);
ecommerce_v1.use('/shipping', shippingrouter);
ecommerce_v1.use('/orders', orderrouter);
ecommerce_v1.use('/discography', discographyRouter);
ecommerce_v1.use('/events', eventsRouter);


export default ecommerce_v1;
