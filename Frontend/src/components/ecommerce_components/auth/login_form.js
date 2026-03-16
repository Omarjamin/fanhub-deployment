import { loginUser } from '../../../services/ecommerce_services/auth/signin.js';
import { continueWithGoogle } from '../../../services/ecommerce_services/auth/signin.js';
import { getAuthToken } from '../../../services/ecommerce_services/auth/auth.js';
import { getRecaptchaToken, renderGoogleButton, renderRecaptchaWidget, getIdentityProviderStatus } from '../../../services/ecommerce_services/auth/identity_providers.js';
import '../user/request_password_reset.js';
import { showAuthToast, showToast } from '../../../utils/toast.js';

function resolveSiteSlug(data = {}) {
  const fromData = data?.siteSlug || data?.site_slug || data?.siteData?.site_slug;
  if (fromData) return String(fromData).trim().toLowerCase();

  const parts = String(window.location.pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
    return String(parts[2]).trim().toLowerCase();
  }
  if (parts[0] === 'fanhub' && parts[1]) {
    return String(parts[1]).trim().toLowerCase();
  }
  return '';
}

function formatSiteLabel(value = '') {
  const text = String(value || '').trim();
  if (!text) return 'BINI';
  return text
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function LoginForm(root, data = {}) {
  const siteSlug = resolveSiteSlug(data);
  const siteLabel = formatSiteLabel(data?.site_name || data?.site_title || siteSlug || 'BINI');

  if (siteSlug) {
    sessionStorage.setItem('site_slug', siteSlug);
  }

  const homePath = siteSlug ? `/fanhub/${siteSlug}` : '/';
  const signupPath = siteSlug ? `/fanhub/${siteSlug}/signup` : '/signup';
  const postLoginRedirect = String(sessionStorage.getItem('postLoginRedirect') || '').trim();
  const redirectAfterLogin = postLoginRedirect || homePath;

  if (getAuthToken()) {
    window.location.href = homePath;
    return;
  }

  root.innerHTML = `
    <section class="auth-section auth-section-login">
      <div class="auth-shell">
        <div class="auth-card">
          <div class="auth-card-head">
            <span class="auth-badge">Sign In</span>
            <h2 class="section-title">Login to your account</h2>
            <p class="auth-subtitle">Use the email and password connected to your ${siteLabel} profile.</p>
          </div>

          <form class="auth-form1">
            <label class="auth-field">
              <span>Email address</span>
              <input type="email" name="email" placeholder="you@example.com" required>
            </label>

            <label class="auth-field">
              <span>Password</span>
              <input type="password" name="password" placeholder="Enter your password" required>
            </label>

            <button type="submit" class="mv-btn">Login</button>

            <div class="auth-divider"><span>Or continue with</span></div>

            <div class="google-auth-wrap">
              <div id="googleLoginBtn"></div>
            </div>
            <small id="googleLoginHint" class="auth-helper auth-helper-google"></small>

            <div class="auth-links">
              <p>Don't have an account? <a href="${signupPath}">Sign up</a></p>
              <p>Forgot your password? <a href="#" class="forgot-password-link">Reset it here</a></p>
            </div>

            <div class="recaptcha-wrap">
              <div id="recaptchaLoginBox"></div>
            </div>
            <small id="recaptchaLoginHint" class="auth-helper auth-helper-recaptcha"></small>
          </form>
        </div>
      </div>
    </section>
  `;

  const form = root.querySelector('.auth-form1');
  const forgotPasswordLink = root.querySelector('.forgot-password-link');
  const googleLoginBtn = root.querySelector('#googleLoginBtn');
  const googleLoginHint = root.querySelector('#googleLoginHint');
  const recaptchaLoginBox = root.querySelector('#recaptchaLoginBox');
  const recaptchaLoginHint = root.querySelector('#recaptchaLoginHint');
  const recaptchaWrap = root.querySelector('.recaptcha-wrap');
  const identityStatus = getIdentityProviderStatus();

  if (identityStatus.hasRecaptchaV2) {
    recaptchaLoginHint.textContent = 'Complete reCAPTCHA before signing in.';
  } else if (identityStatus.hasRecaptchaV3) {
    recaptchaLoginHint.textContent = 'Protected by invisible reCAPTCHA.';
    recaptchaWrap?.classList.add('is-passive');
  } else {
    recaptchaLoginHint.textContent = 'reCAPTCHA is not available for this site yet.';
    recaptchaWrap?.classList.add('is-passive');
  }

  if (!identityStatus.hasGoogle) {
    googleLoginHint.textContent = 'Google sign-in is not available yet.';
    root.querySelector('.google-auth-wrap')?.classList.add('is-unavailable');
  }

  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.showPasswordResetModal();
  });

  (async () => {
    try {
      await renderRecaptchaWidget(recaptchaLoginBox);
    } catch (err) {
      recaptchaLoginHint.textContent = `reCAPTCHA render error: ${err?.message || 'Unknown error'}`;
      console.error('Login reCAPTCHA render error:', err);
    }

    try {
      await renderGoogleButton(googleLoginBtn, async (credential) => {
        if (!credential) {
          showToast('Google login failed. Missing credential.', 'error');
          return;
        }

        try {
          const recaptchaToken = await getRecaptchaToken('google_auth', recaptchaLoginBox);
          if (!recaptchaToken) {
            showToast('Please complete reCAPTCHA first.', 'error');
            return;
          }

          const googleResult = await continueWithGoogle({
            credential,
            site_slug: siteSlug,
            recaptcha_token: recaptchaToken,
          });
          void googleResult;

          showToast('Google login successful!', 'success');
          setTimeout(() => {
            sessionStorage.removeItem('postLoginRedirect');
            window.location.href = redirectAfterLogin;
          }, 700);
        } catch (err) {
          showAuthToast(`Google login failed: ${err.message}`, 'error');
        }
      });
    } catch (err) {
      if (googleLoginHint) {
        googleLoginHint.textContent = identityStatus.hasGoogle ? 'Google sign-in is temporarily unavailable.' : googleLoginHint.textContent;
      }
      root.querySelector('.google-auth-wrap')?.classList.add('is-unavailable');
      console.error('Google button render error:', err);
    }
  })();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    const recaptchaToken = await getRecaptchaToken('login', recaptchaLoginBox).catch(() => '');
    if (!recaptchaToken) {
      showToast('Please complete reCAPTCHA before login.', 'error');
      return;
    }

    const payload = {
      email,
      password,
      site_slug: siteSlug,
      recaptcha_token: recaptchaToken,
    };

    try {
      await loginUser(payload);
      showToast('Login successful! Welcome back!', 'success');
      setTimeout(() => {
        sessionStorage.removeItem('postLoginRedirect');
        window.location.href = redirectAfterLogin;
      }, 1500);
    } catch (err) {
      console.error('Failed to login:', err);
      if (err?.code === 'ACCOUNT_TEMP_LOCKED') {
        showAuthToast(
          err?.message || 'Too many login attempts. Your account is temporarily locked. Please try again after 15 minutes.',
          'warning',
        );
        return;
      }
      showAuthToast('Login failed: ' + err.message, 'error');
    }
  });
}
