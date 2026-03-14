import { showToast } from '../../../utils/toast.js';
import {
    fetchCheckoutDraft,
    getCachedCheckoutDraft,
    saveCheckoutDraft,
    setCheckoutDraftStep,
} from '../../../services/ecommerce_services/checkout/checkout_draft.js';

function getSelectedPaymentData(root) {
    const paymentMethod = root.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethod) return null;

    return {
        method: paymentMethod.value,
        methodText: paymentMethod.value === 'cod' ? 'Cash on Delivery' : paymentMethod.value,
    };
}

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

    try {
        await fetchCheckoutDraft();
    } catch (error) {
        console.error('Failed to fetch checkout draft for payment form:', error);
    }

    const savedPaymentData = getCachedCheckoutDraft().payment_data;
    if (savedPaymentData?.method) {
        const matchingInput = root.querySelector(`input[name="paymentMethod"][value="${savedPaymentData.method}"]`);
        if (matchingInput) matchingInput.checked = true;
    }

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
        input.addEventListener('change', async () => {
            updateCardState();
            const paymentData = getSelectedPaymentData(root);
            if (!paymentData) return;

            try {
                await saveCheckoutDraft({ payment_data: paymentData });
            } catch (error) {
                console.error('Failed to save payment draft:', error);
            }
        });
    });

    updateCardState();

    const nextBtn = document.getElementById('paymentNextBtn');
    if (nextBtn && !nextBtn.hasAttribute('data-payment-handler')) {
        nextBtn.setAttribute('data-payment-handler', 'true');
        nextBtn.addEventListener('click', async (event) => {
            event.preventDefault();

            const originalText = nextBtn.textContent;
            nextBtn.disabled = true;
            nextBtn.textContent = 'Processing...';

            try {
                const paymentData = getSelectedPaymentData(root);
                const paymentCard = root.querySelector('label[for="paymentMethodCod"]');

                if (!paymentData) {
                    if (paymentCard) paymentCard.style.borderColor = '#dc2626';
                    root.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
                        input.addEventListener('change', () => {
                            if (paymentCard) paymentCard.style.borderColor = '#d1d5db';
                        }, { once: true });
                    });
                    showToast('Please select a payment method.', 'error');
                    nextBtn.disabled = false;
                    nextBtn.textContent = originalText;
                    return;
                }

                await saveCheckoutDraft({ payment_data: paymentData });
                await setCheckoutDraftStep(3);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                console.error('Error in payment form:', error);
                showToast(error.message || 'An error occurred. Please try again.', 'error');
                nextBtn.disabled = false;
                nextBtn.textContent = originalText;
                return;
            }

            nextBtn.disabled = false;
            nextBtn.textContent = originalText;
        });
    }
}
