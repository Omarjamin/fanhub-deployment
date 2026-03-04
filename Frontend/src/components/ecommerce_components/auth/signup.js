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

export default function Signup(root, data = {}) {
  const siteSlug = resolveSiteSlug(data);
  const signinPath = siteSlug ? `/fanhub/${siteSlug}/signin` : '/signin';
  const homePath = siteSlug ? `/fanhub/${siteSlug}` : '/';
  let pendingRegistration = null;

  root.innerHTML = `
    <section class="auth-section">
      <h2 class="section-title">Create Account</h2>

      <form class="auth-form1">
        <input type="text" name="firstname" placeholder="First Name" required>
        <input type="text" name="lastname" placeholder="Last Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit" class="mv-btn">Create Account</button>

        <div style="margin-top:14px; text-align:center; color:#777; letter-spacing:0.6px;">------or--------</div>

        <div class="google-auth-wrap">
          <div id="googleSignupBtn"></div>
        </div>
        <small id="googleSignupHint" style="display:block; text-align:center; margin-top:6px; color:#666;"></small>

        <p style="margin-top:14px;">Already have an account? <a href="${signinPath}">Login</a></p>

        <div class="recaptcha-wrap">
          <div id="recaptchaSignupBox"></div>
        </div>
        <small id="recaptchaSignupHint" style="display:block; text-align:center; margin-top:6px; color:#666;"></small>
      </form>
    </section>
  `;

  const form = root.querySelector('.auth-form1');
  const googleSignupBtn = root.querySelector('#googleSignupBtn');
  const googleSignupHint = root.querySelector('#googleSignupHint');
  const recaptchaSignupBox = root.querySelector('#recaptchaSignupBox');
  const recaptchaSignupHint = root.querySelector('#recaptchaSignupHint');
  const identityStatus = getIdentityProviderStatus();

  if (identityStatus.hasRecaptchaV2) {
    recaptchaSignupHint.textContent = 'Please complete reCAPTCHA before creating account.';
  } else if (identityStatus.hasRecaptchaV3) {
    recaptchaSignupHint.textContent = 'reCAPTCHA v3 enabled (invisible).';
  } else {
    recaptchaSignupHint.textContent = 'reCAPTCHA is not configured yet.';
  }

  if (!identityStatus.hasGoogle) {
    googleSignupHint.textContent = 'Google login is not configured yet.';
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
        googleSignupHint.textContent = '';
      }
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

    try {
      await registerUser({
        email: pendingRegistration.email,
        site_slug: pendingRegistration.site_slug,
        request_email_otp: true,
        recaptcha_token: recaptchaToken,
      });
      openOtpModal(pendingRegistration.email);
      showToast('Verification code sent to Gmail.', 'success');
    } catch (err) {
      console.error('Failed to register:', err);
      showToast('Registration failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      resetRecaptchaWidget(recaptchaSignupBox);
    }
  });

  function getOrCreateOtpModal() {
    let modal = document.getElementById('signupOtpModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'signupOtpModal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: none;
      align-items: center; justify-content: center; z-index: 9999;
    `;
    modal.innerHTML = `
      <div style="background:#fff; width:min(92vw,420px); border-radius:12px; padding:18px;">
        <h3 style="margin:0 0 6px;">Verify Gmail</h3>
        <p id="signupOtpEmailHint" style="margin:0 0 12px; color:#555; font-size:14px;"></p>
        <input id="signupOtpInput" type="text" placeholder="Enter OTP code" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button id="signupOtpVerifyBtn" class="mv-btn" style="flex:1;">Verify & Create</button>
          <button id="signupOtpResendBtn" class="mv-btn" style="flex:1;">Resend OTP</button>
        </div>
        <button id="signupOtpCloseBtn" style="margin-top:10px; width:100%; padding:10px; border:1px solid #ddd; background:#fff; border-radius:8px; cursor:pointer;">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function openOtpModal(email) {
    const modal = getOrCreateOtpModal();
    const emailHint = modal.querySelector('#signupOtpEmailHint');
    const otpInput = modal.querySelector('#signupOtpInput');
    const verifyBtn = modal.querySelector('#signupOtpVerifyBtn');
    const resendBtn = modal.querySelector('#signupOtpResendBtn');
    const closeBtn = modal.querySelector('#signupOtpCloseBtn');

    emailHint.textContent = `A verification code was sent to ${email}.`;
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
