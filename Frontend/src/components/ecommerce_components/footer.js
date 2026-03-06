import '../../styles/ecommerce_styles/footer.css';
import { showToast } from '../../utils/toast.js';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1').trim().replace(/\/$/, '');
const API_KEY = (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread';

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
  const siteLabel = siteSlug ? siteSlug.replace(/-/g, ' ') : 'Juan';

  root.innerHTML = `
    <footer class="ec-footer">
      <div class="ec-footer-grid">
        <section class="ec-footer-brand">
          <h4>Contact Admin</h4>
          <p>Send your concern, feedback, or report directly to the admin team for this community site.</p>
          <p class="ec-footer-brand-note">Current site: <strong>${siteLabel}</strong></p>
        </section>
        <section class="ec-footer-form-wrap">
          <form class="ec-footer-form" id="ecFooterContactForm">
            <div class="ec-footer-field">
              <label for="ecFooterName">Your Name</label>
              <input id="ecFooterName" name="name" type="text" placeholder="Enter your name" required />
            </div>
            <div class="ec-footer-field">
              <label for="ecFooterEmail">Email</label>
              <input id="ecFooterEmail" name="email" type="email" placeholder="Enter your email" />
            </div>
            <div class="ec-footer-field ec-footer-field-full">
              <label for="ecFooterMessage">Message</label>
              <textarea id="ecFooterMessage" name="message" rows="4" placeholder="Type your message for the admin" required></textarea>
            </div>
            <button type="submit" class="ec-footer-submit">Send Message</button>
          </form>
        </section>
      </div>
      <p class="ec-footer-copy">&copy; 2026 BINI Fanhub. Educational Purposes Only.</p>
    </footer>
  `;

  const form = root.querySelector('#ecFooterContactForm');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = String(form.querySelector('#ecFooterName')?.value || '').trim();
    const email = String(form.querySelector('#ecFooterEmail')?.value || '').trim();
    const message = String(form.querySelector('#ecFooterMessage')?.value || '').trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!name || !message) {
      showToast('Please provide your name and message.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      const response = await fetch(`${API_BASE}/admin/suggestions/public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: API_KEY,
        },
        body: JSON.stringify({
          community_name: siteSlug || 'general',
          suggestion_text: `Admin contact from ${name}${email ? ` (${email})` : ''}: ${message}`,
          contact_email: email || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }

      showToast('Your message has been sent to the admin.', 'success');
      form.reset();
    } catch (error) {
      showToast(error?.message || 'Failed to send your message.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }
  });
}
