import express from 'express';
import DiscographyController from '../../Controllers/v1/ecommerce_controllers/discography_controller.js';

const discographyRouter = express.Router();
const discographyController = new DiscographyController();

// GET /v1/ecommerce/discography/albums
discographyRouter.get('/albums', discographyController.getAlbums.bind(discographyController));

// GET /v1/ecommerce/discography/albums/:album_id/tracks
discographyRouter.get('/albums/:album_id/tracks', discographyController.getTracksByAlbum.bind(discographyController));

export default discographyRouter;
