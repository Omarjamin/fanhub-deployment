// YouTube API Service for Frontend
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/v1/youtube';

class YouTubeAPIService {
  async getBannerVideos() {
    try {
      const response = await fetch(`${API_BASE_URL}/banner/videos`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(response.ok ? 'Invalid response from server' : `Server error: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch banner videos');
      }

      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      console.error('Error fetching banner videos:', error);
      throw error;
    }
  }

  async getAllBINIVideos() {
    try {
      const response = await fetch(`${API_BASE_URL}/videos`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);
      if (!data.success) throw new Error(data.message || 'Failed to fetch BINI videos');
      return data.data ?? [];
    } catch (error) {
      console.error('Error fetching BINI videos:', error);
      throw error;
    }
  }

  async getVideoDetails(videoId) {
    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);
      if (!data.success) throw new Error(data.message || 'Failed to fetch video details');
      return data.data;
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }

  // Helper method to get YouTube embed URL
  getEmbedURL(videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Helper method to get YouTube watch URL
  getWatchURL(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
}

export default new YouTubeAPIService();
