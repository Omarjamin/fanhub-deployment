import '../../../styles/Admin_styles/EditUserModal.css';

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
              <input type="text" id="editUserName" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label for="editUserEmail">Email</label>
              <input type="email" id="editUserEmail" class="form-control" required>
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
              <textarea id="editUserBio" class="form-control" rows="3"></textarea>
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
    this.element.querySelector(".modal-close")?.addEventListener("click", () => {
      closeModal("editUserModal");
    });

    this.element.querySelector("#cancelEditUser")?.addEventListener("click", () => {
      closeModal("editUserModal");
    });

    this.element.querySelector("#editUserForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("[EditUserModal] Saving changes...");
      closeModal("editUserModal");
    });
    
    const fileInput = this.element.querySelector("#editUserAvatar");
    const fileNameSpan = this.element.querySelector("#avatarFileName");
    const previewImg = this.element.querySelector("#avatarPreviewImg");

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        fileNameSpan.textContent = "No file chosen";
        previewImg.src = "/placeholder.svg";
      }
    });
  }
}
