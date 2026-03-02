import ShippingForm from "../order/shipping_form";

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

    // Initialize steps display
    let steps = root.querySelectorAll('.checkout-steps .step');
    let sections = document.querySelectorAll('.checkout-section');
    let currentStep = Number(sessionStorage.getItem('checkoutStep')) || 1;
    sessionStorage.setItem('checkoutStep', currentStep);

    let attempts = 0;
    while (sections.length === 0 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        steps = root.querySelectorAll('.checkout-steps .step');
        sections = document.querySelectorAll('.checkout-section');
        attempts++;
    }

    updateStepDisplay();
    console.log('Current step:', currentStep, 'Steps found:', steps.length);

    // Listen for step changes from buttons
    window.addEventListener('stepChanged', () => {
        currentStep = Number(sessionStorage.getItem('checkoutStep'));
        updateStepDisplay();
    });

    function updateStepDisplay() {
        steps.forEach(step => {
            const stepNum = Number(step.dataset.step);
            step.classList.remove('current', 'completed');
            if (stepNum === currentStep) step.classList.add('current');
            else if (stepNum < currentStep) step.classList.add('completed');
        });

        sections.forEach((section, idx) => {
            section.style.display = (idx + 1 === currentStep) ? 'flex' : 'none';
        });
    }
}
