import '../../styles/ecommerce_styles/footer.css';

export default function Footer(root, data = {}) {
  if (!root) return;

  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const fromPath = pathParts[0] === 'fanhub'
    ? (pathParts[1] === 'community-platform' ? pathParts[2] : pathParts[1])
    : '';
  const fromStorage = String(
    sessionStorage.getItem('community_type') || localStorage.getItem('community_type') || ''
  ).trim().toLowerCase();
  const siteSlug = String(data?.community_type || fromPath || fromStorage || '').trim().toLowerCase();

  const homePath = siteSlug ? `/fanhub/${siteSlug}` : '/';
  const shopPath = siteSlug ? `/fanhub/${siteSlug}/shop` : '/shop';
  const cartPath = siteSlug ? `/fanhub/${siteSlug}/cart` : '/cart';
  const orderHistoryPath = siteSlug ? `/fanhub/${siteSlug}/order-history` : '/order-history';
  const communityPath = siteSlug ? `/fanhub/community-platform/${siteSlug}` : '/fanhub/community-platform';

  root.innerHTML = `
    <footer class="ec-footer">
      <div class="ec-footer-grid">
        <section>
          <h4>Pages</h4>
          <a href="${homePath}">Home</a>
          <a href="${homePath}#about">About</a>
          <a href="${homePath}#announcements">Announcement</a>
        </section>
        <section>
          <h4>Shop</h4>
          <a href="${shopPath}">Shop</a>
          <a href="${cartPath}">Cart</a>
          <a href="${orderHistoryPath}">Order History</a>
        </section>
        <section>
          <h4>Community</h4>
          <a href="${communityPath}">Community Platform</a>
        </section>
        <section>
          <h4>About</h4>
          <p>This project is for educational purposes.</p>
        </section>
      </div>
      <p class="ec-footer-copy">&copy; 2026 BINI Fanhub. Educational Purposes Only.</p>
    </footer>
  `;
}
