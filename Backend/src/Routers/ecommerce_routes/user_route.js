import express from 'express';
import UserController from '../../Controllers/v1/ecommerce_controllers/user_controller.js';

import authenticate from '../../Middlewares/authentication.js';   
import authorize from '../../Middlewares/authorization.js';
import ShopController from '../../Controllers/v1/ecommerce_controllers/shop_controller.js';



const accountrouter = express.Router();
const usercontroller = new UserController();
const shopcontroller = new ShopController();



accountrouter.post('/register', usercontroller.createUser.bind(usercontroller));
accountrouter.post('/login', usercontroller.loginUser.bind(usercontroller));
accountrouter.post('/google-auth', usercontroller.googleAuth.bind(usercontroller));

accountrouter.post('/forgot_password', usercontroller.requestPasswordReset.bind(usercontroller));
accountrouter.post('/reset_password', usercontroller.resetPassword.bind(usercontroller));
accountrouter.post('/logout', usercontroller.logoutUser.bind(usercontroller));

accountrouter.get('/communities', usercontroller.getCommunities.bind(usercontroller));

// NOTE: collection routes are handled by the shop router mounted at /shop


accountrouter.use(authorize);

export default accountrouter;
