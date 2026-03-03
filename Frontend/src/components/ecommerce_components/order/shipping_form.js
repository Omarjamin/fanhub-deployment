import Address_Api from '../../../services/ecommerce_services/address/api_address.js';
import ShippingRates from '../../../services/ecommerce_services/shipping/shipping_rates.js';

function resolveItemWeightGrams(item) {
    const explicitWeight = Number(item?.weight_g ?? item?.weightG ?? item?.weight_grams ?? item?.weight);
    if (Number.isFinite(explicitWeight) && explicitWeight >= 0) return explicitWeight;
    return 0;
}

function computeCheckoutWeightGrams() {
    try {
        const checkoutItems = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]');
        const items = Array.isArray(checkoutItems) ? checkoutItems : [];

        const computedFromItems = items.reduce((sum, item) => {
            const qty = Number(item?.quantity || 0);
            const weight = resolveItemWeightGrams(item);
            if (!Number.isFinite(qty) || qty <= 0) return sum;
            return sum + (weight * qty);
        }, 0);

        if (computedFromItems > 0) return computedFromItems;

        const summary = JSON.parse(sessionStorage.getItem('checkoutSummary') || '{}');
        const summaryWeight = Number(summary?.total_weight_grams);
        if (Number.isFinite(summaryWeight) && summaryWeight > 0) return summaryWeight;

        const storedWeight = Number(sessionStorage.getItem('checkoutWeightGrams') || 0);
        if (Number.isFinite(storedWeight) && storedWeight > 0) return storedWeight;

        return 0;
    } catch (_) {
        return 0;
    }
}

export default async function ShippingForm(root) {
    const formDiv = document.createElement('div');
    formDiv.className = 'form-container';
    formDiv.innerHTML = `
        <section id="shippingSection" class="checkout-section shipping-form">
            <h3>Shipping Address</h3>
            <form id="shippingForm">
                <div class="form-group">
                    <label for="street">Street Address</label>
                    <textarea id="street" name="street" rows="4" required></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="region">Region</label>
                        <select id="region" required>
                            <option value="">Select Region</option>
                        </select>
                    </div>

                    <div class="form-group" id="provinceGroup">
                        <label for="province">Province</label>
                        <select id="province" required disabled>
                            <option value="">Select Province</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City / Municipality</label>
                        <select id="city" required disabled>
                            <option value="">Select City/Municipality</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="barangay">Barangay</label>
                        <select id="barangay" required disabled>
                            <option value="">Select Barangay</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="zip">ZIP Code</label>
                        <input type="text" id="zip"  required>
                    </div>

                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="nextbtn" class="show">Next</button>
                    </div>
                </div>
            </form>
        </section>
    `;
    
    root.appendChild(formDiv);

    const api = new Address_Api();
    const state = {
        regionName: '',
        provinceName: '',
        cityName: ''
    };

    await loadRegions(api);
    setupEvents(api, state);
}

/* ================= LOADERS ================= */

async function loadRegions(api) {
    const regionSelect = document.getElementById('region');
    console.log('Loading regions...');
    
    try {
        const regions = await api.getRegions();
        console.log('Regions loaded:', regions);
        
        if (regions && regions.length > 0) {
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.code;
                option.textContent = region.name;
                regionSelect.appendChild(option);
            });
            console.log('Regions added to dropdown');
        } else {
            console.log('No regions found');
        }
    } catch (error) {
        console.error('Error loading regions:', error);
    }
}

async function loadProvinces(api, regionName) {
    const provinceSelect = document.getElementById('province');
    provinceSelect.innerHTML = '<option value="">Select Province</option>';

    try {
        const provinces = await api.getProvinces(regionName);
        console.log('Provinces loaded:', provinces);
        if (provinces && provinces.length > 0) {
            provinces.forEach(p => {
                const option = document.createElement('option');
                option.textContent = p.name;
                option.value = p.name;
                provinceSelect.appendChild(option);
            });
            console.log('Provinces added to dropdown');
        } else {
            console.log('No provinces found for region:', regionName);
        }
    } catch (error) {
        console.error('Error loading provinces:', error);
    }
}

