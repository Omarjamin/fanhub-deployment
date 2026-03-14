import '../../styles/bini_styles/community-footer.css';
import '../../styles/bini_styles/layout-template.css';

function resolveTemplateKey(data = {}) {
  const rawValue = String(
    data?.siteData?.template_key ||
    data?.siteData?.templateKey ||
    data?.siteData?.template ||
    data?.siteData?.template_name ||
    data?.template_key ||
    data?.templateKey ||
    data?.template ||
    data?.template_name ||
    'bini'
  )
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (!rawValue) return 'bini';
  if (rawValue.includes('modern')) return 'modern';
  if (rawValue.includes('minimal')) return 'minimal';
  return 'bini';
}

export default function Layout(root, data = {}) {
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const slugFromData = String(
    data?.siteSlug ||
    data?.siteData?.community_type ||
    data?.siteData?.site_slug ||
    data?.siteData?.domain ||
    data?.community_type ||
    data?.site_slug ||
    data?.domain ||
    ''
  ).trim().toLowerCase();
  const slugFromPath = pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]
    ? pathParts[2]
    : '';
  const slugFromStorage = String(
    sessionStorage.getItem('community_type') || localStorage.getItem('community_type') || ''
  ).trim().toLowerCase();
  const siteSlug = String(slugFromData || slugFromPath || slugFromStorage || '').trim().toLowerCase();
  let siteLabel = siteSlug ? siteSlug.replace(/-/g, ' ') : 'FanHub';

  try {
    const fromPayload = String(
      data?.siteData?.site_name ||
      data?.siteData?.name ||
      data?.siteData?.domain ||
      data?.site_name ||
      data?.name ||
      data?.domain ||
      ''
    ).trim();
    if (fromPayload) {
      siteLabel = fromPayload;
    }

    const rawSiteData =
      sessionStorage.getItem(`site_data:${siteSlug}`) ||
      sessionStorage.getItem('active_site_data') ||
      localStorage.getItem('active_site_data') ||
      '';
    const parsed = rawSiteData ? JSON.parse(rawSiteData) : null;
    const fromData = String(parsed?.site_name || parsed?.name || parsed?.domain || '').trim();
    if (fromData) siteLabel = fromData;
  } catch (_) {}

  const templateKey = resolveTemplateKey(data);
  root.classList.add('fh-template-root', `fh-template-root--${templateKey}`);
  root.dataset.templateKey = templateKey;

  const communityHomePath = siteSlug ? `/fanhub/community-platform/${encodeURIComponent(siteSlug)}` : '/bini';
  const communitySearchPath = siteSlug ? `${communityHomePath}/search` : '/bini/search';
  const communityNotifPath = siteSlug ? `${communityHomePath}/notifications` : '/bini/notifications';
  const communityProfilePath = siteSlug ? `${communityHomePath}/profile` : '/bini/profile';
  const shopPath = siteSlug ? `/fanhub/${encodeURIComponent(siteSlug)}/shop` : '/shop';
  const aboutPath = siteSlug ? `/fanhub/${encodeURIComponent(siteSlug)}#about` : '/#about';

  root.innerHTML = `
      <div id="container" class="fh-template-shell fh-template--${templateKey}" data-template-key="${templateKey}">
        <header id="head"></header>
        <navigation id="navigation"></navigation>
        <main id="main"></main>
        <footer id="footer">
          <div class="community-footer fh-footer">
            <div class="community-footer-center">
              <p>For educational purposes only.</p>
              <p>&copy; 2026 Bini FanHub. Educational Purposes Only.</p>
            </div>
          </div>
        </footer>
      </div>
    `

  return {
    header: document.getElementById('head'),
    navigation: document.getElementById('navigation'),
    main: document.getElementById('main'),
    footer: document.getElementById('footer'),
  }
}
