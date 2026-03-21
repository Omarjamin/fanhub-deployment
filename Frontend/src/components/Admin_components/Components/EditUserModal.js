import '../../../styles/Admin_styles/EditUserModal.css';
import {
  hasMinLength,
  isValidEmail,
  reportValidationError,
  sanitizeAdminText,
} from '../../../utils/admin-form-validation.js';
import { showToast } from '../../../utils/toast.js';

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_ROLES = new Set(['user', 'moderator', 'admin']);
const ALLOWED_STATUSES = new Set(['active', 'inactive', 'suspended']);

export default class EditUserModal {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'modal';
    this.element.id = 'editUserModal';
    this.element.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Edit User</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editUserForm">
            <div class="form-group">
              <label for="editUserName">Full Name</label>
              <input type="text" id="editUserName" class="form-control" maxlength="120" required>
            </div>
            
            <div class="form-group">
              <label for="editUserEmail">Email</label>
              <input type="email" id="editUserEmail" class="form-control" maxlength="254" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="editUserRole">Role</label>
                <select id="editUserRole" class="form-control" required>
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="editUserStatus">Status</label>
                <select id="editUserStatus" class="form-control" required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="editUserBio">Bio</label>
              <textarea id="editUserBio" class="form-control" rows="3" maxlength="500"></textarea>
            </div>
            
            <div class="form-group">
              <label>Profile Picture</label>
              <div class="file-upload">
                <input type="file" id="editUserAvatar" accept="image/*">
                <label for="editUserAvatar" class="btn btn-secondary">Choose File</label>
                <span id="avatarFileName">No file chosen</span>
              </div>
              <div class="avatar-preview" id="avatarPreview">
                <img src="/placeholder.svg" alt="Avatar Preview" id="avatarPreviewImg">
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="cancelEditUser">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  render() {
    this.initEditUserModal(); 
    return this.element;
  }

  initEditUserModal() {
    const form = this.element.querySelector("#editUserForm");
    const nameInput = this.element.querySelector("#editUserName");
    const emailInput = this.element.querySelector("#editUserEmail");
    const roleInput = this.element.querySelector("#editUserRole");
    const statusInput = this.element.querySelector("#editUserStatus");
    const bioInput = this.element.querySelector("#editUserBio");
    const fileInput = this.element.querySelector("#editUserAvatar");
    const fileNameSpan = this.element.querySelector("#avatarFileName");
    const previewImg = this.element.querySelector("#avatarPreviewImg");

    const resetAvatarPreview = () => {
      if (fileNameSpan) fileNameSpan.textContent = "No file chosen";
      if (previewImg) previewImg.src = "/placeholder.svg";
      if (fileInput) fileInput.value = "";
    };

    const validateAvatarFile = (file) => {
      if (!file) return true;

      if (!ALLOWED_AVATAR_TYPES.has(String(file.type || "").toLowerCase())) {
        showToast("Profile picture must be a JPG, PNG, WEBP, or GIF image.", "error");
        resetAvatarPreview();
        return false;
      }

      if (Number(file.size || 0) > MAX_AVATAR_FILE_SIZE) {
        showToast("Profile picture must be 2 MB or smaller.", "error");
        resetAvatarPreview();
        return false;
      }

      return true;
    };

    this.element.querySelector(".modal-close")?.addEventListener("click", () => {
      closeModal("editUserModal");
    });

    this.element.querySelector("#cancelEditUser")?.addEventListener("click", () => {
      closeModal("editUserModal");
    });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = sanitizeAdminText(nameInput?.value || "", { maxLength: 120 });
      const email = sanitizeAdminText(emailInput?.value || "", { maxLength: 254 });
      const role = String(roleInput?.value || "user").trim().toLowerCase();
      const status = String(statusInput?.value || "active").trim().toLowerCase();
      const bio = sanitizeAdminText(bioInput?.value || "", { maxLength: 500 });
      const avatarFile = fileInput?.files?.[0] || null;

      if (nameInput) nameInput.value = name;
      if (emailInput) emailInput.value = email;
      if (bioInput) bioInput.value = bio;

      if (!hasMinLength(name, 2)) {
        return reportValidationError(nameInput, "Full name is required and must be at least 2 characters.");
      }

      if (!isValidEmail(email)) {
        return reportValidationError(emailInput, "Please enter a valid email address.");
      }

      if (!ALLOWED_ROLES.has(role)) {
        return reportValidationError(roleInput, "Please select a valid user role.");
      }

      if (!ALLOWED_STATUSES.has(status)) {
        return reportValidationError(statusInput, "Please select a valid user status.");
      }

      if (avatarFile && !validateAvatarFile(avatarFile)) {
        return;
      }

      const payload = {
        name,
        email,
        role,
        status,
        bio,
        avatar: avatarFile,
      };

      this.element.dispatchEvent(new CustomEvent("edit-user-submit", {
        bubbles: true,
        detail: payload,
      }));

      console.log("[EditUserModal] Saving changes...", payload);
      closeModal("editUserModal");
    });

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!validateAvatarFile(file)) return;
        fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        resetAvatarPreview();
      }
    });
  }
}
