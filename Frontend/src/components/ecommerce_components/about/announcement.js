import { getActiveSiteSlug, getSiteHeaders } from '../../../lib/site-context.js';
import { getRuntimeApiV1 } from '../../../lib/runtime-api.js';

const BASE_V1 = getRuntimeApiV1();
const API_KEY = import.meta.env.VITE_API_KEY || 'thread';

function resolveSiteSlug(data = {}) {
  const fromData = String(
    data?.siteSlug ||
    data?.site_slug ||
    data?.domain ||
    data?.community_type ||
    ''
  ).trim().toLowerCase();
  if (fromData) return fromData;

  const fromStorage = String(
    sessionStorage.getItem('site_slug') ||
    sessionStorage.getItem('community_type') ||
    ''
  ).trim().toLowerCase();
  if (fromStorage && fromStorage !== 'community-platform') return fromStorage;

  try {
    const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
    if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
      return String(parts[2]).trim().toLowerCase();
    }
    if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
      return String(parts[1]).trim().toLowerCase();
    }
  } catch (_) {}

  return String(getActiveSiteSlug() || '').trim().toLowerCase();
}

function buildThreadLink(siteSlug, threadId) {
  const slug = String(siteSlug || '').trim().toLowerCase();
  const id = Number(threadId);
  if (!slug || Number.isNaN(id) || id <= 0) return '#';
  return `/fanhub/community-platform/${encodeURIComponent(slug)}/thread/${id}`;
}

function renderAnnouncement(section, payload = {}) {
  const title = String(payload?.title || 'No pinned thread yet').trim();
  const venue = String(payload?.venue || '').trim();
  const date = String(payload?.date || '').trim();
  const threadLink = String(payload?.threadLink || '#').trim();
  const hasThread = threadLink !== '#';

  section.innerHTML = `
    <h2 class="ec-announcement-title">Announcements</h2>
    <div class="ec-announcement-card">
      <p class="ec-announcement-headline"><strong>${title}</strong></p>
      ${venue ? `<p class="ec-announcement-meta">Venue: ${venue}</p>` : ''}
      ${date ? `<p class="ec-announcement-meta">Date: ${date}</p>` : ''}
      <div class="ec-announcement-action">
        <a href="${threadLink}" class="ec-announcement-btn" ${hasThread ? 'data-link' : 'aria-disabled="true"'}>${hasThread ? 'See details' : 'No thread yet'}</a>
      </div>
    </div>
  `;
}

async function fetchThreads(siteSlug) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${BASE_V1}/bini/posts/threads?community=${encodeURIComponent(siteSlug)}`, {
      method: 'GET',
      headers: {
        apikey: API_KEY,
        ...getSiteHeaders(siteSlug),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const payload = await res.json().catch(() => []);
    return Array.isArray(payload) ? payload : [];
  } catch (_) {
    return [];
  }
}

export default function announcement(root, data = {}) {
  root.querySelectorAll('#announcements').forEach((node) => node.remove());

  const section = document.createElement('section');
  section.id = 'announcements';
  section.className = 'ec-announcement';
  root.appendChild(section);

  renderAnnouncement(section, {
    title: 'Loading announcement...',
    venue: '',
    date: '',
    threadLink: '#',
  });

  const siteSlug = resolveSiteSlug(data);
  if (!siteSlug) {
    renderAnnouncement(section, {
      title: 'No site selected for announcements',
      venue: '',
      date: '',
      threadLink: '#',
    });
    return;
  }

  fetchThreads(siteSlug).then((threads) => {
    const sorted = [...threads].sort((a, b) => {
      const pinA = Number(Boolean(a?.is_pinned ?? a?.isPinned));
      const pinB = Number(Boolean(b?.is_pinned ?? b?.isPinned));
      if (pinA !== pinB) return pinB - pinA;
      const aTime = new Date(a?.created_at || 0).getTime() || 0;
      const bTime = new Date(b?.created_at || 0).getTime() || 0;
      return bTime - aTime;
    });
    const pinned = sorted.find((thread) => Boolean(thread?.is_pinned ?? thread?.isPinned));
    const selected = pinned || sorted[0] || null;

    if (!selected) {
      renderAnnouncement(section, {
        title: 'No pinned thread yet',
        venue: 'Create and pin a thread from admin to show it here.',
        date: '',
        threadLink: '#',
      });
      return;
    }

    renderAnnouncement(section, {
      title: selected.title || 'Announcement',
      venue: selected.venue || '',
      date: selected.date || '',
      threadLink: buildThreadLink(siteSlug, selected.id),
    });
  });
}