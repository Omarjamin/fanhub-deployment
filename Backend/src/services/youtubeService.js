import axios from 'axios';

function getThumbnailUrl(thumbnails) {
  if (!thumbnails) return '';
  return thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
}

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  _extractVideoIdFromUrl(videoUrl = '') {
    const value = String(videoUrl || '').trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.hostname.includes('youtu.be')) {
        return url.pathname.replace('/', '').trim() || null;
      }
      if (url.hostname.includes('youtube.com')) {
        return url.searchParams.get('v') || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  _ensureApiKey() {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('YOUTUBE_API_KEY is not set in .env. Add it and restart the server.');
    }
  }

  _mapSearchItem(item) {
    if (!item?.id?.videoId || !item?.snippet) return null;
    return {
      videoId: item.id.videoId,
      title: item.snippet.title || 'Untitled',
      description: item.snippet.description || '',
      thumbnail: getThumbnailUrl(item.snippet.thumbnails),
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle || ''
    };
  }

  async getBINIVideos({ channelId = '', videoUrl = '' } = {}) {
    try {
      this._ensureApiKey();
      const normalizedChannelId = String(channelId || '').trim();
      const videoIdFromUrl = this._extractVideoIdFromUrl(videoUrl);

      if (videoIdFromUrl) {
        const detailsRes = await axios.get(`${this.baseUrl}/videos`, {
          params: {
            part: 'snippet',
            id: videoIdFromUrl,
            key: this.apiKey
          }
        });

        const seedVideo = detailsRes.data?.items?.[0];
        if (!seedVideo?.id || !seedVideo?.snippet) {
          throw new Error('Video not found from provided URL.');
        }

        const seedMapped = {
          videoId: seedVideo.id,
          title: seedVideo.snippet.title || 'Untitled',
          description: seedVideo.snippet.description || '',
          thumbnail: getThumbnailUrl(seedVideo.snippet.thumbnails),
          publishedAt: seedVideo.snippet.publishedAt,
          channelTitle: seedVideo.snippet.channelTitle || ''
        };

        const seedChannelId = seedVideo.snippet.channelId;
        if (!seedChannelId) return [seedMapped];

        const response = await axios.get(`${this.baseUrl}/search`, {
          params: {
            part: 'snippet',
            channelId: seedChannelId,
            maxResults: 10,
            order: 'date',
            type: 'video',
            key: this.apiKey
          }
        });

        const related = (response.data?.items || [])
          .map(this._mapSearchItem)
          .filter(Boolean)
          .filter((video) => video.videoId !== seedMapped.videoId);

        return [seedMapped, ...related].slice(0, 10);
      }

      if (normalizedChannelId) {
        const response = await axios.get(`${this.baseUrl}/search`, {
          params: {
            part: 'snippet',
            channelId: normalizedChannelId,
            maxResults: 10,
            order: 'date',
            type: 'video',
            key: this.apiKey
          }
        });

        const items = response.data?.items || [];
        return items.map(this._mapSearchItem).filter(Boolean);
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: 'BINI official music video',
          maxResults: 10,
          order: 'date',
          type: 'video',
          key: this.apiKey
        }
      });

      const items = response.data?.items || [];
      return items.map(this._mapSearchItem).filter(Boolean);
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.error('YouTube API Error:', msg);
      throw new Error(msg || 'Failed to fetch videos from YouTube API');
    }
  }

  async getPopularBINIVideos() {
    try {
      this._ensureApiKey();

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: 'BINI official music video',
          maxResults: 5,
          order: 'viewCount',
          type: 'video',
          key: this.apiKey
        }
      });

      const items = response.data?.items || [];
      return items.map(this._mapSearchItem).filter(Boolean);
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.error('YouTube API Error:', msg);
      throw new Error(msg || 'Failed to fetch popular videos from YouTube API');
    }
  }

  async getVideoDetails(videoId) {
    try {
      this._ensureApiKey();
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoId,
          key: this.apiKey
        }
      });

      const video = response.data?.items?.[0];
      if (!video) {
        throw new Error('Video not found');
      }

      return {
        videoId: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        thumbnail: getThumbnailUrl(video.snippet?.thumbnails),
        publishedAt: video.snippet?.publishedAt,
        channelTitle: video.snippet?.channelTitle,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        duration: video.contentDetails?.duration
      };
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.error('YouTube API Error:', msg);
      throw new Error(msg || 'Failed to fetch video details from YouTube API');
    }
  }
}

export default new YouTubeService();
