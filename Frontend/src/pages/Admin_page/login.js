import '../../styles/Admin_styles/login.css';

export default function AdminLoginPage() {
  const root = this.root;
  root.innerHTML = '';

  const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1/admin';
  const API_KEY = (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread';

  function resolveAdminLoginUrls(rawBase) {
    const urls = [];
    const push = (value) => {
      const url = String(value || '').trim().replace(/\/+$/, '');
      if (!url) return;
      if (!urls.includes(url)) urls.push(url);
    };

    const trimmed = String(rawBase || '').trim().replace(/\/+$/, '');
    if (trimmed) {
      if (/\/admin\/login$/i.test(trimmed)) {
        push(trimmed);
      } else if (/\/admin$/i.test(trimmed)) {
        push(`${trimmed}/login`);
      } else if (/\/v1$/i.test(trimmed)) {
        push(`${trimmed}/admin/login`);
      } else if (/\/login$/i.test(trimmed)) {
        push(trimmed);
        push(`${trimmed.replace(/\/login$/i, '')}/admin/login`);
      } else {
        push(`${trimmed}/admin/login`);
        push(`${trimmed}/v1/admin/login`);
      }
    }

    const apiOrigin = String(window.__API_ORIGIN__ || '').trim().replace(/\/+$/, '');
    if (apiOrigin) {
      push(`${apiOrigin}/v1/admin/login`);
      push(`${apiOrigin}/admin/login`);
    }

    push('https://fanhub-deployment-production.up.railway.app/v1/admin/login');
    return urls;
  }

  function resolveAdminSiteSlug() {
    const normalize = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, '')
      .replace(/-website$/, '');

    const fromStorage = normalize(String(
      sessionStorage.getItem('admin_selected_site') ||
      sessionStorage.getItem('site_slug') ||
      sessionStorage.getItem('community_type') ||
      '',
    ));
    if (fromStorage && fromStorage !== 'all' && fromStorage !== 'community-platform') {
      return fromStorage;
    }

    const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
    if (pathParts[0] === 'fanhub' && pathParts[1] === 'community-platform' && pathParts[2]) {
      return normalize(pathParts[2]);
    }
    if (pathParts[0] === 'fanhub' && pathParts[1] && pathParts[1] !== 'community-platform') {
      return normalize(pathParts[1]);
    }
    return '';
  }

  async function safeParseResponse(response) {
    const raw = await response.text().catch(() => '');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (_) {
      return { message: raw };
    }
  }

  const loginContainer = document.createElement('div');
  loginContainer.className = 'admin-login-container';
  
  loginContainer.innerHTML = `
    <div class="admin-login-card">
      <div class="admin-login-header">
        <h1>Admin Panel</h1>
        <p>Please login to access the admin dashboard</p>
      </div>
      
      <form id="adminLoginForm" class="admin-login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required placeholder="admin@example.com">
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required placeholder="Enter your password">
        </div>
        
        <button type="submit" class="admin-login-btn" id="loginBtn">
          <span class="btn-text">Login</span>
          <span class="btn-loader hidden">Logging in...</span>
        </button>
      </form>
      
      <div id="loginError" class="login-error hidden"></div>
    </div>
  `;

  root.appendChild(loginContainer);

  // Handle form submission
  const form = root.querySelector('#adminLoginForm');
  const errorDiv = root.querySelector('#loginError');
  const loginBtn = root.querySelector('#loginBtn');
  const btnText = loginBtn.querySelector('.btn-text');
  const btnLoader = loginBtn.querySelector('.btn-loader');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = String(form.email.value || '').trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    // Show loading state
    loginBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    errorDiv.classList.add('hidden');

    try {
      const loginUrls = resolveAdminLoginUrls(ADMIN_API_BASE);
      const scopedSite = resolveAdminSiteSlug();
      let response = null;
      let data = {};
      let lastError = null;

      for (const loginUrl of loginUrls) {
        try {
          response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: API_KEY,
              ...(scopedSite ? { 'x-site-slug': scopedSite, 'x-community-type': scopedSite } : {}),
            },
            body: JSON.stringify({ email, password })
          });

          data = await safeParseResponse(response);
          if (response.status !== 404) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw (lastError || new Error('Unable to reach admin login endpoint.'));
      }

      if (response.ok && data.success) {
        const siteSlug = resolveAdminSiteSlug();

        // Store token in sessionStorage (site/session scoped)
        sessionStorage.setItem('adminAuthToken', data.data.token);
        if (siteSlug) {
          sessionStorage.setItem(`authToken:${siteSlug}`, data.data.token);
        }
        sessionStorage.setItem('adminUser', JSON.stringify({
          id: data.data.id,
          email: data.data.email
        }));
        if (siteSlug) {
          sessionStorage.setItem('admin_selected_site', siteSlug);
          sessionStorage.setItem('site_slug', siteSlug);
          sessionStorage.setItem('community_type', siteSlug);
        }

        // Redirect to admin dashboard
        window.location.href = '/subadmin/dashboard';
      } else {
        showError(data?.message || data?.error || `Login failed (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Login error:', error);
      showError(error?.message || 'Network error. Please try again.');
    } finally {
      // Hide loading state
      loginBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }
}



