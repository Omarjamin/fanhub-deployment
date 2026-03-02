import { getActiveSiteSlug, getSiteHeaders, getSessionToken, setSessionToken, clearSessionToken } from '../../../lib/site-context.js';

export function getAuthToken(siteSlug = '') {
  return getSessionToken(siteSlug) || null;
}

export function setAuthToken(token, siteSlug = '') {
  setSessionToken(token, siteSlug);
}

export function setSiteSlug(siteSlug) {
  return getActiveSiteSlug(siteSlug);
}

export function removeAuthToken(siteSlug = '') {
  clearSessionToken(siteSlug);
}

export function authHeaders(siteSlug = '') {
  const activeSiteSlug = getActiveSiteSlug(siteSlug);
  const token = getAuthToken(activeSiteSlug);
  const headers = { apikey: 'thread', ...getSiteHeaders(activeSiteSlug) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default { getAuthToken, setAuthToken, setSiteSlug, removeAuthToken, authHeaders };
