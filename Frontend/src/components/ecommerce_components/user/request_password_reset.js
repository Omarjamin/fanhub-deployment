import { requestPasswordReset } from '../../../services/ecommerce_services/user/reset_password.js';
// Ensure update-password modal component is loaded so `window.showUpdatePasswordModal` exists
import '../user/update_password.js';
// Import styles from Styles folder
import '../../../styles/ecommerce_styles/request_password_reset.css';

function createPasswordResetModal() {
  const modalHTML = `
      <div class="password-reset-modal">
        <div class="password-reset-modal-content">
          <span class="close-button">&times;</span>
          <form class="password-reset-form">
            <h2
              class="reset-password-modal-title"
              style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; -webkit-text-stroke: 0 transparent !important; opacity: 1 !important; text-shadow: none !important; filter: none !important;"
            >Reset Password</h2>
            <p class="email-request-parag">Enter your email address and we will send you instructions to reset your password.</p>
            
            <div class="form-group">
              <label for="reset-email">Email Address</label>
              <input type="email" id="reset-email" required placeholder="Enter your email">
            </div>
            
            <div class="message-container"></div>
            <button type="submit" class="reset-submit-btn">Send Reset Link</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Styles are imported from ../Styles/request_password_reset.css

    // Get modal elements
    const modal = document.querySelector('.password-reset-modal');
    const closeButton = modal.querySelector('.close-button');
    const form = modal.querySelector('.password-reset-form');
    const messageContainer = modal.querySelector('.message-container');
    const submitButton = modal.querySelector('.reset-submit-btn');

    // Close modal when clicking the close button
    closeButton.addEventListener('click', () => {
      modal.classList.remove('show');
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = form.querySelector('#reset-email').value.trim();
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';

      try {
        const { success, message } = await requestPasswordReset(email);
        const normalizedMessage = String(message || '');
        const shouldOpenVerifyModal =
          success || /otp already sent|already sent|please wait/i.test(normalizedMessage);
        
        if (shouldOpenVerifyModal) {
          messageContainer.textContent = message;
          messageContainer.className = 'message-container success';
          // Open verify OTP modal immediately after requesting reset.
          if (typeof window.showUpdatePasswordModal === 'function') {
            window.showUpdatePasswordModal(email);
          }
          modal.classList.remove('show');
          form.reset();
          messageContainer.className = 'message-container';
          messageContainer.textContent = '';
        } else {
          messageContainer.textContent = message;
          messageContainer.className = 'message-container error';
        }
      } catch (error) {
        messageContainer.textContent = 'An error occurred. Please try again later.';
        messageContainer.className = 'message-container error';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Reset Link';
      }
    });
  }

  // Create the modal when the component is initialized
  createPasswordResetModal();

  // Function to show the modal (this will be called from the login form)
  window.showPasswordResetModal = (prefillEmail = '') => {
    const modal = document.querySelector('.password-reset-modal');
    if (modal) {
      const emailInput = modal.querySelector('#reset-email');
      if (emailInput && prefillEmail) {
        emailInput.value = String(prefillEmail).trim();
      }
      modal.classList.add('show');
    }
  };