async function loadCities(api, regionName, provinceName) {
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="">Select City/Municipality</option>';

    try {
        const cities = await api.getCities(regionName, provinceName);
        console.log('Cities loaded:', cities);
        if (cities && cities.length > 0) {
            cities.forEach(c => {
                const option = document.createElement('option');
                option.textContent = c.name;
                option.value = c.name;
                citySelect.appendChild(option);
            });
            console.log('Cities added to dropdown');
        } else {
            console.log('No cities found');
        }
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

async function loadBarangays(api, regionName, provinceName, cityName) {
    const barangaySelect = document.getElementById('barangay');
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

    const barangays = await api.getBarangays(regionName, provinceName, cityName);
    barangays.forEach(b => {
        const option = document.createElement('option');
        option.textContent = b.name;
        barangaySelect.appendChild(option);
    });
}


async function getBarangayswithNcr(cityname) {
    const barangaySelect = document.getElementById('barangay');
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

    const barangays = await api.getBarangayswithNcr(cityname);
    barangays.forEach(b => {
        const option = document.createElement('option');
        option.textContent = b.name;
        barangaySelect.appendChild(option);
    });
    
}

/* ================= EVENTS ================= */

function setupEvents(api, state) {
    console.log('Setting up events for shipping form');
    
    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
        const region = document.getElementById('region');
        const province = document.getElementById('province');
        const city = document.getElementById('city');
        const barangay = document.getElementById('barangay');
        const zip = document.getElementById('zip');
        const provinceGroup = document.getElementById('provinceGroup');

        console.log('Elements found:', { region: !!region, province: !!province, city: !!city, barangay: !!barangay });

        if (region) {
            region.addEventListener('change', async () => {
                state.regionName = region.options[region.selectedIndex].text;
                console.log('Region selected:', state.regionName);

                // RESET
                province.innerHTML = '<option value="">Select Province</option>';
                city.innerHTML = '<option value="">Select City/Municipality</option>';
                barangay.innerHTML = '<option value="">Select Barangay</option>';
                zip.value = '';

                province.disabled = true;
                city.disabled = true;
                barangay.disabled = true;

                // NCR CHECKw
                if (state.regionName.includes('NCR')) {
                    console.log('NCR detected, loading cities directly');
                    provinceGroup.style.display = 'none';
                    await loadCities(api, state.regionName, null);
                    city.disabled = false;
                } else {
                    console.log('Non-NCR region, loading provinces');
                    provinceGroup.style.display = 'block';
                    await loadProvinces(api, state.regionName);
                    province.disabled = false;
                }
            });
            console.log('Region event listener attached');
        }

        if (province) {
            province.addEventListener('change', async () => {
                state.provinceName = province.value;

                barangay.disabled = true;
                zip.value = '';

                await loadCities(api, state.regionName, state.provinceName);
                city.disabled = false;

                    if (state.provinceName) {
                        console.log('Fetching shipping fee for province:', state.provinceName);
                        const totalWeightGrams = computeCheckoutWeightGrams();
                        const res = await ShippingRates(state.provinceName, totalWeightGrams);
                    if (res.success) {
                        sessionStorage.setItem('shippingFee', (res.fee || 0).toString());
                        if (res.region) sessionStorage.setItem('shippingRegion', res.region);
                        sessionStorage.setItem('checkoutWeightGrams', String(totalWeightGrams || 0));
                        window.dispatchEvent(new Event('shippingFeeUpdated'));
                    } else {
                        console.error('ShippingRates error:', res.message || res.raw);
                        sessionStorage.removeItem('shippingFee');
                        sessionStorage.removeItem('shippingRegion');
                        window.dispatchEvent(new Event('shippingFeeUpdated'));
                    }
                } else {
                    sessionStorage.removeItem('shippingFee');
                    sessionStorage.removeItem('shippingRegion');
                    window.dispatchEvent(new Event('shippingFeeUpdated'));
                }
            });
        }

        if (city) {
            city.addEventListener('change', async () => {
                state.cityName = city.value;

                zip.value = '';
                
                // Pass regionName to API so it can check if NCR
                await loadBarangays(api, state.regionName, state.provinceName, state.cityName);
                barangay.disabled = false;

                const rateProvince = state.provinceName || state.cityName;
                if (rateProvince) {
                    const totalWeightGrams = computeCheckoutWeightGrams();
                    const res = await ShippingRates(rateProvince, totalWeightGrams);
                    if (res.success) {
                        sessionStorage.setItem('shippingFee', (res.fee || 0).toString());
                        if (res.region) sessionStorage.setItem('shippingRegion', res.region);
                        sessionStorage.setItem('checkoutWeightGrams', String(totalWeightGrams || 0));
                    } else {
                        sessionStorage.removeItem('shippingFee');
                        sessionStorage.removeItem('shippingRegion');
                    }
                    window.dispatchEvent(new Event('shippingFeeUpdated'));
                }
            });
        }

        // Next button handler
        const nextBtn = document.getElementById('nextbtn');
        if (nextBtn && !nextBtn.hasAttribute('data-shipping-handler')) {
            nextBtn.setAttribute('data-shipping-handler', 'true');
            nextBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Show loading state
                const origText = nextBtn.textContent;
                nextBtn.disabled = true;
                nextBtn.textContent = 'Validating...';
                
                try {
                    // Validate all required fields
                    let selector = '#shippingSection input, #shippingSection select, #shippingSection textarea';
                    if (!document.querySelector('#shippingSection')) {
                        selector = '.shipping-form input, .shipping-form select, .shipping-form textarea';
                    }

                    const inputs = document.querySelectorAll(selector);
                    const missingFields = [];
                    
                    for (let input of inputs) {
                        // Ignore disabled or hidden fields (province may be disabled for NCR)
                        if (input.disabled || input.style.display === 'none') continue;
                        const val = (input.value || '').toString().trim();
                        if (input.required && !val) {
                            const label = input.closest('.form-group')?.querySelector('label')?.textContent || input.id;
                            missingFields.push(label.replace(':', '').trim());
                            input.style.borderColor = '#ff3d8b';
                            input.addEventListener('input', function() {
                                this.style.borderColor = '';
                            }, { once: true });
                        }
                    }

                    if (missingFields.length > 0) {
                        alert(`Please fill in the following fields:\n${missingFields.join('\n')}`);
                        nextBtn.disabled = false;
                        nextBtn.textContent = origText;
                        return;
                    }

                    // Save shipping data
                    const data = {};
                    inputs.forEach(input => {
                        data[input.name || input.id] = input.value;
                    });
                    
                    const shippingData = {
                        street: document.getElementById('street')?.value || '',
                        region: document.getElementById('region')?.value || '',
                        regionText: document.getElementById('region')?.options[document.getElementById('region')?.selectedIndex]?.text || '',
                        province: document.getElementById('province')?.value || '',
                        provinceText: document.getElementById('province')?.options[document.getElementById('province')?.selectedIndex]?.text || '',
                        city: document.getElementById('city')?.value || '',
                        cityText: document.getElementById('city')?.options[document.getElementById('city')?.selectedIndex]?.text || '',
                        barangay: document.getElementById('barangay')?.value || '',
                        barangayText: document.getElementById('barangay')?.options[document.getElementById('barangay')?.selectedIndex]?.text || '',
                        zip: document.getElementById('zip')?.value || ''
                    };
                    
                    sessionStorage.setItem('shippingInfo', JSON.stringify(data));
                    sessionStorage.setItem('shippingData', JSON.stringify(shippingData));

                    // Move to next step
                    nextBtn.textContent = 'Processing...';
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    sessionStorage.setItem('checkoutStep', '2');
                    window.dispatchEvent(new Event('stepChanged'));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch (error) {
                    console.error('Error in shipping form:', error);
                    alert('An error occurred. Please try again.');
                    nextBtn.disabled = false;
                    nextBtn.textContent = origText;
                }
            });
        }
    }, 100);
}

