import { Router } from 'express';

import userRouter from './bini_routes/user-route.js'; 
import postRouter from './bini_routes/PostRoute.js';
import searchRouter from './bini_routes/SearchRoute.js';
import cloudinaryRouter from './bini_routes/cloudinaryRoute.js'; 
import notificationRouter from './bini_routes/Notif_route.js';
import followRouter from './bini_routes/follow_routes.js';
import messageRouter from './bini_routes/message-Route.js';
import commentsRouter from './bini_routes/commentsRoute.js';
import likesRouter from './bini_routes/likesRoute.js';

const bini_v1 = Router();

bini_v1.use('/cloudinary', cloudinaryRouter); 
bini_v1.use('/users', userRouter); 
bini_v1.use('/posts', postRouter);
// Expose comments helper routes (e.g. /comments/user)
bini_v1.use('/comments', commentsRouter);
bini_v1.use('/notifications', notificationRouter);
bini_v1.use('/message', messageRouter); 


// Additional helpers
bini_v1.use('/likes', likesRouter);



bini_v1.use('/search', searchRouter);
bini_v1.use('/follow', followRouter);

export default bini_v1;
