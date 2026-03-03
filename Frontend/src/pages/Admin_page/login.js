import '../../styles/Admin_styles/login.css';

export default function AdminLoginPage() {
  const root = this.root;
  root.innerHTML = '';

  const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1/admin';

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
      const response = await fetch(`${ADMIN_API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
        // Expected public site path: /fanhub/:siteSlug
        const siteSlug =
          pathParts[0] === 'fanhub' && pathParts[1]
            ? String(pathParts[1]).trim().toLowerCase()
            : '';

        // Store token in sessionStorage (site/session scoped)
        sessionStorage.setItem('adminAuthToken', data.data.token);
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
        showError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Network error. Please try again.');
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


