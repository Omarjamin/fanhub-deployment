import Address_Api from '../../../services/ecommerce_services/address/api_address.js';
import ShippingRates from '../../../services/ecommerce_services/shipping/shipping_rates.js';
import {
    calculateCheckoutSummary,
    fetchCheckoutDraft,
    getCachedCheckoutDraft,
    saveCheckoutDraft,
    setCheckoutDraftStep,
} from '../../../services/ecommerce_services/checkout/checkout_draft.js';

function getAddressElements() {
    return {
        street: document.getElementById('street'),
        region: document.getElementById('region'),
        province: document.getElementById('province'),
        city: document.getElementById('city'),
        barangay: document.getElementById('barangay'),
        zip: document.getElementById('zip'),
        provinceGroup: document.getElementById('provinceGroup'),
        nextBtn: document.getElementById('nextbtn'),
    };
}

function selectOption(select, candidates = []) {
    if (!select) return null;

    const normalizedCandidates = candidates
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);

    if (!normalizedCandidates.length) return null;

    const option = Array.from(select.options).find((entry) => {
        const optionValue = String(entry.value || '').trim().toLowerCase();
        const optionLabel = String(entry.textContent || '').trim().toLowerCase();
        return normalizedCandidates.includes(optionValue) || normalizedCandidates.includes(optionLabel);
    });

    if (!option) return null;
    select.value = option.value;
    return option;
}

function resetZipField(zipInput, placeholder = 'Auto-filled after selecting a city') {
    if (!zipInput) return;
    zipInput.value = '';
    zipInput.placeholder = placeholder;
    zipInput.readOnly = true;
}

function buildShippingDataFromForm() {
    const { street, region, province, city, barangay, zip } = getAddressElements();

    return {
        street: street?.value || '',
        region: region?.value || '',
        regionText: region?.options?.[region.selectedIndex]?.text || '',
        province: province?.value || '',
        provinceText: province?.options?.[province.selectedIndex]?.text || '',
        city: city?.value || '',
        cityText: city?.options?.[city.selectedIndex]?.text || '',
        barangay: barangay?.value || '',
        barangayText: barangay?.options?.[barangay.selectedIndex]?.text || '',
        zip: zip?.value || '',
    };
}

function getCheckoutWeightGrams() {
    const draft = getCachedCheckoutDraft();
    const summaryWeight = Number(draft?.summary_data?.total_weight_grams ?? 0);
    const storedWeight = Number(draft?.checkout_weight_grams ?? 0);
    return Math.max(0, Math.round(summaryWeight || storedWeight || 0));
}

function buildSummaryPatch(shippingFee = null, checkoutWeightGrams = 0, summaryOverrides = {}) {
    const draft = getCachedCheckoutDraft();
    const summary = {
        ...(draft.summary_data || {}),
        ...calculateCheckoutSummary(draft.checkout_items || [], shippingFee ?? 0),
        ...(summaryOverrides || {}),
    };
    summary.total_weight_grams = Math.max(0, Math.round(checkoutWeightGrams || summary.total_weight_grams || 0));
    return summary;
}

async function syncDraftFromForm(overrides = {}) {
    const patch = {
        shipping_address: buildShippingDataFromForm(),
        ...overrides,
    };
    return saveCheckoutDraft(patch);
}

async function clearShippingRate() {
    const checkoutWeightGrams = getCheckoutWeightGrams();
    return syncDraftFromForm({
        shipping_fee: null,
        shipping_region: '',
        checkout_weight_grams: checkoutWeightGrams,
        summary_data: buildSummaryPatch(null, checkoutWeightGrams, {
            shipping_courier: '',
            shipping_source: '',
            shipping_region: '',
        }),
    });
}

