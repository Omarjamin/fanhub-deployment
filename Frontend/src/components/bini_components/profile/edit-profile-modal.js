import '../../../styles/bini_styles/EditProfileModal.css';
import api from '../../../services/bini_services/api.js';
import { showToast } from '../../../utils/toast.js';
import {
  DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES,
  IMAGE_UPLOAD_ACCEPT_ATTR,
  validateSingleImageFile,
} from '../../../utils/image-upload.js';

const DEFAULT_PROFILE_IMAGE = "/circle-user.png";
const PROFILE_IMAGE_LABEL = "Profile image";

export default function showEditProfileModal(user, token, onUpdate) {
  const existing = document.getElementById('editProfileModal');
  if (existing) existing.remove();
  const hasExistingPhoto = Boolean(user?.profile_picture);

  const modal = document.createElement('div');
  modal.id = 'editProfileModal';
  modal.innerHTML = `
    <div class="edit-profile-content">
      <button id="closeEditModal" class="close-edit-modal" aria-label="Close">&times;</button>
      <div class="edit-profile-header">
        <h3>Edit Profile</h3>
      </div>
      <form id="editProfileForm" class="edit-profile-form">
        <div class="form-group">
          <label for="editFullname">Full Name:</label>
          <input type="text" id="editFullname" value="${user.fullname || ''}" required>
        </div>
        
        <div class="form-group">
          <label>Profile Picture:</label>
          <img id="previewProfilePic" 
               src="${user.profile_picture || DEFAULT_PROFILE_IMAGE}" 
               class="profile-picture-preview" 
               alt="Profile preview"
               onerror="this.src='${DEFAULT_PROFILE_IMAGE}';">
          
          <div class="file-upload-wrapper">
            <button type="button" id="removeProfilePic" class="remove-photo-button" ${hasExistingPhoto ? "" : "disabled"}>
              Remove Photo
            </button>
            <label for="editProfilePicFile" class="file-upload-label">
              Choose Photo
            </label>
            <input type="file" 
                   id="editProfilePicFile" 
                   class="file-upload-input" 
                   accept="${IMAGE_UPLOAD_ACCEPT_ATTR}">
          </div>
        </div>
        
        <button type="submit" class="save-button">
          <span class="button-text">Save Changes</span>
        </button>
        
        <div id="formError" class="error-message"></div>
        <div id="formSuccess" class="success-message">Profile updated successfully!</div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Preview image on file select
  const fileInput = modal.querySelector('#editProfilePicFile');
  const previewImg = modal.querySelector('#previewProfilePic');
  const removeButton = modal.querySelector('#removeProfilePic');
  let removePhotoRequested = false;

  fileInput.addEventListener('change', () => {
    const selectedFile = fileInput.files?.[0] || null;
    if (!selectedFile) return;

    const imageValidation = validateSingleImageFile(selectedFile, {
      label: PROFILE_IMAGE_LABEL,
      maxSizeBytes: DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES,
    });
    if (!imageValidation.isValid) {
      showToast(imageValidation.errorMessage, 'error');
      fileInput.value = "";
      previewImg.src = removePhotoRequested
        ? DEFAULT_PROFILE_IMAGE
        : (user.profile_picture || DEFAULT_PROFILE_IMAGE);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      previewImg.src = e.target.result;
    };
    reader.readAsDataURL(selectedFile);
    removePhotoRequested = false;
    if (removeButton) removeButton.disabled = false;
  });

  if (removeButton) {
    removeButton.addEventListener('click', () => {
      removePhotoRequested = true;
      fileInput.value = "";
      previewImg.src = DEFAULT_PROFILE_IMAGE;
      removeButton.disabled = true;
    });
  }

  // Close modal logic
  modal.querySelector('#closeEditModal').onclick = () => {
    modal.remove();
  };
  window.addEventListener('click', function handler(e) {
    if (e.target === modal) {
      modal.remove();
      window.removeEventListener('click', handler);
    }
  });

  // Handle form submit with backend integration and image upload
  modal.querySelector('#editProfileForm').onsubmit = async (e) => {
    e.preventDefault();
    const newFullname = modal.querySelector('#editFullname').value;
    let newProfilePic = user.profile_picture || "";

    // Upload new profile picture if selected
    if (fileInput.files && fileInput.files[0]) {
      const imageValidation = validateSingleImageFile(fileInput.files[0], {
        label: PROFILE_IMAGE_LABEL,
        maxSizeBytes: DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES,
      });
      if (!imageValidation.isValid) {
        showToast(imageValidation.errorMessage, 'error');
        return;
      }

      const imageData = new FormData();
      imageData.append('file', fileInput.files[0]);

      try {
        const uploadResponse = await api.post('/bini/cloudinary/upload', imageData);
        const uploadResult = uploadResponse.data;
        newProfilePic = uploadResult.url;
      } catch (err) {
        showToast('Failed to upload image: ' + err.message, 'error');
        return;
      }
    } else if (removePhotoRequested) {
      newProfilePic = "";
    } else {
      // No new image selected, keep existing
      newProfilePic = user.profile_picture || "";
    }

    try {
      await api.put('/bini/users/profile', {
          fullname: newFullname,
          profile_picture: newProfilePic
      });

      const resolvedUserId = user?.user_id || user?.id || user?.userId || user?.uid || null;
      if (resolvedUserId) {
        document.querySelectorAll('.post-card').forEach((card) => {
          const ownerId = String(
            card?.dataset?.ownerId ||
            card?.getAttribute?.('data-owner-id') ||
            card?.querySelector?.('.profile-link')?.getAttribute?.('data-user-id') ||
            ''
          ).trim();
          if (ownerId && String(ownerId) === String(resolvedUserId)) {
            const nameEl = card.querySelector('.post-fullname');
            if (nameEl) nameEl.textContent = newFullname || 'You';
            const imgEl = card.querySelector('img.profile-picture, img.profile-picture1, .profile-link img');
            if (imgEl && newProfilePic) imgEl.src = newProfilePic;
          }
        });
      }

      // Update UI via callback
      if (typeof onUpdate === 'function') {
        onUpdate(newFullname, newProfilePic);
      }
      modal.remove();
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast("Error updating profile: " + error.message, 'error');
    }
  };
}
