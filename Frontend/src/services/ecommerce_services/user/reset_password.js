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

export async function requestPasswordReset(email) {
    try {
        const siteSlug = resolveSiteSlug();
        const response = await api('/users/forgot_password', {
            method: 'POST',
            body: JSON.stringify({
                email,
                site_slug: siteSlug,
                domain: siteSlug,
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to send reset link');
        }

        return {
            success: true,
            message: data?.message || 'OTP sent. Please check your email inbox.'
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred. Please try again later.'
        };
    }
}
