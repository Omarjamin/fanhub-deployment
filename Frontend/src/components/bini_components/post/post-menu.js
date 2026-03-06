import api from "../../../services/bini_services/api.js";
import { reportPost } from "../../../services/bini_services/post/post-interactions.js";
import { showToast } from "../../../utils/toast.js";

let outsideHandlerBound = false;

function ensureOutsideHandler() {
  if (outsideHandlerBound) return;
  document.addEventListener("click", () => {
    document.querySelectorAll(".post-report-dropdown.open").forEach((dropdown) => {
      dropdown.classList.remove("open");
    });
  });
  outsideHandlerBound = true;
}

export function buildPostMenuHtml({ postId, isOwnPost }) {
  if (!postId) return "";

  if (isOwnPost) {
    return `<div class="post-menu-container">
      <button class="post-menu-btn" data-post-id="${postId}" aria-label="Post options" title="Post options">&#8942;</button>
      <div class="post-report-dropdown">
        <button class="report-post-option edit-post-option" data-post-id="${postId}">Edit post</button>
        <button class="report-post-option delete-post-option" data-post-id="${postId}">Delete post</button>
      </div>
    </div>`;
  }

  return `<div class="post-menu-container">
    <button class="post-menu-btn" data-post-id="${postId}" aria-label="Post options" title="Post options">&#8942;</button>
    <div class="post-report-dropdown">
      <button class="report-post-option" data-post-id="${postId}" data-reason="spam">Report spam</button>
      <button class="report-post-option" data-post-id="${postId}" data-reason="harassment">Report harassment</button>
      <button class="report-post-option" data-post-id="${postId}" data-reason="misleading information">Report misleading information</button>
      <button class="report-post-option" data-post-id="${postId}" data-reason="inappropriate content">Report inappropriate content</button>
    </div>
  </div>`;
}

function ensureEditModal() {
  let modal = document.getElementById("edit-post-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "edit-post-modal";
  modal.className = "search-post-modal";
  modal.innerHTML = `
    <div class="search-post-modal-dialog">
      <div class="search-post-modal-header">
        <h3 class="search-post-modal-title">Edit Post</h3>
        <button class="search-post-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="search-post-modal-body">
        <form class="edit-post-form" style="display:flex;flex-direction:column;gap:12px;">
          <textarea name="content" rows="5" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:12px;resize:vertical;"></textarea>
          <input type="file" name="image_file" accept="image/*" />
          <img class="edit-post-preview" alt="Post image preview" style="display:none;width:100%;max-height:280px;object-fit:cover;border-radius:12px;" />
          <button type="button" class="edit-post-remove-image report-post-option" style="display:none;">Remove image</button>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="report-post-option edit-post-cancel">Cancel</button>
            <button type="submit" class="report-post-option" style="background:#111827;color:#fff;">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector(".search-post-modal-close")?.addEventListener("click", () => {
    modal.classList.remove("open");
  });
  modal.querySelector(".edit-post-cancel")?.addEventListener("click", () => {
    modal.classList.remove("open");
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("open");
    }
  });

  return modal;
}

async function openEditPostModal(post, onSaved) {
  const modal = ensureEditModal();
  const form = modal.querySelector(".edit-post-form");
  const textarea = form.querySelector('textarea[name="content"]');
  const fileInput = form.querySelector('input[name="image_file"]');
  const preview = form.querySelector(".edit-post-preview");
  const removeBtn = form.querySelector(".edit-post-remove-image");

  let removedImage = false;
  let currentImage = String(post?.img_url || "").trim();

  textarea.value = String(post?.content || "");
  fileInput.value = "";
  preview.src = currentImage || "";
  preview.style.display = currentImage ? "block" : "none";
  removeBtn.style.display = currentImage ? "inline-flex" : "none";

  removeBtn.onclick = () => {
    removedImage = true;
    currentImage = "";
    preview.src = "";
    preview.style.display = "none";
    removeBtn.style.display = "none";
    fileInput.value = "";
  };

  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    removedImage = false;
    currentImage = "";
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    removeBtn.style.display = "inline-flex";
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    try {
      let imageUrl = removedImage ? null : post?.img_url || null;
      const imageFile = fileInput.files?.[0];

      if (imageFile) {
        const imageData = new FormData();
        imageData.append("file", imageFile);
        const uploadResponse = await api.post("/bini/cloudinary/upload", imageData);
        imageUrl = uploadResponse?.data?.url || null;
      } else if (removedImage) {
        imageUrl = null;
      }

      const payload = {
        content: textarea.value.trim(),
        img_url: imageUrl,
      };

      await api.patch(`/bini/posts/${post.post_id}`, payload);
      modal.classList.remove("open");
      showToast("Post updated successfully.", "success");
      if (typeof onSaved === "function") {
        onSaved({
          ...post,
          content: payload.content,
          img_url: imageUrl,
        });
      }
    } catch (error) {
      showToast(error?.response?.data?.error || error?.message || "Failed to update post.", "error");
    }
  };

  modal.classList.add("open");
}

export function bindPostMenuActions(root, options = {}) {
  const {
    resolvePost = () => null,
    onPostUpdated = () => {},
    onPostDeleted = () => {},
    communityType = "",
  } = options;

  ensureOutsideHandler();

  root.querySelectorAll(".post-menu-btn").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const dropdown = button.closest(".post-menu-container")?.querySelector(".post-report-dropdown");
      if (!dropdown) return;
      document.querySelectorAll(".post-report-dropdown.open").forEach((openDropdown) => {
        if (openDropdown !== dropdown) openDropdown.classList.remove("open");
      });
      dropdown.classList.toggle("open");
    });
  });

  root.querySelectorAll(".edit-post-option").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const postId = button.getAttribute("data-post-id");
      const post = await resolvePost(postId);
      button.closest(".post-report-dropdown")?.classList.remove("open");
      if (!post) {
        showToast("Post not found.", "error");
        return;
      }
      await openEditPostModal(post, (updatedPost) => onPostUpdated(postId, updatedPost));
    });
  });

  root.querySelectorAll(".delete-post-option").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const postId = button.getAttribute("data-post-id");
      button.closest(".post-report-dropdown")?.classList.remove("open");
      const confirmed = window.confirm(
        "Delete this post? This will remove the post and its comments. Reposts will remain.",
      );
      if (!confirmed) return;

      try {
        await api.delete(`/bini/posts/${postId}`);
        showToast("Post deleted successfully.", "success");
        onPostDeleted(postId);
      } catch (error) {
        showToast(error?.response?.data?.error || error?.message || "Failed to delete post.", "error");
      }
    });
  });

  root.querySelectorAll('.report-post-option[data-reason]').forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const postId = button.getAttribute("data-post-id");
      const reason = button.getAttribute("data-reason");

      try {
        await reportPost(postId, reason, communityType);
        button.closest(".post-report-dropdown")?.classList.remove("open");
        showToast("Post reported successfully.", "success");
      } catch (error) {
        showToast(error?.message || "Failed to report post.", "error");
      }
    });
  });
}
