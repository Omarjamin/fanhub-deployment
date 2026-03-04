import express from 'express';
import orderController from '../../Controllers/v1/ecommerce_controllers/order_controller.js';
import authenticate from '../../Middlewares/authentication.js';

const orderrouter = express.Router();

// Create order
orderrouter.post('/create', authenticate, orderController.createOrder.bind(orderController));

// Get orders for a user (query: user_id, community_id)
orderrouter.get('/', authenticate, orderController.getOrders.bind(orderController));

// Get orders for authenticated user (no params needed)
orderrouter.get('/user', authenticate, orderController.getOrders.bind(orderController));

// Get order by id
orderrouter.get('/:id', authenticate, orderController.getOrderById.bind(orderController));

// Cancel order
orderrouter.put('/:id/cancel', authenticate, orderController.cancelOrder.bind(orderController));
// Delete order
orderrouter.delete('/:id', authenticate, orderController.deleteOrder.bind(orderController));

export default orderrouter;
