import { clearSessionToken, getActiveSiteSlug } from './site-context.js';
import { showToast } from '../utils/toast.js';

const NOTICE_KEY = 'account_suspension_notice_v1';

function buildLoginPath(siteSlug, platform = 'bini') {
  const slug = String(siteSlug || '').trim().toLowerCase();
  if (!slug) return '/';
  if (platform === 'ecommerce') return `/fanhub/${encodeURIComponent(slug)}/login`;
  return `/fanhub/community-platform/${encodeURIComponent(slug)}/login`;
}

function showSuspensionDialog(message) {
  return new Promise((resolve) => {
    const existing = document.getElementById('suspensionNoticeModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'suspensionNoticeModal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 11000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.5);
      padding: 16px;
    `;
    modal.innerHTML = `
      <div style="
        width: min(420px, 100%);
        background: #ffffff;
        border-radius: 12px;
        padding: 18px 16px 14px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.25);
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h3 style="margin:0 0 10px;color:#b91c1c;font-size:18px;">Account Suspended</h3>
        <p style="margin:0 0 14px;color:#1f2937;line-height:1.5;">${String(message || '')}</p>
        <div style="display:flex;justify-content:flex-end;">
          <button id="suspensionNoticeOkBtn" type="button" style="
            border:0;
            background:#2563eb;
            color:#fff;
            border-radius:8px;
            padding:8px 14px;
            font-weight:600;
            cursor:pointer;
          ">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const okBtn = modal.querySelector('#suspensionNoticeOkBtn');
    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      resolve();
    };

    okBtn?.addEventListener('click', close, { once: true });
  });
}

export function handleSuspensionNotice(payload = {}, options = {}) {
  const platform = String(options.platform || 'bini').trim().toLowerCase();
  const siteSlug = String(options.siteSlug || getActiveSiteSlug() || '').trim().toLowerCase();
  const until = payload?.suspension_until ? new Date(payload.suspension_until).toLocaleString() : '';
  const message = String(
    payload?.message ||
    payload?.error ||
    (until ? `Your account has been suspended until ${until}` : 'Your account has been suspended.')
  ).trim();

  try {
    const previous = String(sessionStorage.getItem(NOTICE_KEY) || '').trim();
    if (previous !== message) {
      showToast(message, 'error');
      sessionStorage.setItem(NOTICE_KEY, message);
    }
  } catch (_) {
    showToast(message, 'error');
  }

  clearSessionToken(siteSlug);

  const loginPath = buildLoginPath(siteSlug, platform === 'ecommerce' ? 'ecommerce' : 'bini');
  const delayMs = 1600;
  setTimeout(async () => {
    await showSuspensionDialog(message);
    if (window.location.pathname !== loginPath) {
      window.location.href = loginPath;
    }
  }, delayMs);
}

export default handleSuspensionNotice;
