import { loginUser } from "../../../services/bini_services/user/User-Api.js";
import { jwtDecode } from "jwt-decode";
import api from "../../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug, setSessionToken } from "../../../lib/site-context.js";
import { showAuthToast, showToast } from "../../../utils/toast.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LoginformComponent(formElement) {
  const siteSlug = getActiveSiteSlug("bini") || "bini";
  setActiveSiteSlug(siteSlug);
  const basePath = `/fanhub/community-platform/${encodeURIComponent(siteSlug)}`;
  // Check if already logged in for current site
  if (getSessionToken(siteSlug)) {
    window.location.href = `/fanhub/community-platform/${encodeURIComponent(siteSlug)}`;
  }
  formElement.innerHTML = `
        <div class="login-container">
            <div class="login-card"></div>
            <div class="login-form">
                <h2>LOGIN</h2>
                <form id="login-form">
                    <div class="form-group">
                        <input type="email" id="email" name="email" placeholder="Email" required>
                    </div>
                    <div class="form-group"> 
                        <input type="password" id="password" name="password" placeholder="Password" required>
                    </div>
                    <button type="submit" class="login-btn">Log in</button>
                    <div class="forgot-password">
                        <a href="#" id="forgot-password">Forgot Password</a>
                    </div>
                </form>
            </div>
            <div class="signup-prompt">
                <p>Don't have an account? <a href="${basePath}/register" id="create-account">Create now</a></p>
            </div>
        </div>

        <!-- Request Password Reset Modal -->
        <div id="resetPasswordModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2
                  class="password-modal-title"
                  style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; -webkit-text-stroke: 0 transparent !important; opacity: 1 !important; text-shadow: none !important; filter: none !important;"
                >Request Password Reset</h2>
                <p>Enter your email address to receive a password reset link.</p>
                <form id="resetPasswordForm">
                    <input type="email" id="resetEmail" placeholder="Email Address" required>
                    <button type="submit" class="btn-primary">Submit</button>
                </form>
            </div>
        </div>

        <!-- Update Password Modal -->
        <div id="updatePasswordModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2
                  class="password-modal-title"
                  style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; -webkit-text-stroke: 0 transparent !important; opacity: 1 !important; text-shadow: none !important; filter: none !important;"
                >Update Password</h2>
                <form id="updatePasswordForm">
                    <input type="email" id="updateEmail" placeholder="Email Address" required>
                    <input type="text" id="otp" placeholder="Enter OTP" required>
                    <input type="password" id="newPassword" placeholder="New Password" required>
                    <button type="submit" class="btn-primary">Update Password</button>
                </form>
            </div>
        </div>
    `;
  // Login form submission logic
  const loginForm = formElement.querySelector("#login-form");
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    try {
      const result = await loginUser({ email, password });
      console.log("🧩 Login API result:", result);

      console.log(result);

      await sleep(250);

      // setTimeout(() => {
      //   console.log("Hello");
      // }, 3000);
      const token = result?.token || result?.[0]?.token;
      if (token) {
        // Save token
        setSessionToken(token, siteSlug);
        try {
          // Decode JWT to extract userId
          const decoded = jwtDecode(token);
          console.log("🧠 Decoded token:", decoded);
          if (decoded && decoded.id) {
            sessionStorage.setItem("userId", String(decoded.id));
            sessionStorage.setItem("currentUserId", String(decoded.id));
            console.log("💾 Saved userId:", decoded.id);
          } else {
            console.warn("⚠️ No 'id' found in decoded token:", decoded);
          }
        } catch (decodeError) {
          console.error("❌ Failed to decode token:", decodeError);
        }

        showToast("Login successful!", "success");
        window.location.href = `/fanhub/community-platform/${encodeURIComponent(siteSlug)}`;
      } else {
        showAuthToast("Login failed: No token received.", "error");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      showAuthToast(`Login failed: ${error.message}`, "error");
    }
  });
  // forgot password modal logic
  const forgotPasswordButton = document.getElementById("forgot-password");
  const resetPasswordModal = document.getElementById("resetPasswordModal");
  const updatePasswordModal = document.getElementById("updatePasswordModal");
  const closeButtons = document.querySelectorAll(".close-button");

  forgotPasswordButton.addEventListener("click", (e) => {
    e.preventDefault();
    resetPasswordModal.style.display = "block";
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      resetPasswordModal.style.display = "none";
      updatePasswordModal.style.display = "none";
    });
  });

  window.addEventListener("click", (event) => {
    if (event.target === resetPasswordModal) {
      resetPasswordModal.style.display = "none";
    } else if (event.target === updatePasswordModal) {
      updatePasswordModal.style.display = "none";
    }
  });

  // request password reset
  const resetPasswordForm = document.getElementById("resetPasswordForm");

  resetPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("resetEmail").value;

    try {
      const response = await api.post("/bini/users/request-password-reset", {
        email,
      });

      // Axios automatically throws for 4xx/5xx
      showToast("Password reset link has been sent to your email.", "success");
      resetPasswordModal.style.display = "none";
      updatePasswordModal.style.display = "block";
    } catch (error) {
      showAuthToast(error.response?.data?.message || error.message, "error");
    }
  });

  // update password logic
  const updatePasswordForm = document.getElementById("updatePasswordForm");

  updatePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("updateEmail").value;
    const otp = document.getElementById("otp").value;
    const newPassword = document.getElementById("newPassword").value;

    try {
      await api.post("/bini/users/reset-password", {
        email,
        otp,
        newPassword,
      });

      showToast("Password has been updated successfully.", "success");
      updatePasswordModal.style.display = "none";
    } catch (error) {
      showAuthToast(error.response?.data?.message || error.message, "error");
    }
  });
}




