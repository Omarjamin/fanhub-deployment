import { registerUser } from '../../../services/ecommerce_services/auth/signup_user.js';
import { continueWithGoogle } from '../../../services/ecommerce_services/auth/signin.js';
import { getRecaptchaToken, renderGoogleButton, renderRecaptchaWidget, resetRecaptchaWidget, getIdentityProviderStatus } from '../../../services/ecommerce_services/auth/identity_providers.js';
import { showToast } from '../../../utils/toast.js';

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

export default function Signup(root, data = {}) {
  const siteSlug = resolveSiteSlug(data);
  const siteLabel = formatSiteLabel(data?.site_name || data?.site_title || siteSlug || 'BINI');
  const signinPath = siteSlug ? `/fanhub/${siteSlug}/signin` : '/signin';
  const homePath = siteSlug ? `/fanhub/${siteSlug}` : '/';
  let pendingRegistration = null;

  root.innerHTML = `
    <section class="auth-section auth-section-signup">
      <div class="auth-shell">
        <div class="auth-intro">
          <span class="auth-kicker">Create your profile</span>
          <h1 class="auth-heading">Join ${siteLabel}</h1>
          <p class="auth-copy">
            Create an account to shop faster, keep your order history organized, and unlock a smoother fan experience.
          </p>

          <div class="auth-highlights">
            <div class="auth-highlight">
              <strong>One account for everything</strong>
              <span>Use a single profile for shopping, tracking, and future account features.</span>
            </div>
            <div class="auth-highlight">
              <strong>Secure verification</strong>
              <span>Your signup is protected through email OTP and reCAPTCHA verification.</span>
            </div>
            <div class="auth-highlight">
              <strong>Ready for new drops</strong>
              <span>Get into the store faster once your account is already set up.</span>
            </div>
          </div>
        </div>

        <div class="auth-card">
          <div class="auth-card-head">
            <span class="auth-badge">Create Account</span>
            <h2 class="section-title">Set up your profile</h2>
            <p class="auth-subtitle">Create your ${siteLabel} account with your basic details below.</p>
          </div>

          <form class="auth-form1">
            <div class="auth-grid-two">
              <label class="auth-field">
                <span>First name</span>
                <input type="text" name="firstname" placeholder="First name" required>
              </label>

              <label class="auth-field">
                <span>Last name</span>
                <input type="text" name="lastname" placeholder="Last name" required>
              </label>
            </div>

            <label class="auth-field">
              <span>Email address</span>
              <input type="email" name="email" placeholder="you@example.com" required>
            </label>

            <label class="auth-field">
              <span>Password</span>
              <input type="password" name="password" placeholder="Create a password" required>
            </label>

            <button type="submit" class="mv-btn">Create Account</button>

            <div class="auth-divider"><span>Or continue with</span></div>

            <div class="google-auth-wrap">
              <div id="googleSignupBtn"></div>
            </div>
            <small id="googleSignupHint" class="auth-helper auth-helper-google"></small>

            <div class="auth-links">
              <p>Already have an account? <a href="${signinPath}">Login</a></p>
            </div>

            <div class="recaptcha-wrap">
              <div id="recaptchaSignupBox"></div>
            </div>
            <small id="recaptchaSignupHint" class="auth-helper auth-helper-recaptcha"></small>
          </form>
        </div>
      </div>
    </section>
  `;

  const form = root.querySelector('.auth-form1');
  const googleSignupBtn = root.querySelector('#googleSignupBtn');
  const googleSignupHint = root.querySelector('#googleSignupHint');
  const recaptchaSignupBox = root.querySelector('#recaptchaSignupBox');
  const recaptchaSignupHint = root.querySelector('#recaptchaSignupHint');
  const recaptchaWrap = root.querySelector('.recaptcha-wrap');
  const identityStatus = getIdentityProviderStatus();

  if (identityStatus.hasRecaptchaV2) {
    recaptchaSignupHint.textContent = 'Complete reCAPTCHA before creating your account.';
  } else if (identityStatus.hasRecaptchaV3) {
    recaptchaSignupHint.textContent = 'Protected by invisible reCAPTCHA.';
    recaptchaWrap?.classList.add('is-passive');
  } else {
    recaptchaSignupHint.textContent = 'reCAPTCHA is not available for this site yet.';
    recaptchaWrap?.classList.add('is-passive');
  }

  if (!identityStatus.hasGoogle) {
    googleSignupHint.textContent = 'Google sign-up is not available yet.';
    root.querySelector('.google-auth-wrap')?.classList.add('is-unavailable');
  }

  (async () => {
    try {
      await renderRecaptchaWidget(recaptchaSignupBox);
    } catch (err) {
      recaptchaSignupHint.textContent = `reCAPTCHA render error: ${err?.message || 'Unknown error'}`;
      console.error('Signup reCAPTCHA render error:', err);
    }

    try {
      await renderGoogleButton(googleSignupBtn, async (credential) => {
        if (!credential) {
          showToast('Google authentication failed.', 'error');
          return;
        }

        try {
          const recaptchaToken = await getRecaptchaToken('google_auth', recaptchaSignupBox);
          if (!recaptchaToken) {
            showToast('Please complete reCAPTCHA first.', 'error');
            return;
          }

          await continueWithGoogle({
            credential,
            site_slug: siteSlug,
            recaptcha_token: recaptchaToken,
          });
          sessionStorage.setItem('site_slug', siteSlug);
          window.location.href = homePath;
        } catch (err) {
          showToast('Google authentication failed: ' + (err.message || 'Unknown error'), 'error');
        }
      });
    } catch (err) {
      if (googleSignupHint) {
        googleSignupHint.textContent = identityStatus.hasGoogle ? 'Google sign-up is temporarily unavailable.' : googleSignupHint.textContent;
      }
      root.querySelector('.google-auth-wrap')?.classList.add('is-unavailable');
      console.error('Signup Google button render error:', err);
    }
  })();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!siteSlug) {
      showToast('Site slug is missing.', 'error');
      return;
    }

    const recaptchaToken = await getRecaptchaToken('register', recaptchaSignupBox).catch(() => '');
    if (!recaptchaToken) {
      showToast('Please complete reCAPTCHA before creating an account.', 'error');
      return;
    }

    const formData = new FormData(form);
    pendingRegistration = {
      username: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      email: String(formData.get('email') || ''),
      firstname: String(formData.get('firstname') || ''),
      lastname: String(formData.get('lastname') || ''),
      imageUrl: 'none',
      site_slug: siteSlug,
    };

    openOtpModal(
      pendingRegistration.email,
      `Sending verification code to ${pendingRegistration.email}...`
    );

    try {
      await registerUser({
        email: pendingRegistration.email,
        site_slug: pendingRegistration.site_slug,
        request_email_otp: true,
        recaptcha_token: recaptchaToken,
      });
      openOtpModal(
        pendingRegistration.email,
        `A verification code was sent to ${pendingRegistration.email}.`
      );
      showToast('Verification code sent to Gmail.', 'success');
    } catch (err) {
      console.error('Failed to register:', err);
      const message = String(err?.message || 'Unknown error');
      if (/verification code already sent|already sent/i.test(message)) {
        openOtpModal(
          pendingRegistration?.email || String(formData.get('email') || ''),
          message,
        );
        showToast(message, 'info');
      } else {
        openOtpModal(
          pendingRegistration?.email || String(formData.get('email') || ''),
          `Unable to send OTP right now: ${message}. You can retry using Resend OTP.`,
        );
        showToast('Registration failed: ' + message, 'error');
      }
    } finally {
      resetRecaptchaWidget(recaptchaSignupBox);
    }
  });

  function getOrCreateOtpModal() {
    let modal = document.getElementById('signupOtpModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'signupOtpModal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-card">
        <span class="auth-badge">Email Verification</span>
        <h3 class="auth-modal-title">Verify your Gmail</h3>
        <p id="signupOtpEmailHint" class="auth-modal-hint"></p>
        <input id="signupOtpInput" class="auth-modal-input" type="text" placeholder="Enter OTP code">
        <div class="auth-modal-actions">
          <button id="signupOtpVerifyBtn" class="mv-btn">Verify & Create</button>
          <button id="signupOtpResendBtn" class="mv-btn auth-secondary-btn">Resend OTP</button>
        </div>
        <button id="signupOtpCloseBtn" class="auth-modal-cancel" type="button">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function openOtpModal(email, hintText = '') {
    const modal = getOrCreateOtpModal();
    const emailHint = modal.querySelector('#signupOtpEmailHint');
    const otpInput = modal.querySelector('#signupOtpInput');
    const verifyBtn = modal.querySelector('#signupOtpVerifyBtn');
    const resendBtn = modal.querySelector('#signupOtpResendBtn');
    const closeBtn = modal.querySelector('#signupOtpCloseBtn');

    emailHint.textContent = hintText || `A verification code was sent to ${email}.`;
    otpInput.value = '';
    modal.style.display = 'flex';

    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };

    resendBtn.onclick = async () => {
      if (!pendingRegistration?.email) return;
      const token = await getRecaptchaToken('register_otp_resend', recaptchaSignupBox).catch(() => '');
      if (!token) {
        showToast('Please complete reCAPTCHA before resending OTP.', 'error');
        return;
      }
      try {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Sending...';
        await registerUser({
          email: pendingRegistration.email,
          site_slug: pendingRegistration.site_slug,
          request_email_otp: true,
          recaptcha_token: token,
        });
        showToast('OTP resent to Gmail.', 'success');
      } catch (err) {
        showToast('Failed to resend OTP: ' + (err.message || 'Unknown error'), 'error');
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
        resetRecaptchaWidget(recaptchaSignupBox);
      }
    };

    verifyBtn.onclick = async () => {
      const otp = String(otpInput.value || '').trim();
      if (!otp) {
        showToast('Please enter the OTP code.', 'error');
        return;
      }
      if (!pendingRegistration) {
        showToast('Registration data not found. Please fill up form again.', 'error');
        modal.style.display = 'none';
        return;
      }

      try {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        await registerUser({
          ...pendingRegistration,
          email_otp: otp,
        });
        showToast('Account created successfully!', 'success');
        sessionStorage.setItem('site_slug', siteSlug);
        modal.style.display = 'none';
        window.location.href = signinPath;
      } catch (err) {
        showToast('Verification failed: ' + (err.message || 'Unknown error'), 'error');
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Create';
        resetRecaptchaWidget(recaptchaSignupBox);
      }
    };
  }

  document.addEventListener('click', (e) => {
    const modal = document.getElementById('signupOtpModal');
    if (!modal) return;
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}
