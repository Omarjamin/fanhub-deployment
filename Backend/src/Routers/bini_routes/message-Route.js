import { Router } from 'express';
import MessageController from '../../Controllers/v1/bini_controllers/messageController.js';
import authenticate from '../../Middlewares/authentication.js'; 
import authorize from '../../Middlewares/authorization.js';
const Messagerouter = Router();
const messageController = new MessageController();
Messagerouter.use(authorize);

Messagerouter.get('/preview', authenticate, 
messageController.getMessagePreviews.bind(messageController));
Messagerouter.post('/', authenticate, messageController.sendMessage.bind(messageController)); 
Messagerouter.get('/:userId', authenticate, messageController.getMessages.bind(messageController)); 
Messagerouter.get('/preview', authenticate, messageController.getMessagePreviews.bind(messageController));
Messagerouter.patch('/read/:senderId', authenticate, messageController.markAsRead.bind(messageController));

// Reporting endpoints
Messagerouter.post('/report', authenticate, messageController.reportUser.bind(messageController));
Messagerouter.get('/reports/all', authenticate, messageController.getAllReportedUsers.bind(messageController));
Messagerouter.get('/reports/:userId', authenticate, messageController.getUserReports.bind(messageController));

export default Messagerouter;