async function updateShippingRate(locationLabel = '') {
    const location = String(locationLabel || '').trim();
    if (!location) {
        await clearShippingRate();
        return;
    }

    const checkoutWeightGrams = getCheckoutWeightGrams();
    const baseSummary = buildSummaryPatch(null, checkoutWeightGrams);
    const result = await ShippingRates(location, checkoutWeightGrams, {
        package_length_cm: baseSummary.package_length_cm,
        package_width_cm: baseSummary.package_width_cm,
        package_height_cm: baseSummary.package_height_cm,
    });

    if (!result.success) {
        console.error('ShippingRates error:', result.message || result.raw);
        await clearShippingRate();
        return;
    }

    const nextSummary = buildSummaryPatch(Number(result.fee || 0), checkoutWeightGrams, {
        shipping_courier: String(result.courier || '').trim(),
        shipping_source: String(result.source || '').trim(),
        shipping_region: String(result.region || '').trim(),
    });
    await syncDraftFromForm({
        shipping_fee: Number(result.fee || 0),
        shipping_region: String(result.region || '').trim(),
        checkout_weight_grams: checkoutWeightGrams,
        summary_data: nextSummary,
    });
}

async function loadRegions(api) {
    const { region } = getAddressElements();
    if (!region) return;

    const regions = await api.getRegions();
    (regions || []).forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.code;
        option.textContent = entry.name;
        region.appendChild(option);
    });
}

async function loadProvinces(api, regionName = '') {
    const { province } = getAddressElements();
    if (!province) return;

    province.innerHTML = '<option value="">Select Province</option>';
    const provinces = await api.getProvinces(regionName);

    (provinces || []).forEach((entry) => {
        const option = document.createElement('option');
        option.textContent = entry.name;
        option.value = entry.name;
        option.dataset.code = String(entry.code || entry.id || '');
        province.appendChild(option);
    });
}

async function loadCities(api, regionName = '', provinceName = '') {
    const { city } = getAddressElements();
    if (!city) return;

    city.innerHTML = '<option value="">Select City/Municipality</option>';
    const cities = await api.getCities(regionName, provinceName);

    (cities || []).forEach((entry) => {
        const option = document.createElement('option');
        option.textContent = entry.name;
        option.value = entry.name;
        option.dataset.code = String(entry.code || entry.id || '');
        option.dataset.type = String(entry.type || '');
        city.appendChild(option);
    });
}

async function loadBarangays(api, regionName = '', provinceName = '', cityName = '') {
    const { barangay } = getAddressElements();
    if (!barangay) return;

    barangay.innerHTML = '<option value="">Select Barangay</option>';
    const barangays = await api.getBarangays(regionName, provinceName, cityName);

    (barangays || []).forEach((entry) => {
        const option = document.createElement('option');
        option.textContent = entry.name;
        option.value = entry.name;
        barangay.appendChild(option);
    });
}

async function autoFillZipCode(api, state) {
    const { city, zip } = getAddressElements();
    if (!city || !zip) return '';

    const selectedOption = city.options[city.selectedIndex];
    resetZipField(zip, 'Loading ZIP code...');

    try {
        const detectedZip = await api.getZipCode({
            name: city.value,
            code: selectedOption?.dataset?.code || '',
            type: selectedOption?.dataset?.type || '',
            regionCode: state.regionCode || '',
            provinceCode: state.provinceCode || '',
        });

        if (String(detectedZip || '').trim()) {
            zip.value = String(detectedZip).trim();
            zip.placeholder = 'ZIP code detected';
            zip.readOnly = true;
            return zip.value;
        }
    } catch (error) {
        console.error('Error auto-filling ZIP code:', error);
    }

    zip.placeholder = 'ZIP not found for this city';
    zip.readOnly = true;
    return '';
}

