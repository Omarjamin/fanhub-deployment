import { showToast } from '../../../utils/toast.js';

export default async function PaymentForm(root) {
    root.innerHTML = `
        <div class="form-container">
            <h3>Payment Method</h3>
            <form id="paymentForm">
                <div class="payment-methods">
                    <span class="payment-section-label">Select Payment Method</span>

                    <label class="payment-card" for="paymentMethodCod" data-method="cod">
                        <div class="payment-card-head">
                            <input id="paymentMethodCod" type="radio" name="paymentMethod" value="cod" required>
                            <div class="payment-card-title">
                                <strong>Cash on Delivery</strong>
                                <small>Pay when your order arrives.</small>
                            </div>
                            <div class="payment-card-logo">COD</div>
                        </div>
                        <div class="payment-fields">
                            <p class="payment-helper">Prepare exact cash if possible.</p>
                        </div>
                    </label>
                </div>

                <div class="form-row payment-actions">
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
    const cards = Array.from(root.querySelectorAll('.payment-card'));
    const updateCardState = () => {
        cards.forEach((card) => {
            const input = card.querySelector('input[name="paymentMethod"]');
            if (!input) return;
            const isSelected = input.checked;
            card.classList.toggle('is-selected', isSelected);
            card.setAttribute('aria-expanded', isSelected ? 'true' : 'false');
        });
    };

    root.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
        input.addEventListener('change', () => {
            updateCardState();
            const paymentMethodSelect = root.querySelector('input[name="paymentMethod"]:checked');
            if (!paymentMethodSelect) return;
            const paymentData = {
                method: paymentMethodSelect.value,
                methodText: paymentMethodSelect.value === 'cod' ? 'Cash on Delivery' : paymentMethodSelect.value
            };
            sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
        });
    });

    updateCardState();

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