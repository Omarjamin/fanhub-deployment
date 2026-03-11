import '../../styles/ecommerce_styles/footer.css';

export default function Footer(root, data = {}) {
  if (!root) return;

  const siteLabel =
    data?.site_name ||
    data?.community_name ||
    data?.community_type ||
    data?.domain ||
    'FanHub';

  root.innerHTML = `
    <footer class="ec-footer">
      <div class="ec-footer-grid">
        <section class="ec-footer-brand">
          <h4>${siteLabel}</h4>
          <p class="ec-footer-brand-note">Community-powered fan space.</p>
        </section>
      </div>
      <p class="ec-footer-copy">&copy; 2026 ${siteLabel}. Educational purposes only.</p>
    </footer>
  `;
}
