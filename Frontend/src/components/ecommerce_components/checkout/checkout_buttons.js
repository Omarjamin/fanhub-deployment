import { placeOrder } from '../../../services/ecommerce_services/order/place_order.js';

export default function CheckoutButtons(root) {
    // Add buttons for all steps (only Next button, back button is in checkout_page.js)
    root.innerHTML += `
    <section class="checkout-buttons-container">
        <button class="btn-next" id="paymentNextBtn" type="button" data-payment-handler="true">Next</button>
    </section>
    `;
    
    // Use a small delay to ensure DOM is updated
    setTimeout(() => {
        let currentStep = Number(sessionStorage.getItem('checkoutStep')) || 1;
        const nextBtn = document.getElementById('paymentNextBtn');

        console.log('CheckoutButtons - Step:', currentStep, 'Button found:', { nextBtn: !!nextBtn });

        // Next button click event (for all steps)
        if (nextBtn && !nextBtn.hasAttribute('data-handler-attached')) {
            nextBtn.setAttribute('data-handler-attached', 'true');
            nextBtn.addEventListener('click', () => {
                // Validate current step before proceeding
                if (!validateStep(currentStep)) return;

                if (currentStep < 3) {
                    currentStep++;
                    sessionStorage.setItem('checkoutStep', currentStep);
                    updateStepDisplay();
                    window.dispatchEvent(new Event('stepChanged'));
                } else if (currentStep === 3) {
                    // Place order from step 3 using core implementation
                    // disable next button while placing
                    nextBtn.disabled = true;
                    const origText = nextBtn.textContent;
                    nextBtn.textContent = 'Placing order...';
                    const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
                    const communityType =
                        pathParts[0] === 'fanhub'
                            ? (pathParts[1] === 'community-platform' ? (pathParts[2] || '') : (pathParts[1] || ''))
                            : '';
                    placeOrder().then(result => {
                        if (result && result.success) {
                            // redirect to confirmation with order id if available
                            const id = result.orderId || sessionStorage.getItem('lastOrderId');
                            const confirmationPath = communityType
                                ? `/fanhub/${communityType}/order-confirmation`
                                : '/order-confirmation';
                            window.location.href = id ? `${confirmationPath}?orderId=${id}` : confirmationPath;
                        } else {
                            alert('Order placed (no confirmation).');
                        }
                    }).catch(err => {
                        console.error('Place order failed:', err);
                        alert('Failed to place order: ' + (err.message || 'Server error'));
                    }).finally(() => {
                        nextBtn.disabled = false;
                        nextBtn.textContent = origText;
                    });
                }
            });
        }

        updateStepDisplay();

        // Listen for step changes from edit/change links
        window.addEventListener('stepChanged', () => {
            currentStep = Number(sessionStorage.getItem('checkoutStep')) || 1;
            updateStepDisplay();
        });

        function updateStepDisplay() {
            const nextBtn = document.getElementById('paymentNextBtn');
            
            // Update next button text and visibility
            if (nextBtn) {
                nextBtn.textContent = currentStep === 3 ? 'Place Order' : 'Next';
                nextBtn.style.display = 'block';
                nextBtn.disabled = false;
            }
        }

        function validateStep(step) {
            if (step === 1) {
                let selector = '#shippingSection input, #shippingSection select, #shippingSection textarea';
                if (!document.querySelector('#shippingSection')) {
                    selector = '.shipping-form input, .shipping-form select, .shipping-form textarea';
                }

                const inputs = document.querySelectorAll(selector);
                for (let input of inputs) {
                    // Ignore disabled or hidden fields (province may be disabled for NCR)
                    if (input.disabled) continue;
                    const val = (input.value || '').toString().trim();
                    if (input.required && !val) {
                        alert('Please fill all shipping fields.');
                        return false;
                    }
                }
                saveShipping();
            }

            if (step === 2) {
                const paymentSelect = document.querySelector('#paymentMethod');
                if (!paymentSelect || !paymentSelect.value || paymentSelect.value === '') {
                    alert('Please select a payment method.');
                    return false;
                }
                // Save with both keys for compatibility
                sessionStorage.setItem('paymentMethod', paymentSelect.value);
                const paymentData = {
                    method: paymentSelect.value,
                    methodText: paymentSelect.options[paymentSelect.selectedIndex].text
                };
                sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
            }

            return true;
        }

        function saveShipping() {
            const data = {};
            const inputs = document.querySelectorAll('#shippingSection input, #shippingSection select, #shippingSection textarea');
            inputs.forEach(input => {
                data[input.name || input.id] = input.value;
            });
            
            // Also save with proper keys for order review
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
        }

        // legacy placeholder removed; core placeOrder() is used above
    }, 50);
}