async function hydrateShippingForm(api, state) {
    let draft = getCachedCheckoutDraft();
    if (!draft.checkout_items?.length && !draft.shipping_address) {
        try {
            draft = await fetchCheckoutDraft();
        } catch (_) {
            draft = getCachedCheckoutDraft();
        }
    }

    const address = draft.shipping_address;
    if (!address) return;

    const { street, region, province, city, barangay, zip, provinceGroup } = getAddressElements();
    if (street) street.value = address.street || '';
    if (zip) {
        zip.value = address.zip || '';
        zip.placeholder = zip.value ? 'ZIP code saved' : 'Auto-filled after selecting a city';
        zip.readOnly = true;
    }

    const regionOption = selectOption(region, [address.region, address.regionText]);
    if (!regionOption) return;

    state.regionCode = region.value;
    state.regionName = regionOption.textContent;
    const isNcr = state.regionName.includes('NCR');

    if (provinceGroup) {
        provinceGroup.style.display = isNcr ? 'none' : 'block';
    }

    if (isNcr) {
        if (province) {
            province.innerHTML = '<option value="">Select Province</option>';
            province.disabled = true;
        }
        await loadCities(api, state.regionName, '');
        if (city) city.disabled = false;
    } else {
        await loadProvinces(api, state.regionName);
        if (province) {
            province.disabled = false;
            const provinceOption = selectOption(province, [address.province, address.provinceText]);
            state.provinceCode = provinceOption?.dataset?.code || '';
            state.provinceName = province?.value || '';
        }
        await loadCities(api, state.regionName, state.provinceName);
        if (city) city.disabled = false;
    }

    const cityOption = selectOption(city, [address.city, address.cityText]);
    state.cityName = cityOption?.value || address.city || '';

    if (state.cityName) {
        await loadBarangays(api, state.regionName, state.provinceName, state.cityName);
        if (barangay) barangay.disabled = false;
        const barangayOption = selectOption(barangay, [address.barangay, address.barangayText]);
        if (!barangayOption && barangay && address.barangay) {
            const option = document.createElement('option');
            option.value = address.barangay;
            option.textContent = address.barangayText || address.barangay;
            barangay.appendChild(option);
            barangay.value = option.value;
        }
    }
}

