// Fetch random posts from the API

import api from "../api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";

function getCommunityTypeFromPath() {
  try {
    const fromStorage = String(
      sessionStorage.getItem('community_type') || ''
    ).trim().toLowerCase();
    if (fromStorage && fromStorage !== 'community-platform') return fromStorage;

    const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
    // New shape: /fanhub/community-platform/:community/...
    if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
      return String(parts[2]).toLowerCase();
    }
    // Legacy shape: /fanhub/:community/...
    if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
      return String(parts[1]).toLowerCase();
    }

    // /bini/:community/... OR /bini/<page>
    if (parts[0] === 'bini') {
      if (!parts[1]) return 'bini';
      const candidate = String(parts[1]).toLowerCase();
      const reservedPages = new Set([
        'home', 'profile', 'others-profile', 'search', 'notifications', 'messages', 'message', 'threads', 'thread', 'login', 'signup'
      ]);
      return reservedPages.has(candidate) ? 'bini' : candidate;
    }
  } catch (_) {}
  return 'bini';
}

export async function fetchrandomposts(token, limit = 7, offset = 0, passedCommunityType = '') {
  try {
    const communityType =
      String(passedCommunityType || '').trim().toLowerCase() || getCommunityTypeFromPath();
    const activeSite = getActiveSiteSlug(communityType) || communityType || 'bini';
    setActiveSiteSlug(activeSite);
    const authToken = token || getSessionToken(activeSite);

    const response = await api.get(`/bini/posts/getrandomposts?limit=${limit}&offset=${offset}`, {
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        'x-community-type': communityType,
      },
    });
    const responseData = response.data || {};
    console.log('Response from API:', responseData);

    return responseData || []; // Adjust based on the actual structure returned by the API
  } catch (error) {
    console.error('Error in fetchrandomposts:', error);
    throw error;
  }
}



