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
  return '';
}

function getCommunityCandidates(siteSlug = '') {
  const normalized = String(siteSlug || '').trim().toLowerCase();
  const candidates = new Set();

  if (!normalized) return [];

  candidates.add(normalized);

  const withoutWebsite = normalized.replace(/-website$/i, '');
  if (withoutWebsite) {
    candidates.add(withoutWebsite);
  }

  if (!normalized.endsWith('-website')) {
    candidates.add(`${normalized}-website`);
  }

  return Array.from(candidates).filter(Boolean);
}

export async function fetchrandomposts(token, limit = 7, offset = 0, passedCommunityType = '') {
  const communityType =
    String(passedCommunityType || '').trim().toLowerCase() || getCommunityTypeFromPath();
  const activeSite = getActiveSiteSlug(communityType) || communityType;

  if (!activeSite) {
    throw new Error('community/site scope is required');
  }

  setActiveSiteSlug(activeSite);
  const authToken = token || getSessionToken(activeSite);
  const siteCandidates = getCommunityCandidates(activeSite);
  let lastError = null;

  for (const candidate of siteCandidates) {
    try {
      const response = await api.get(`/bini/posts/getrandomposts?limit=${limit}&offset=${offset}`, {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'x-community-type': candidate,
          'x-site-slug': candidate,
        },
      });
      const responseData = response.data || {};
      console.log('Response from API:', responseData, 'site:', candidate);
      if (candidate !== activeSite) {
        setActiveSiteSlug(candidate);
      }
      return responseData || [];
    } catch (error) {
      lastError = error;
      console.warn('fetchrandomposts retry candidate failed:', candidate, error?.message || error);
    }
  }

  console.error('Error in fetchrandomposts:', lastError);
  throw lastError || new Error('Failed to fetch random posts');
}



