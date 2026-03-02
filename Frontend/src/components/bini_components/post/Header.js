import api from "../../../services/bini_services/api.js";
import { fetchProfileData } from "../../../services/bini_services/user/fetchprofiledata.js";
import { getActiveSiteSlug, getSessionToken } from "../../../lib/site-context.js";

export default async function Header(root) {
  let profilePicUrl = "";
  let currentUser = null;

  const token = getSessionToken(getActiveSiteSlug() || "bini");
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
        <img src="${profilePicUrl}" alt="Profile" class="profile-pic"/>
        
        <!-- Text Area -->
        <textarea
          id="content"
          name="content"
          placeholder="What's new?"
          required
          class="post-textarea"
          rows="1"
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

  // Toggle events sidebar functionality
  const whatsNewBar = document.querySelector(".whats-new-bar");
  
  // Use event delegation to handle hamburger clicks
  document.addEventListener("click", function (event) {
    // Get current sidebar state
    const homepageRight = document.querySelector(".homepage-right");
    if (!homepageRight) return; // Exit if sidebar doesn't exist yet
    
    const isVisible = homepageRight.classList.contains("events-visible");
    
    // Check if click is on the hamburger menu (fixed positioned)
    const clickX = event.clientX;
    const clickY = event.clientY;

    // Calculate hamburger position based on sidebar state
    const sidebarWidth = isVisible
      ? Math.min(320, window.innerWidth * 0.8)
      : 0;

    // Account for both transform (-320px) and margin (-6rem = -96px) when sidebar is visible
    // Total offset = 320px (transform) + 96px (margin) = 416px
    // This now applies to ALL screen sizes since CSS is no longer mobile-specific
    const totalOffset = isVisible ? -416 : 0; // Combined transform and margin offset

    // Hamburger click area - updated to match new top position (40px) and include both offsets
    // Note: Using 40px top position as it was set in mobile CSS, but this may need adjustment for desktop
    const hamburgerArea = {
      left: window.innerWidth - 80 - sidebarWidth + totalOffset, // Dynamic left boundary with total offset
      right: window.innerWidth - 10 - sidebarWidth + totalOffset, // Dynamic right boundary with total offset
      top: 40, // Top position from CSS
      bottom: 80, // Bottom position (40px + 40px height)
    };

    // Check if click is within the hamburger area
    if (
      clickX >= hamburgerArea.left &&
      clickX <= hamburgerArea.right &&
      clickY >= hamburgerArea.top &&
      clickY <= hamburgerArea.bottom
    ) {
      event.preventDefault();
      event.stopPropagation();

      // Toggle the events-visible class
      if (isVisible) {
        // Close sidebar
        homepageRight.classList.remove("events-visible");
        // Slide hamburger back to original position
        document.documentElement.style.setProperty(
          "--hamburger-translate",
          "0px",
        );
      } else {
        // Open sidebar
        homepageRight.classList.add("events-visible");
        // Slide hamburger to the left with the sidebar
        const newSidebarWidth = Math.min(320, window.innerWidth * 0.8); // Max 320px or 80% of viewport
        document.documentElement.style.setProperty(
          "--hamburger-translate",
          `-${newSidebarWidth}px`,
        );
      }

      // Optional: Add visual feedback
      if (!isVisible) {
        console.log("Events sidebar shown");
      } else {
        console.log("Events sidebar hidden");
      }
    }
  });

  // Close button: close events panel when .events-panel-close is clicked
  document.addEventListener("click", function (event) {
    const closeBtn = event.target.closest(".events-panel-close");
    const homepageRight = document.querySelector(".homepage-right");
    
    if (closeBtn && homepageRight && homepageRight.classList.contains("events-visible")) {
      homepageRight.classList.remove("events-visible");
      document.documentElement.style.setProperty(
        "--hamburger-translate",
        "0px",
      );
      return;
    }
  });

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

    if (!token) {
      alert("Please login first.");
      return;
    }

    const content = textarea.value.trim();
    const imageFile = imageInput.files[0];

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

      alert("Post created successfully!");

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
      const message =
        error.response?.data?.message ||
        "Error creating post. Please try again.";

      alert(message);
      submitButton.disabled = false;
    }
  });
}