function setupEvents(api, state) {
    const { street, region, province, city, barangay, zip, provinceGroup, nextBtn } = getAddressElements();
    if (!region || !province || !city || !barangay || !zip || !provinceGroup || !nextBtn) return;

    const savePartialAddress = () => {
        syncDraftFromForm().catch((error) => {
            console.error('Failed to save shipping draft:', error);
        });
    };

    if (street && !street.hasAttribute('data-draft-handler')) {
        street.setAttribute('data-draft-handler', 'true');
        street.addEventListener('blur', savePartialAddress);
    }

    if (zip && !zip.hasAttribute('data-draft-handler')) {
        zip.setAttribute('data-draft-handler', 'true');
        zip.addEventListener('blur', savePartialAddress);
    }

    if (region && !region.hasAttribute('data-shipping-handler')) {
        region.setAttribute('data-shipping-handler', 'true');
        region.addEventListener('change', async () => {
            state.regionCode = region.value;
            state.regionName = region.options[region.selectedIndex]?.text || '';
            state.provinceCode = '';
            state.provinceName = '';
            state.cityName = '';

            province.innerHTML = '<option value="">Select Province</option>';
            city.innerHTML = '<option value="">Select City/Municipality</option>';
            barangay.innerHTML = '<option value="">Select Barangay</option>';
            province.disabled = true;
            city.disabled = true;
            barangay.disabled = true;
            resetZipField(zip);

            if (state.regionName.includes('NCR')) {
                provinceGroup.style.display = 'none';
                await loadCities(api, state.regionName, '');
                city.disabled = false;
            } else if (state.regionName) {
                provinceGroup.style.display = 'block';
                await loadProvinces(api, state.regionName);
                province.disabled = false;
            } else {
                provinceGroup.style.display = 'block';
            }

            try {
                await clearShippingRate();
            } catch (error) {
                console.error('Failed to clear shipping rate draft:', error);
            }
        });
    }

    if (province && !province.hasAttribute('data-shipping-handler')) {
        province.setAttribute('data-shipping-handler', 'true');
        province.addEventListener('change', async () => {
            state.provinceCode = province.options[province.selectedIndex]?.dataset?.code || '';
            state.provinceName = province.value;
            state.cityName = '';

            city.innerHTML = '<option value="">Select City/Municipality</option>';
            barangay.innerHTML = '<option value="">Select Barangay</option>';
            city.disabled = true;
            barangay.disabled = true;
            resetZipField(zip);

            if (!state.provinceName) {
                try {
                    await clearShippingRate();
                } catch (error) {
                    console.error('Failed to clear shipping rate draft:', error);
                }
                return;
            }

            await loadCities(api, state.regionName, state.provinceName);
            city.disabled = false;
            try {
                await updateShippingRate(state.provinceName);
            } catch (error) {
                console.error('Failed to update shipping rate draft:', error);
            }
        });
    }

    if (city && !city.hasAttribute('data-shipping-handler')) {
        city.setAttribute('data-shipping-handler', 'true');
        city.addEventListener('change', async () => {
            state.cityName = city.value;
            barangay.innerHTML = '<option value="">Select Barangay</option>';
            barangay.disabled = true;
            resetZipField(zip);

            if (!state.cityName) {
                try {
                    await clearShippingRate();
                } catch (error) {
                    console.error('Failed to clear shipping rate draft:', error);
                }
                return;
            }

            await Promise.all([
                loadBarangays(api, state.regionName, state.provinceName, state.cityName),
                autoFillZipCode(api, state),
            ]);

            barangay.disabled = false;
            try {
                await updateShippingRate(state.provinceName || state.cityName);
            } catch (error) {
                console.error('Failed to update shipping rate draft:', error);
            }
        });
    }

    if (barangay && !barangay.hasAttribute('data-draft-handler')) {
        barangay.setAttribute('data-draft-handler', 'true');
        barangay.addEventListener('change', savePartialAddress);
    }

    if (nextBtn && !nextBtn.hasAttribute('data-shipping-handler')) {
        nextBtn.setAttribute('data-shipping-handler', 'true');
        nextBtn.addEventListener('click', async (event) => {
            event.preventDefault();

            const originalText = nextBtn.textContent;
            nextBtn.disabled = true;
            nextBtn.textContent = 'Validating...';

            try {
                const inputs = document.querySelectorAll('#shippingSection input, #shippingSection select, #shippingSection textarea');
                const missingFields = [];

                inputs.forEach((input) => {
                    if (input.disabled || input.style.display === 'none') return;
                    const value = String(input.value || '').trim();
                    if (input.required && !value) {
                        const label = input.closest('.form-group')?.querySelector('label')?.textContent || input.id;
                        missingFields.push(label.replace(':', '').trim());
                        input.style.borderColor = '#ff3d8b';
                        input.addEventListener('input', function resetBorder() {
                            this.style.borderColor = '';
                        }, { once: true });
                    }
                });

                if (missingFields.length > 0) {
                    alert(`Please fill in the following fields:\n${missingFields.join('\n')}`);
                    nextBtn.disabled = false;
                    nextBtn.textContent = originalText;
                    return;
                }

                const shippingData = buildShippingDataFromForm();
                const checkoutWeightGrams = getCheckoutWeightGrams();
                const draft = getCachedCheckoutDraft();
                const shippingFee = draft.shipping_fee;

                await saveCheckoutDraft({
                    shipping_address: shippingData,
                    checkout_weight_grams: checkoutWeightGrams,
                    summary_data: buildSummaryPatch(shippingFee, checkoutWeightGrams),
                });

                nextBtn.textContent = 'Processing...';
                await setCheckoutDraftStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                console.error('Error in shipping form:', error);
                alert(error.message || 'An error occurred. Please try again.');
                nextBtn.disabled = false;
                nextBtn.textContent = originalText;
                return;
            }

            nextBtn.disabled = false;
            nextBtn.textContent = originalText;
        });
    }
}

export default async function ShippingForm(root) {
    const formDiv = document.createElement('div');
    formDiv.className = 'form-container';
    formDiv.innerHTML = `
        <section id="shippingSection" class="shipping-form" style="display: flex; flex-direction: column;">
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
                        <input type="text" id="zip" name="zip" required readonly inputmode="numeric" autocomplete="postal-code" placeholder="Auto-filled after selecting a city">
                    </div>

                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button id="nextbtn" class="show" type="button">Next</button>
                    </div>
                </div>
            </form>
        </section>
    `;

    root.appendChild(formDiv);

    const api = new Address_Api();
    const state = {
        regionCode: '',
        regionName: '',
        provinceCode: '',
        provinceName: '',
        cityName: '',
    };

    try {
        await fetchCheckoutDraft();
    } catch (error) {
        console.error('Failed to fetch checkout draft for shipping form:', error);
    }

    await loadRegions(api);
    await hydrateShippingForm(api, state);
    setupEvents(api, state);
}
