const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
const RECAPTCHA_V2_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY || '6Lcob3ssAAAAALav3iLyGBCw-I5nGpirGYMP57_T').trim();
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '272242058427-7c0i9t3c464u5j9nfq6oo0u64ap263b0.apps.googleusercontent.com').trim();

const scriptPromises = new Map();
const recaptchaWidgetIds = new WeakMap();

function loadExternalScript(src) {
  if (scriptPromises.has(src)) return scriptPromises.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = '1';
      resolve();
    });
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)));
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}

function getRecaptchaApi() {
  if (window.grecaptcha?.render) return window.grecaptcha;
  if (window.grecaptcha?.enterprise?.render) return window.grecaptcha.enterprise;
  return null;
}

async function waitForRecaptchaApi(timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const api = getRecaptchaApi();
    if (api) return api;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

export async function renderRecaptchaWidget(container) {
  if (!RECAPTCHA_V2_SITE_KEY || !container) return false;
  await loadExternalScript('https://www.google.com/recaptcha/api.js');

  const recaptchaApi = await waitForRecaptchaApi();
  if (!recaptchaApi || typeof recaptchaApi.render !== 'function') {
    throw new Error('reCAPTCHA widget is unavailable');
  }

  container.innerHTML = '';
  const widgetId = recaptchaApi.render(container, {
    sitekey: RECAPTCHA_V2_SITE_KEY,
  });
  if (widgetId === undefined || widgetId === null) {
    throw new Error('reCAPTCHA widget failed to render');
  }
  recaptchaWidgetIds.set(container, widgetId);
  return true;
}

function getRecaptchaWidgetToken(container) {
  if (!container) return '';
  const recaptchaApi = getRecaptchaApi();
  if (!recaptchaApi) return '';
  const widgetId = recaptchaWidgetIds.get(container);
  if (widgetId === undefined) return '';
  return String(recaptchaApi.getResponse(widgetId) || '').trim();
}

export function resetRecaptchaWidget(container) {
  if (!container) return;
  const recaptchaApi = getRecaptchaApi();
  if (!recaptchaApi || typeof recaptchaApi.reset !== 'function') return;
  const widgetId = recaptchaWidgetIds.get(container);
  if (widgetId === undefined) return;
  recaptchaApi.reset(widgetId);
}

export async function getRecaptchaToken(action = 'submit', container = null) {
  // Prefer visible v2 token when widget exists.
  if (RECAPTCHA_V2_SITE_KEY && container) {
    return getRecaptchaWidgetToken(container);
  }

  // Fallback to v3 invisible mode if configured.
  if (RECAPTCHA_SITE_KEY) {
    await loadExternalScript(`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`);

    if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
      throw new Error('reCAPTCHA is unavailable');
    }

    return new Promise((resolve, reject) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
          resolve(token || '');
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  return '';
}

export function getIdentityProviderStatus() {
  return {
    hasGoogle: Boolean(GOOGLE_CLIENT_ID),
    hasRecaptchaV3: Boolean(RECAPTCHA_SITE_KEY),
    hasRecaptchaV2: Boolean(RECAPTCHA_V2_SITE_KEY),
  };
}

export async function renderGoogleButton(container, onCredential) {
  if (!GOOGLE_CLIENT_ID || !container) return false;

  await loadExternalScript('https://accounts.google.com/gsi/client');

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services is unavailable');
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (typeof onCredential === 'function') {
        onCredential(response?.credential || '');
      }
    },
  });

  container.innerHTML = '';
  const formEl = container.closest('.auth-form1');
  const parentWidth = Number(container.parentElement?.clientWidth || 0);
  const formWidth = Number(formEl?.clientWidth || 0);
  const baseWidth = Math.max(parentWidth, formWidth ? formWidth - 28 : 0, container.clientWidth || 0);
  const computedWidth = Math.max(180, Math.min(280, baseWidth || 280));
  container.style.width = `${computedWidth}px`;
  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    shape: 'pill',
    theme: 'outline',
    text: 'continue_with',
    size: 'large',
    width: computedWidth,
  });
  return true;
}
