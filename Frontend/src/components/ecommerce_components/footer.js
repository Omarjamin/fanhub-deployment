import '../../styles/ecommerce_styles/footer.css';

export default function Footer(root, data = {}) {
  if (!root) return;

  root.innerHTML = `
    <footer class="ec-footer">
      <p class="ec-footer-link-row">
        <a href="/" class="ec-footer-link">💗FanHub</a>
      </p>
      <p class="ec-footer-copy">&copy; 2026 BINI Fanhub. Educational Purposes Only.</p>
    </footer>
  `;
}