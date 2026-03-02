import youtubeService from '../services/youtubeService.js';

const FALLBACK_VIDEOS = [
  {
    videoId: 'wufUX5P2Ds8',
    title: 'Cherry On Top',
    description: 'Fallback video while YouTube API is temporarily unavailable.',
    thumbnail: 'https://img.youtube.com/vi/wufUX5P2Ds8/hqdefault.jpg',
    publishedAt: null,
    channelTitle: 'BINI'
  },
  {
    videoId: 'hAt5x2fL8xA',
    title: 'Karera',
    description: 'Fallback video while YouTube API is temporarily unavailable.',
    thumbnail: 'https://img.youtube.com/vi/hAt5x2fL8xA/hqdefault.jpg',
    publishedAt: null,
    channelTitle: 'BINI'
  },
  {
    videoId: 'VXx2k9Q2w4Y',
    title: 'Pantropiko',
    description: 'Fallback video while YouTube API is temporarily unavailable.',
    thumbnail: 'https://img.youtube.com/vi/VXx2k9Q2w4Y/hqdefault.jpg',
    publishedAt: null,
    channelTitle: 'BINI'
  }
];

function isQuotaError(message = '') {
  const text = String(message).toLowerCase();
  return text.includes('quota') || text.includes('exceeded');
}

class YouTubeController {
  async getBINIVideos(req, res) {
    try {
      const { channelId = '', videoUrl = '' } = req.query || {};
      const videos = await youtubeService.getBINIVideos({ channelId, videoUrl });
      res.json({
        success: true,
        data: videos,
        message: 'BINI videos retrieved successfully'
      });
    } catch (error) {
      if (isQuotaError(error.message)) {
        return res.status(200).json({
          success: true,
          data: FALLBACK_VIDEOS,
          message: 'YouTube quota exceeded. Served fallback videos.'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  async getPopularBINIVideos(req, res) {
    try {
      const videos = await youtubeService.getPopularBINIVideos();
      res.json({
        success: true,
        data: videos,
        message: 'Popular BINI videos retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  async getVideoDetails(req, res) {
    try {
      const { videoId } = req.params;
      
      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: 'Video ID is required',
          data: null
        });
      }

      const videoDetails = await youtubeService.getVideoDetails(videoId);
      res.json({
        success: true,
        data: videoDetails,
        message: 'Video details retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  async getBannerVideos(req, res) {
    try {
      // Get 5 specific videos for the banner carousel
      const popularVideos = await youtubeService.getPopularBINIVideos();
      
      // Format for frontend banner carousel
      const bannerVideos = popularVideos.slice(0, 5).map((video, index) => ({
        id: index,
        videoId: video.videoId,
        title: YouTubeController.extractTitle(video.title),
        subtitle: 'Official Music Video',
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt
      }));

      res.json({
        success: true,
        data: bannerVideos,
        message: 'Banner videos retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  static extractTitle(title) {
    // Extract clean title from YouTube video title
    const cleanTitle = title.replace(/official music video|mv|official video/gi, '').trim();
    return cleanTitle || title;
  }
}

export default new YouTubeController();
