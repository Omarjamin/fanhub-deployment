import '../../../styles/bini_styles/EditProfileModal.css';
import api from '../../../services/bini_services/api.js';
import { showToast } from '../../../utils/toast.js';

export default function showEditProfileModal(user, token, onUpdate) {
  const existing = document.getElementById('editProfileModal');
  if (existing) existing.remove();

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
               src="${user.profile_picture || ''}" 
               class="profile-picture-preview" 
               alt="Profile preview">
          
          <div class="file-upload-wrapper">
            <label for="editProfilePicFile" class="file-upload-label">
              Choose Photo
            </label>
            <input type="file" 
                   id="editProfilePicFile" 
                   class="file-upload-input" 
                   accept="image/*">
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
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  });

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
    } else {
      // No new image selected, keep existing
      newProfilePic = user.profile_picture || "";
    }

    try {
      await api.put('/bini/users/profile', {
          fullname: newFullname,
          profile_picture: newProfilePic
      });

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
