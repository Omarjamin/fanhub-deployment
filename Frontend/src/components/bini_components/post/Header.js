import api from "../../../services/bini_services/api.js";
import { fetchProfileData } from "../../../services/bini_services/user/fetchprofiledata.js";
import { getActiveSiteSlug, getSessionToken } from "../../../lib/site-context.js";
import { showToast } from "../../../utils/toast.js";
import CreatePostModal from "./create-post-modal.js";
import setupThreadsFab from "../threads-fab.js";
import { isTemplatePreviewMode } from "../../../lib/template-preview.js";
import {
  resolveCommunitySubmissionError,
  sanitizeCommunityText,
} from "../../../utils/community-text.js";

const DEFAULT_PROFILE_IMAGE = "/circle-user.png";
const POST_TEXT_MAX_LENGTH = 1000;

export default async function Header(root, data = {}) {
  if (isTemplatePreviewMode(data)) {
    const previewSite = data?.siteData || {};
    const previewMember = Array.isArray(previewSite?.members) ? previewSite.members[0] : null;
    const previewAvatar =
      previewMember?.image ||
      previewMember?.image_profile ||
      previewSite?.logo ||
      previewSite?.logo_url ||
      "/circle-user.png";
    const previewLabel = String(
      previewSite?.site_name ||
      previewSite?.domain ||
      "Community preview",
    ).trim();

    root.innerHTML = `
      <div class="whats-new-bar">
        <div style="padding:0 4px 12px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
          Live homepage preview for ${previewLabel}
        </div>
        <form id="create-post-form">
          <div class="post-input-container">
            <img src="${previewAvatar}" alt="Preview profile" class="profile-pic" onerror="this.src='/circle-user.png';"/>
            <textarea
              id="content"
              name="content"
              placeholder="Post composer preview only"
              class="post-textarea"
              rows="1"
              readonly
              disabled
            ></textarea>
            <label for="image_file" class="image-icon" title="Preview only"></label>
            <input
              type="file"
              id="image_file"
              name="image_file"
              accept="image/*"
              style="display:none"
              disabled
            />
            <button type="button" id="submit-post" class="btn-primary" disabled>
              Preview Only
            </button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  let profilePicUrl = "";
  let currentUser = null;

  const token = getSessionToken(getActiveSiteSlug());
  if (token) {
    try {
      const user = await fetchProfileData();
      if (user) {
        if (user.profile_picture) profilePicUrl = user.profile_picture;
        currentUser = {
          fullname: user.fullname,
          profile_picture: user.profile_picture,
        };
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  }

  root.innerHTML = `
  <div class="whats-new-bar">
    <form id="create-post-form">
      <!-- ROW 1: Profile Pic → Textarea → Icon → Button -->
      <div class="post-input-container">
        <!-- Profile Picture -->
        <img src="${profilePicUrl || DEFAULT_PROFILE_IMAGE}" alt="Profile" class="profile-pic" onerror="this.src='${DEFAULT_PROFILE_IMAGE}';"/>
        
        <!-- Text Area -->
        <textarea
          id="content"
          name="content"
          placeholder="What's new?"
          required
          class="post-textarea"
          rows="1"
          maxlength="${POST_TEXT_MAX_LENGTH}"
        ></textarea>
        
        <!-- Image Icon -->
        <label for="image_file" class="image-icon" title="Add Photo">
          <!-- Icon added via CSS -->
        </label>
        <input
          type="file"
          id="image_file"
          name="image_file"
          accept="image/*"
          style="display:none"
        />
        
        <!-- Post Button -->
        <button type="submit" id="submit-post" class="btn-primary">
          Post
        </button>
      </div>
      
      <!-- ROW 2: Image Preview Container (BELOW everything) -->
      <div class="image-preview-container" id="image-preview-container">
        <!-- Images will be dynamically added here -->
        <!-- Example structure for preview images:
        <div class="preview-image-wrapper">
          <img src="preview-url.jpg" class="preview-image" alt="Preview">
          <button class="remove-preview" type="button">×</button>
        </div>
        -->
      </div>
    </form>
  </div>
`;

  const form = document.getElementById("create-post-form");
  const textarea = document.getElementById("content");
  const submitButton = document.getElementById("submit-post");
  const imageInput = document.getElementById("image_file");
  const imagePreviewContainer = document.getElementById(
    "image-preview-container",
  );
  const imageLabel = document.querySelector('label[for="image_file"]');
  const whatsNewBar = document.querySelector(".whats-new-bar");

  const modalApi = CreatePostModal(document.body);
  const openCreatePostModal = () => {
    modalApi.open({
      profilePicUrl,
      displayName: currentUser?.fullname || "You",
    });
  };

  textarea.readOnly = true;
  textarea.setAttribute("aria-haspopup", "dialog");
  imageInput.disabled = true;

  // Floating Action Button + Bottom Sheet threads toggle
  setupThreadsFab();

  // Autosize textarea while typing
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });

  // Handle image selection and show preview
  imageInput.addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file (JPEG, PNG, GIF, etc.)");
        this.value = ""; // Clear the input
        return;
      }

      // Validate file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        this.value = ""; // Clear the input
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        // Use the existing image preview container
        imagePreviewContainer.innerHTML = "";
        imagePreviewContainer.classList.add("active");

        // Create image preview item
        const previewItem = document.createElement("div");
        previewItem.className = "image-preview-item";

        // Create image element
        const img = document.createElement("img");
        img.src = e.target.result;
        img.alt = "Selected image";

        // Create remove button
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "image-preview-remove";
        removeBtn.innerHTML = "×";
        removeBtn.title = "Remove image";

        removeBtn.addEventListener("click", function () {
          imagePreviewContainer.innerHTML = "";
          imagePreviewContainer.classList.remove("active");
          imageInput.value = ""; // Clear the file input
        });

        // Add elements to preview item
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);

        // Add to container
        imagePreviewContainer.appendChild(previewItem);
      };

      reader.readAsDataURL(file);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    openCreatePostModal();
    return;

    if (!token) {
      alert("Please login first.");
      return;
    }

    const content = sanitizeCommunityText(textarea.value, {
      maxLength: POST_TEXT_MAX_LENGTH,
    });
    const imageFile = imageInput.files[0];

    textarea.value = content;

    if (!content && !imageFile) {
      alert("Please enter content or select an image.");
      return;
    }

    submitButton.disabled = true;

    let imageUrl = null;

    if (imageFile) {
      try {
        const imageData = new FormData();
        imageData.append("file", imageFile);

        const uploadResponse = await api.post('/bini/cloudinary/upload', imageData);
        const uploadResult = uploadResponse.data;
        imageUrl = uploadResult.url;
      } catch (error) {
        alert("Error uploading image: " + error.message);
        submitButton.disabled = false;
        return;
      }
    }

    try {
      const postData = { content, img_url: imageUrl };

      const response = await api.post('/bini/posts/create', postData);
      const result = response.data;

      // Dispatch event so homepage feed can prepend the new post in real time (no reload)
      const newPostPayload = {
        ...result,
        fullname: currentUser?.fullname || "You",
        profile_picture: currentUser?.profile_picture || profilePicUrl,
      };

      window.dispatchEvent(
        new CustomEvent("new-post-created", {
          detail: { post: newPostPayload },
        }),
      );

      showToast("Post created successfully!", "success");

      form.reset();
      textarea.style.height = "auto";

      // Remove image preview if exists
      const previewContainer = document.querySelector(
        ".image-preview-container",
      );
      if (previewContainer) {
        previewContainer.remove();
      }

      submitButton.disabled = false;
    } catch (error) {
      showToast(resolveCommunitySubmissionError(error, "Error creating post. Please try again."), "error");
      submitButton.disabled = false;
    }
  });

  textarea.addEventListener("click", (event) => {
    event.preventDefault();
    openCreatePostModal();
    textarea.blur();
  });

  textarea.addEventListener("focus", (event) => {
    event.preventDefault();
    openCreatePostModal();
    textarea.blur();
  });

  if (imageLabel) {
    imageLabel.addEventListener("click", (event) => {
      event.preventDefault();
      openCreatePostModal();
    });
  }

  submitButton.addEventListener("click", (event) => {
    event.preventDefault();
    openCreatePostModal();
  });

  if (whatsNewBar) {
    whatsNewBar.addEventListener("click", (event) => {
      if (event.target.closest("textarea, button, input, label")) return;
      event.preventDefault();
      openCreatePostModal();
    });
  }
}

