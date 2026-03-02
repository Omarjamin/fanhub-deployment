import express from 'express';
import EventsController from '../../Controllers/v1/ecommerce_controllers/events_controller.js';

const eventsRouter = express.Router();
const eventsController = new EventsController();

eventsRouter.get('/posters', eventsController.getEventPosters.bind(eventsController));

export default eventsRouter;

