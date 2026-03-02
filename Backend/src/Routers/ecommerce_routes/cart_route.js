import express from 'express';
import cartController from '../../Controllers/v1/ecommerce_controllers/cart_controller.js';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';



const cartrouter = express.Router();

// GET cart items for a user in a community
cartrouter.get('/items', authenticate, cartController.getCart.bind(cartController));

// POST add item to cart
cartrouter.post('/add', authenticate, cartController.addItem.bind(cartController));

// PUT update item quantity
cartrouter.put('/update', authenticate, cartController.updateItem.bind(cartController));

// DELETE remove item from cart
cartrouter.delete('/remove', authenticate, cartController.removeItem.bind(cartController));


cartrouter.use(authorize);
export default cartrouter;
