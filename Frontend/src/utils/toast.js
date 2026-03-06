const AUTH_TOAST_RULES = {
  error: [
    'user not found',
    'wrong password',
    'captcha error',
    'invalid otp',
    'expired otp',
  ],
  warning: [
    'too many attempts soon',
    'account will be locked',
    'suspicious login detected',
  ],
};

function normalizeAuthMessage(message = '') {
  return String(message || '')
    .toLowerCase()
    .replace(/^login failed:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .trim();
}

export function getAuthToastType(message, fallbackType = 'error') {
  const normalizedMessage = normalizeAuthMessage(message);

  if (!normalizedMessage) return fallbackType;

  if (AUTH_TOAST_RULES.warning.some((rule) => normalizedMessage.includes(rule))) {
    return 'warning';
  }

  if (AUTH_TOAST_RULES.error.some((rule) => normalizedMessage.includes(rule))) {
    return 'error';
  }

  return fallbackType;
}

export function showAuthToast(message, fallbackType = 'error') {
  showToast(message, getAuthToastType(message, fallbackType));
}

// Toast notification utility
export function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;

  // Add styles
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#22c55e' : '#3b82f6'};
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    z-index: 10001;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 18px;
    font-weight: 600;
    max-width: 400px;
    text-align: center;
    animation: slideDown 0.3s ease-out;
  `;

  // Add animation keyframes if not already present
  if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to DOM
  document.body.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

// Toast confirmation utility
export function showConfirmToast(message, onConfirm, onCancel) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-confirm`;
  toast.innerHTML = `
    <div style="margin-bottom: 15px;">${message}</div>
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button id="confirmYes" style="
        background: #22c55e;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">Yes</button>
      <button id="confirmNo" style="
        background: #ef4444;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">No</button>
    </div>
  `;

  // Add styles
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #64748b;
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    z-index: 10001;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 18px;
    font-weight: 600;
    max-width: 400px;
    text-align: center;
    animation: slideDown 0.3s ease-out;
  `;

  // Add animation keyframes if not already present
  if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to DOM
  document.body.appendChild(toast);

  // Add event listeners
  const yesBtn = toast.querySelector('#confirmYes');
  const noBtn = toast.querySelector('#confirmNo');

  yesBtn.addEventListener('click', () => {
    toast.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
    if (onConfirm) onConfirm();
  });

  noBtn.addEventListener('click', () => {
    toast.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
    if (onCancel) onCancel();
  });

  // Auto remove after 10 seconds (longer for confirmation)
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
    if (onCancel) onCancel();
  }, 10000);
}

export default showToast;
