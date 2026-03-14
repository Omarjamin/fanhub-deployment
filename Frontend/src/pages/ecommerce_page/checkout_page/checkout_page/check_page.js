
import Navigation from '../../../../components/ecommerce_components/navigation.js';
import Footer from '../../../../components/ecommerce_components/footer.js';
import CheckOutBanner from '../../../../components/ecommerce_components/checkout/check_out_banner.js';
import CheckOutSteps from '../../../../components/ecommerce_components/checkout/check_out_steps.js';
import ShippingForm from '../../../../components/ecommerce_components/order/shipping_form.js';
import PaymentForm from '../../../../components/ecommerce_components/order/payment_form.js';
import OrderReview from '../../../../components/ecommerce_components/order/order_review.js';
import OrderSummary from '../../../../components/ecommerce_components/order/order_summary.js';
import { fetchCheckoutDraft, getCachedCheckoutDraft, setCheckoutDraftStep } from '../../../../services/ecommerce_services/checkout/checkout_draft.js';

import '../../../../styles/ecommerce_styles/global.css';
import '../../../../styles/ecommerce_styles/checkout.css';

import Layouts from '../../../../layouts/ecommerce_layout/default-home.js';

let stepChangedHandler = null;

export default async function Checkout() {
  const { navigation, main, footer} = Layouts(this.root);
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const communityType =
    pathParts[0] === 'fanhub'
      ? (pathParts[1] === 'community-platform' ? (pathParts[2] || '') : (pathParts[1] || ''))
      : '';
  const shopPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';

  Navigation(navigation, { community_type: communityType }); 
  Footer(footer, { community_type: communityType });
  main.classList.add('checkout-main');

  try {
    await fetchCheckoutDraft();
  } catch (error) {
    console.error('Failed to load checkout draft:', error);
  }
  
  // Add checkout title and back button
  main.innerHTML = `
    <div class="checkout-header">
      <button id="back-to-shop" class="btn-link">
        <span class="back-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"></path>
          </svg>
        </span>
        <span class="back-label">Back</span>
      </button>
      <h1 class="checkout-title">Checkout</h1>
    </div>
  `;
  
  // Add checkout steps at the top first
  CheckOutSteps(main);

  // ===== SHIPPING STEP =====
  const shippingStep = document.createElement('div');
  shippingStep.className = 'checkout-step-content';
  shippingStep.setAttribute('data-step', '1');
  shippingStep.style.display = 'none';
  main.appendChild(shippingStep);
  
  // Create new layout: Order Summary on top (wide), Shipping Form below
  const orderSummaryContainer = document.createElement('div');
  orderSummaryContainer.className = 'order-summary-top';
  shippingStep.appendChild(orderSummaryContainer);
  
  const shippingFormContainer = document.createElement('div');
  shippingFormContainer.className = 'shipping-form-container';
  shippingStep.appendChild(shippingFormContainer);
  
  const shippingForm = document.createElement('div');
  shippingFormContainer.appendChild(shippingForm);
  
  await OrderSummary(orderSummaryContainer);
  await ShippingForm(shippingForm);

  // ===== PAYMENT STEP =====
  const paymentStep = document.createElement('div');
  paymentStep.className = 'checkout-step-content';
  paymentStep.setAttribute('data-step', '2');
  paymentStep.style.display = 'none';
  main.appendChild(paymentStep);
  
  // Create new layout: Order Summary on top (wide), Payment Form below
  const paymentOrderSummaryContainer = document.createElement('div');
  paymentOrderSummaryContainer.className = 'order-summary-top';
  paymentStep.appendChild(paymentOrderSummaryContainer);
  
  const paymentFormContainer = document.createElement('div');
  paymentFormContainer.className = 'payment-form-container';
  paymentStep.appendChild(paymentFormContainer);
  
  const paymentForm = document.createElement('div');
  paymentFormContainer.appendChild(paymentForm);
  
  await OrderSummary(paymentOrderSummaryContainer);
  await PaymentForm(paymentForm);

  // ===== ORDER REVIEW STEP =====
  const reviewStep = document.createElement('div');
  reviewStep.className = 'checkout-step-content';
  reviewStep.setAttribute('data-step', '3');
  reviewStep.style.display = 'none';
  main.appendChild(reviewStep);
  
  const reviewContainer = document.createElement('div');
  reviewContainer.className = 'checkout-form-with-summary review-only';
  reviewStep.appendChild(reviewContainer);
  
  const reviewForm = document.createElement('div');
  reviewContainer.appendChild(reviewForm);
  
  await OrderReview(reviewForm);

  // Show the current step
  updateStepVisibility();

  if (stepChangedHandler) {
    window.removeEventListener('stepChanged', stepChangedHandler);
  }

  stepChangedHandler = () => {
    updateStepVisibility();
  };

  window.addEventListener('stepChanged', stepChangedHandler);

  // Setup back button
  setupBackButton(shopPath);
};

function setupBackButton(shopPath = '/shop') {
  const backBtn = document.getElementById('back-to-shop');
  if (backBtn && !backBtn.hasAttribute('data-handler-attached')) {
    backBtn.setAttribute('data-handler-attached', 'true');
    backBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const currentStep = Number(getCachedCheckoutDraft().current_step) || 1;
      if (currentStep > 1) {
        const newStep = currentStep - 1;
        try {
          await setCheckoutDraftStep(newStep);
        } catch (error) {
          console.error('Failed to update checkout step:', error);
        }
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // If on first step, go back to shop
        window.location.href = shopPath;
      }
    });
  }
}

function updateStepVisibility() {
  const currentStep = Number(getCachedCheckoutDraft().current_step) || 1;
  const steps = document.querySelectorAll('.checkout-step-content');
  
  steps.forEach(step => {
    const stepNum = step.getAttribute('data-step');
    if (Number(stepNum) === currentStep) {
      step.style.display = 'block';
    } else {
      step.style.display = 'none';
    }
  });
  
  // Update step indicators
  const stepIndicators = document.querySelectorAll('.checkout-steps .step');
  stepIndicators.forEach(step => {
    const stepNum = Number(step.dataset.step);
    step.classList.remove('current', 'completed');
    if (stepNum === currentStep) {
      step.classList.add('current');
    } else if (stepNum < currentStep) {
      step.classList.add('completed');
    }
  });
}

