import { Router } from 'express';

import revenueRouter from './bini_routes/Revenue_route.js';
import Generaterouter from './mainAdmin_routes/Generate-Route.js';
import marketplaceRouter from './mainAdmin_routes/Marketplace-Route.js';
import ordersRouter from './mainAdmin_routes/Orders-Route.js';
import adminAuthRouter from './mainAdmin_routes/Admin-Route.js';
import reportsRouter from './mainAdmin_routes/Report-Route.js';
import settingsRouter from './mainAdmin_routes/Settings-Route.js';
import threadRouter from './mainAdmin_routes/Thread-Route.js';
import discographyRouter from './mainAdmin_routes/Discography-Route.js';
import suggestionRouter from './mainAdmin_routes/Suggestion-Route.js';
const admin_v1 = Router();

admin_v1.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API is reachable',
    scope: 'public',
  });
});

admin_v1.use('/', adminAuthRouter);

admin_v1.use('/dashboard', revenueRouter); 
admin_v1.use('/generate', Generaterouter);
admin_v1.use('/marketplace', marketplaceRouter);
admin_v1.use('/orders', ordersRouter);
admin_v1.use('/reports', reportsRouter);
admin_v1.use('/settings', settingsRouter);
admin_v1.use('/discography', discographyRouter);
admin_v1.use('/suggestions', suggestionRouter);
admin_v1.use('/', threadRouter);

export default admin_v1;
