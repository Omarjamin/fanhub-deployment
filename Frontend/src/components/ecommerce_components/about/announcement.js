import { getActiveSiteSlug, getSiteHeaders } from '../../../lib/site-context.js';
import { getRuntimeApiV1 } from '../../../lib/runtime-api.js';

const BASE_V1 = getRuntimeApiV1();
const API_KEY = import.meta.env.VITE_API_KEY || 'thread';
const PAGE_SIZE = 7;

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

function formatAnnouncementDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'No date';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function normalizeThreads(siteSlug, threads = []) {
  return threads.map((thread, index) => ({
    id: Number(thread?.id) || index + 1,
    title: String(thread?.title || 'Announcement').trim(),
    dateLabel: formatAnnouncementDate(thread?.date || thread?.created_at),
    sortTime: new Date(thread?.date || thread?.created_at || 0).getTime() || 0,
    sortMonth: (() => {
      const date = new Date(thread?.date || thread?.created_at || 0);
      return Number.isNaN(date.getTime()) ? 99 : date.getMonth();
    })(),
    sortYear: (() => {
      const date = new Date(thread?.date || thread?.created_at || 0);
      return Number.isNaN(date.getTime()) ? 9999 : date.getFullYear();
    })(),
    sortDay: (() => {
      const date = new Date(thread?.date || thread?.created_at || 0);
      return Number.isNaN(date.getTime()) ? 99 : date.getDate();
    })(),
    isPinned: Boolean(thread?.is_pinned ?? thread?.isPinned),
    threadLink: buildThreadLink(siteSlug, thread?.id),
  }));
}

function sortThreads(threads = []) {
  return [...threads].sort((a, b) => {
    const pinDiff = Number(b.isPinned) - Number(a.isPinned);
    if (pinDiff !== 0) return pinDiff;
    const monthDiff = a.sortMonth - b.sortMonth;
    if (monthDiff !== 0) return monthDiff;
    const yearDiff = a.sortYear - b.sortYear;
    if (yearDiff !== 0) return yearDiff;
    const dayDiff = a.sortDay - b.sortDay;
    if (dayDiff !== 0) return dayDiff;
    return a.sortTime - b.sortTime;
  });
}

function renderAnnouncementList(section, items, currentPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  section.innerHTML = `
    <div class="ec-announcement-shell">
      <h2 class="ec-announcement-title">Announcements</h2>
      <div class="ec-announcement-list">
        ${
          pageItems.length
            ? pageItems
                .map(
                  (item) => `
            <article class="ec-announcement-row">
              <div class="ec-announcement-date">${item.dateLabel}</div>
              <h3 class="ec-announcement-item-title">${item.title}</h3>
              <div class="ec-announcement-link-wrap">
                <a href="${item.threadLink}" class="ec-announcement-link">See Details</a>
              </div>
            </article>
          `,
                )
                .join('')
            : `
          <article class="ec-announcement-row ec-announcement-row-empty">
            <div class="ec-announcement-date">No date</div>
            <h3 class="ec-announcement-item-title">No announcements yet</h3>
            <div class="ec-announcement-link-wrap"></div>
          </article>
        `
        }
      </div>
      <div class="ec-announcement-pagination">
        <button type="button" class="ec-announcement-page-btn" data-page-dir="-1" aria-label="Previous page"${safePage === 0 ? ' disabled' : ''}>&lsaquo;</button>
        <span class="ec-announcement-page-label">Page ${safePage + 1} of ${totalPages}</span>
        <button type="button" class="ec-announcement-page-btn" data-page-dir="1" aria-label="Next page"${safePage >= totalPages - 1 ? ' disabled' : ''}>&rsaquo;</button>
      </div>
    </div>
  `;

  section.querySelectorAll('.ec-announcement-page-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.getAttribute('data-page-dir') || 0);
      renderAnnouncementList(section, items, safePage + delta);
    });
  });
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

  renderAnnouncementList(section, [], 0);

  const siteSlug = resolveSiteSlug(data);
  if (!siteSlug) {
    renderAnnouncementList(section, [], 0);
    return;
  }

  fetchThreads(siteSlug).then((threads) => {
    const items = sortThreads(normalizeThreads(siteSlug, threads));
    renderAnnouncementList(section, items, 0);
  });
}
