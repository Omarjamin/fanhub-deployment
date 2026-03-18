import { api as apiUrl } from '../config.js';
import { authHeaders } from '../auth/auth.js';

export default async function ShippingRates(provinceName, totalWeightGrams = 0, options = {}) {
    try {
        const packageLengthCm = Number(options?.package_length_cm ?? options?.length_cm ?? options?.lengthCm ?? 0) || 0;
        const packageWidthCm = Number(options?.package_width_cm ?? options?.width_cm ?? options?.widthCm ?? 0) || 0;
        const packageHeightCm = Number(options?.package_height_cm ?? options?.height_cm ?? options?.heightCm ?? 0) || 0;

        const params = new URLSearchParams({
            province_name: String(provinceName || ''),
            total_weight_grams: String(Number(totalWeightGrams || 0) || 0),
        });

        if (packageLengthCm > 0) params.set('package_length_cm', String(packageLengthCm));
        if (packageWidthCm > 0) params.set('package_width_cm', String(packageWidthCm));
        if (packageHeightCm > 0) params.set('package_height_cm', String(packageHeightCm));

        const url = `${apiUrl('/shipping/getShippingRates')}?${params.toString()}`;
        const res = await fetch(url, { method: 'GET', headers: authHeaders() });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error('API response not OK:', { status: res.status, data });
            return { success: false, message: data.message || 'Failed to fetch shipping rate', raw: data };
        }

        const fee = Number(data.shipping_fee ?? data.shippingFee ?? data.fee ?? data.price ?? 0) || 0;
        const region = String(data.region || '').trim();
        const courier = String(data.courier ?? data.courier_name ?? '').trim();

        return { success: true, fee, region, courier, raw: data };
    } catch (err) {
        return { success: false, message: err.message || 'Network error' };
    }
}
 
