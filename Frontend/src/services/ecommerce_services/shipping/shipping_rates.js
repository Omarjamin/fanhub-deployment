import { api as apiUrl } from '../config.js';
import { authHeaders } from '../auth/auth.js';

export default async function ShippingRates(provinceName, totalWeightGrams = 0) {
    try {
        console.log('ShippingRates called with province:', provinceName);
        const url = `${apiUrl('/shipping/getShippingRates')}?province_name=${encodeURIComponent(provinceName)}&total_weight_grams=${encodeURIComponent(totalWeightGrams)}`;
        console.log('Final URL:', url);
        const res = await fetch(url, { method: 'GET', headers: authHeaders() });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error('API response not OK:', { status: res.status, data });
            return { success: false, message: data.message || 'Failed to fetch shipping rate', raw: data };
        }

        const fee = Number(data.shipping_fee ?? data.shippingFee ?? data.fee ?? data.price ?? 0) || 0;
        const region = String(data.region || '').trim();

        return { success: true, fee, region, raw: data };
    } catch (err) {
        return { success: false, message: err.message || 'Network error' };
    }
}
 
