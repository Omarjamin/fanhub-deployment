import express from 'express';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';
import SearchController from '../../Controllers/v1/bini_controllers/SearchController.js';

const searchRouter = express.Router();
const searchController = new SearchController();

searchRouter.use(authenticate);
searchRouter.use(authorize);

searchRouter.get('/users', searchController.searchUser.bind(searchController));
searchRouter.get('/posts', searchController.searchPosts.bind(searchController));
searchRouter.get('/hashtags', searchController.searchHashtagPosts.bind(searchController));

export default searchRouter;
