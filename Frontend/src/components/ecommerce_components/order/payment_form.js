import { showToast } from '../../../utils/toast.js';

export default async function PaymentForm(root) {
    root.innerHTML = `
        <div class="form-container">
            <h3>Payment Method</h3>
            <form id="paymentForm">
                <div class="form-row">
                    <div class="form-group">
                        <span style="display:block; margin-bottom:10px; font-weight:600;">Select Payment Method</span>
                        <label for="paymentMethodCod" style="display:flex; align-items:center; gap:10px; padding:14px 16px; border:1px solid #d1d5db; border-radius:12px; cursor:pointer; background:#fff;">
                            <input id="paymentMethodCod" type="radio" name="paymentMethod" value="cod" required>
                            <span>
                                <strong>Cash on Delivery</strong><br>
                                <small style="color:#6b7280;">Pay when your order arrives.</small>
                            </span>
                        </label>
                    </div>
                    <div class="form-group">
                        <button class="btn-next" id="paymentNextBtn" type="button">Next</button>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Load previously saved data if available
    const savedPaymentData = sessionStorage.getItem('paymentData');
    if (savedPaymentData) {
        try {
            const data = JSON.parse(savedPaymentData);
            if (data.method) {
                const matchingInput = root.querySelector(`input[name="paymentMethod"][value="${data.method}"]`);
                if (matchingInput) matchingInput.checked = true;
            }
        } catch (e) {
            console.error('Error loading saved payment data:', e);
        }
    }

    // Setup event listener to save payment data to sessionStorage
    root.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
        input.addEventListener('change', () => {
            const paymentMethodSelect = root.querySelector('input[name="paymentMethod"]:checked');
            if (!paymentMethodSelect) return;
            const paymentData = {
                method: paymentMethodSelect.value,
                methodText: paymentMethodSelect.value === 'cod' ? 'Cash on Delivery' : paymentMethodSelect.value
            };
            sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
        });
    });

    // Setup next button functionality
    setTimeout(() => {
        const nextBtn = document.getElementById('paymentNextBtn');
        if (nextBtn && !nextBtn.hasAttribute('data-payment-handler')) {
            nextBtn.setAttribute('data-payment-handler', 'true');
            nextBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Show loading state
                const origText = nextBtn.textContent;
                nextBtn.disabled = true;
                nextBtn.textContent = 'Processing...';
                
                try {
                    // Validate payment method is selected
                    const paymentMethod = root.querySelector('input[name="paymentMethod"]:checked');
                    const paymentCard = root.querySelector('label[for="paymentMethodCod"]');
                    if (!paymentMethod || !paymentMethod.value) {
                        if (paymentCard) paymentCard.style.borderColor = '#dc2626';
                        root.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
                            input.addEventListener('change', () => {
                                if (paymentCard) paymentCard.style.borderColor = '#d1d5db';
                            }, { once: true });
                        });
                        showToast('Please select a payment method.', 'error');
                        nextBtn.disabled = false;
                        nextBtn.textContent = origText;
                        return;
                    }

                    // Save payment data
                    const paymentData = {
                        method: paymentMethod.value,
                        methodText: paymentMethod.value === 'cod' ? 'Cash on Delivery' : paymentMethod.value
                    };
                    sessionStorage.setItem('paymentMethod', paymentMethod.value);
                    sessionStorage.setItem('paymentData', JSON.stringify(paymentData));

                    // Small delay for smooth transition
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Update step in sessionStorage
                    sessionStorage.setItem('checkoutStep', '3');
                    
                    // Trigger step change event
                    window.dispatchEvent(new Event('stepChanged'));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch (error) {
                    console.error('Error in payment form:', error);
                    showToast('An error occurred. Please try again.', 'error');
                    nextBtn.disabled = false;
                    nextBtn.textContent = origText;
                }
            });
        }
    }, 100);
}
