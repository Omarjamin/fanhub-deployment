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

export default function LoginForm(root, data = {}) {
  const siteSlug = resolveSiteSlug(data);

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
    <section class="auth-section">
      <h2 class="section-title">Login to ${siteSlug || 'Site'}</h2>

      <form class="auth-form1">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit" class="mv-btn">Login</button>

        <div style="margin-top:14px; text-align:center; color:#777; letter-spacing:0.6px;">------or--------</div>

        <div class="google-auth-wrap">
          <div id="googleLoginBtn"></div>
        </div>
        <small id="googleLoginHint" style="display:block; text-align:center; margin-top:6px; color:#666;"></small>

        <p style="margin-top:14px;">Don't have an account? <a href="${signupPath}">Sign up</a></p>
        <p>Forgot Password? <a href="#" class="forgot-password-link">Click Here</a></p>

        <div class="recaptcha-wrap">
          <div id="recaptchaLoginBox"></div>
        </div>
        <small id="recaptchaLoginHint" style="display:block; text-align:center; margin-top:6px; color:#666;"></small>
      </form>
    </section>
  `;

  const form = root.querySelector('.auth-form1');
  const forgotPasswordLink = root.querySelector('.forgot-password-link');
  const googleLoginBtn = root.querySelector('#googleLoginBtn');
  const googleLoginHint = root.querySelector('#googleLoginHint');
  const recaptchaLoginBox = root.querySelector('#recaptchaLoginBox');
  const recaptchaLoginHint = root.querySelector('#recaptchaLoginHint');
  const identityStatus = getIdentityProviderStatus();

  if (identityStatus.hasRecaptchaV2) {
    recaptchaLoginHint.textContent = 'Please complete reCAPTCHA before login.';
  } else if (identityStatus.hasRecaptchaV3) {
    recaptchaLoginHint.textContent = 'reCAPTCHA v3 enabled (invisible).';
  } else {
    recaptchaLoginHint.textContent = `reCAPTCHA is not configured yet. (v2=${identityStatus.hasRecaptchaV2}, v3=${identityStatus.hasRecaptchaV3})`;
  }

  if (!identityStatus.hasGoogle) {
    googleLoginHint.textContent = `Google login is not configured yet. (hasGoogle=${identityStatus.hasGoogle})`;
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
        googleLoginHint.textContent = '';
      }
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
