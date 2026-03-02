import { api as apiUrl } from '../../../services/ecommerce_services/config.js';
import { getActiveSiteSlug, getSiteHeaders } from '../../../lib/site-context.js';

const DEFAULT_EVENTS = [];

function renderEvents(section, events) {
  const list = section.querySelector('.event-list');
  if (!list) return;

  const normalizeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return 'https://www.ticketnet.com.ph/';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  };

  const safeEvents = Array.isArray(events) ? events : [];
  if (!safeEvents.length) {
    list.innerHTML = `
      <div class="card event-empty-card">
        <h3>No events yet</h3>
        <p>Event posters for this site are not set yet.</p>
      </div>
    `;
    return;
  }
  list.innerHTML = safeEvents
    .map((event, index) => {
      const title = String(event?.title || `Event ${index + 1}`);
      const href = normalizeUrl(event?.href || 'https://www.ticketnet.com.ph/');
      const image = String(event?.image || '');
      return `
        <a class="card event-link-card" href="${href}" target="_blank" rel="noopener noreferrer">
          <img src="${image}" alt="${title}">
          <h3>${title}</h3>
        </a>
      `;
    })
    .join('');
}

function resolveEventSiteSlug(data = {}) {
  const fromData = String(
    data?.siteSlug ||
    data?.site_slug ||
    data?.domain ||
    data?.community_type ||
    ''
  ).trim().toLowerCase();
  if (fromData) return fromData;
  return String(getActiveSiteSlug() || '').trim().toLowerCase();
}

async function fetchEvents(data = {}) {
  try {
    const siteSlug = resolveEventSiteSlug(data);
    console.log('[events-ui] resolved site slug:', siteSlug, 'data:', data);
    if (!siteSlug) return [];
    const endpoint = apiUrl(`/events/posters?community=${encodeURIComponent(siteSlug)}`);
    console.log('[events-ui] fetch endpoint:', endpoint);
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: 'thread',
        ...getSiteHeaders(siteSlug),
      },
    });
    const payload = await res.json().catch(() => ({}));
    console.log('[events-ui] payload:', payload);
    if (!res.ok || !payload?.success) return [];
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    console.error('[events-ui] fetch error:', error);
    return [];
  }
}

export default function event_section(root, data = {}) {
  root.querySelectorAll('#events').forEach((node) => node.remove());

  const section = document.createElement('section');
  section.id = 'events';
  section.innerHTML = `
    <h2 class="section-title">Events</h2>
    <div class="event-list"></div>
  `;
  root.appendChild(section);

  const list = section.querySelector('.event-list');
  if (list) {
    list.innerHTML = `
      <div class="card event-empty-card">
        <h3>Loading events...</h3>
        <p>Please wait while events are loading.</p>
      </div>
    `;
  }

  fetchEvents(data).then((events) => {
    console.log('[events-ui] render events count:', Array.isArray(events) ? events.length : 0);
    renderEvents(section, events);
  });
}
