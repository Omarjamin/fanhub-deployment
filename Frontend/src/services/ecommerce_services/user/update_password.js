import { api } from '../api.js';

function resolveSiteSlug() {
  const fromStorage = String(
    sessionStorage.getItem('site_slug') || localStorage.getItem('site_slug') || ''
  ).trim().toLowerCase();
  if (fromStorage) return fromStorage;

  const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
  if (parts[0] === 'fanhub' && parts[1]) return String(parts[1]).trim().toLowerCase();
  return '';
}

export async function updatePassword(email, otp, newPassword) {
  try {
    const siteSlug = resolveSiteSlug();
    const response = await api('/users/reset_password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        otp,
        newPassword,
        site_slug: siteSlug,
        domain: siteSlug,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.message || 'Failed to update password',
      };
    }

    return {
      success: true,
      message: data.message || 'Password has been updated successfully.',
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Network error',
    };
  }
}
