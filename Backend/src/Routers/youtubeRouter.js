import express from 'express';
import youtubeController from '../Controllers/youtubeController.js';

const router = express.Router();

// Get all BINI videos
router.get('/videos', youtubeController.getBINIVideos);

// Get popular BINI videos (for banner carousel)
router.get('/videos/popular', youtubeController.getPopularBINIVideos);

// Get banner videos (formatted for frontend)
router.get('/banner/videos', youtubeController.getBannerVideos);

// Get specific video details
router.get('/videos/:videoId', youtubeController.getVideoDetails);

export default router;
