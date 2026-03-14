import { getCachedCheckoutDraft, getCheckoutDraftEventName } from '../../../services/ecommerce_services/checkout/checkout_draft.js';

export default async function CheckOutSteps(root) {
    root.innerHTML += `
    <section class="checkout-steps">
        <div class="step" data-step="1">
            <div class="step-shipping-info"><img src="/delivery-truck.png" alt="Shipping Info"></div>
            <div class="step-label">Shipping Information</div>
        </div>
        <div class="step-line"></div>
        <div class="step" data-step="2">
            <div class="step-payment"><img src="/payment-method.png" alt="Payment Method"></div>
            <div class="step-label">Payment Method</div>
        </div>
        <div class="step-line"></div>
        <div class="step" data-step="3">
            <div class="step-overview"><img src="/documents.png" alt="Order Review"></div>
            <div class="step-label">Order Review</div>
        </div>
    </section>

    `;

    const steps = root.querySelectorAll('.checkout-steps .step');
    const syncSteps = () => {
        if (!document.body.contains(root)) {
            window.removeEventListener('stepChanged', syncSteps);
            window.removeEventListener(getCheckoutDraftEventName(), syncSteps);
            return;
        }
        updateStepDisplay();
    };

    syncSteps();
    window.addEventListener('stepChanged', syncSteps);
    window.addEventListener(getCheckoutDraftEventName(), syncSteps);

    function updateStepDisplay() {
        const currentStep = Number(getCachedCheckoutDraft().current_step) || 1;
        steps.forEach(step => {
            const stepNum = Number(step.dataset.step);
            step.classList.remove('current', 'completed');
            if (stepNum === currentStep) step.classList.add('current');
            else if (stepNum < currentStep) step.classList.add('completed');
        });
    }
}
