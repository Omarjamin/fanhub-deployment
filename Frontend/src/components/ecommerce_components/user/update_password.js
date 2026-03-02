import { updatePassword } from '../../../services/ecommerce_services/user/update_password.js';
import '../../../styles/ecommerce_styles/update_password.css';

function createUpdatePasswordModal() {
  const modalHTML = `
    <div class="update-password-modal">
      <div class="update-password-modal-content">
        <span class="close-button">&times;</span>
        <form id="updatePasswordForm">
          <h2>Update Password</h2>

          <div class="form-group">
            <label for="updateEmail">Email</label>
            <input type="email" id="updateEmail" required placeholder="Enter your email">
          </div>

          <div class="form-group">
            <label for="otp">OTP / Code</label>
            <input type="text" id="otp" required placeholder="Enter the OTP you received">
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" required placeholder="Enter new password">
          </div>

          <div class="message-container"></div>
          <button type="submit" class="update-submit-btn">Update Password</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Styles are imported from ../Styles/update_password.css

  const modal = document.querySelector('.update-password-modal');
  const closeButton = modal.querySelector('.close-button');
  const form = document.getElementById('updatePasswordForm');
  const messageContainer = modal.querySelector('.message-container');
  const submitButton = modal.querySelector('.update-submit-btn');
  const emailInput = modal.querySelector('#updateEmail');

  closeButton.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const otp = modal.querySelector('#otp').value.trim();
    const newPassword = modal.querySelector('#newPassword').value;

    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';

    try {
      const { success, message } = await updatePassword(email, otp, newPassword);

      if (success) {
        messageContainer.textContent = message;
        messageContainer.className = 'message-container success';
        setTimeout(() => {
          modal.classList.remove('show');
          form.reset();
          messageContainer.className = 'message-container';
          messageContainer.textContent = '';
        }, 2000);
      } else {
        messageContainer.textContent = message;
        messageContainer.className = 'message-container error';
      }
    } catch (err) {
      messageContainer.textContent = err.message || 'An error occurred';
      messageContainer.className = 'message-container error';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Update Password';
    }
  });

  window.showUpdatePasswordModal = (prefillEmail = '') => {
    const modalEl = document.querySelector('.update-password-modal');
    if (!modalEl) return;
    const emailEl = modalEl.querySelector('#updateEmail');
    if (prefillEmail) emailEl.value = prefillEmail;
    modalEl.classList.add('show');
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createUpdatePasswordModal);
} else {
  createUpdatePasswordModal();
}
