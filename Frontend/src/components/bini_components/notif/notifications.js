import { fetchNotifications } from "../../../services/bini_services/notif/fetchnotif.js";
import { fetchUserById } from "../../../services/bini_services/user/fetchUserById.js";
import { fetchPostById } from "../../../services/bini_services/post/fetchPostById.js";
import { repost } from "../../../services/bini_services/post/repost.js";
import createCommentModal from "../post/comment_modal.js";
import { renderThreadsSidebar } from "../threadsSidebar.js";
import api from "../../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";
import { formatUserTimestamp } from "../../../utils/user-time.js";
import { showToast } from "../../../utils/toast.js";
import { escapeHtml, sanitizeCommunityText } from "../../../utils/community-text.js";

const DEFAULT_PROFILE_IMAGE = "/circle-user.png";

function sanitizePostTags(tags = []) {
  return (Array.isArray(tags) ? tags : (tags ? [].concat(tags) : []))
    .map((tag) => sanitizeCommunityText(tag, { maxLength: 80 }))
    .filter(Boolean);
}

function getSafePostContent(post = {}) {
  const tags = sanitizePostTags(post.tags);
  const text = sanitizeCommunityText(post.content, { maxLength: 1000 });
  return text || (tags.length ? tags.join(" ") : "No content available");
}

function resolveCommunityType(data = {}) {
  const fromData = String(data?.community_type || data?.communityType || "").trim().toLowerCase();
  if (fromData) return fromData;

  const fromStorage = String(
    sessionStorage.getItem("community_type") || "",
  ).trim().toLowerCase();
  if (fromStorage && fromStorage !== "community-platform") return fromStorage;

  try {
    const parts = String(window?.location?.pathname || "").split("/").filter(Boolean);
    if (parts[0] === "fanhub" && parts[1] === "community-platform" && parts[2]) {
      return String(parts[2]).toLowerCase();
    }
    if (parts[0] === "fanhub" && parts[1] && parts[1] !== "community-platform") {
      return String(parts[1]).toLowerCase();
    }
    if (parts[0] === "bini") return "bini";
  } catch (_) {}

  return "bini";
}

// Format date helper function
function formatDate(timestamp) {
  return formatUserTimestamp(timestamp);
}

function renderNotifActionIcon(type, isActive = false) {
  if (type === "like") {
    return isActive
      ? `
        <svg viewBox="0 0 24 24" class="notif-action-svg notif-action-svg--active" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
        </svg>
      `
      : `
        <svg viewBox="0 0 24 24" class="notif-action-svg" aria-hidden="true">
          <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
  }

  if (type === "comment") {
    return `
      <svg viewBox="0 0 24 24" class="notif-action-svg" aria-hidden="true">
        <path d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" class="notif-action-svg" aria-hidden="true">
      <path d="M8 7h8M8 17h8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
      <path d="m14 4 5 3-5 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      <path d="m10 14-5 3 5 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function getNotificationText(notif, fromUser) {
  const activity = String(notif.activity_type || "").toLowerCase();
  const hasCommentTarget = Boolean(notif.comment_id);

  if (activity.includes("warning")) {
    return "Your account has been reported due to inappropriate actions.";
  }
  if (activity.includes("suspended") || activity.includes("suspend")) {
    return "Your account has been suspended.";
  }
  if (activity.includes("banned") || activity.includes("ban")) {
    return "Your account is being banned.";
  }
  if (activity.includes("follow")) return `<b>${fromUser}</b> followed you.`;
  if (activity.includes("repost")) return `<b>${fromUser}</b> reposted your post.`;
  if (activity.includes("comment")) return `<b>${fromUser}</b> commented on your post.`;
  if (activity.includes("like")) {
    return hasCommentTarget
      ? `<b>${fromUser}</b> liked your comment.`
      : `<b>${fromUser}</b> liked your post.`;
  }

  return "You have a new notification.";
}

export default async function Notifications(root, data = {}) {
  const { html: threadsSidebarHtml, setupClickHandlers } = await renderThreadsSidebar();
  const activeCommunityType = resolveCommunityType(data);
  if (activeCommunityType) {
    setActiveSiteSlug(activeCommunityType);
  }

  root.innerHTML = `
    <div class="notifications-container">
      <div class="notifications-panel"></div>
      <div class="homepage-right">
        ${threadsSidebarHtml}
      </div>
    </div>
  `;

  // Setup thread sidebar click handlers
  const threadsContainer = root.querySelector(".homepage-right");
  if (threadsContainer) {
    setupClickHandlers(threadsContainer);
  }

  const activeSite = getActiveSiteSlug(activeCommunityType) || activeCommunityType || "bini";
  const token = getSessionToken(activeSite);
  if (!token) {
    root.querySelector(".notifications-panel").innerHTML =
      "<p>Please login first.</p>";
    return;
  }

  try {
    const notifs = await fetchNotifications(token, activeCommunityType);
    renderNotifications(
      notifs,
      token,
      root.querySelector(".notifications-panel"),
    );
  } catch (error) {
    root.querySelector(".notifications-panel").innerHTML =
      `<p>Error loading notifications: ${error.message}</p>`;
  }
}
// Render notifications list
async function renderNotifications(notifs, token, panel) {
  panel.innerHTML = `
    <div class="notifications-panel-head">
      <p class="notifications-panel-kicker">Recent Activity</p>
      <h2 class="notifications-panel-title">Your notifications</h2>
    </div>
    <ul class="notif-list" id="notif-list"></ul>
  `;
  const notifList = panel.querySelector("#notif-list");
  const list = Array.isArray(notifs) ? notifs : (Array.isArray(notifs?.notifications) ? notifs.notifications : []);

  if (list.length === 0) {
    notifList.innerHTML = `<li class="notifications-empty">No notifications yet.</li>`;
    return;
  }

  for (const notif of list) {
    let fromUser = "Someone";
    let profilePic = DEFAULT_PROFILE_IMAGE;

    if (notif.source_user_id) {
      try {
        const user = await fetchUserById(notif.source_user_id, token);
        fromUser =
          user.user?.fullname ||
          user.fullname ||
          `User #${notif.source_user_id}`;
        profilePic =
          user.user?.profile_picture ||
          user.profile_picture ||
          DEFAULT_PROFILE_IMAGE;
      } catch (e) {
        fromUser = `User #${notif.source_user_id}`;
      }
    }

    const notifHtml = `
      <li 
        class="notif-item ${(notif.post_id || notif.comment_id) ? "notif-item--actionable" : ""}" 
        ${notif.post_id ? `data-postid="${notif.post_id}"` : ""}
        ${notif.comment_id ? `data-commentid="${notif.comment_id}"` : ""}
      >
        <img src="${profilePic || DEFAULT_PROFILE_IMAGE}" alt="${fromUser}" class="notif-avatar" onerror="this.src='${DEFAULT_PROFILE_IMAGE}';">
        <div class="notif-copy">
          <div class="notif-message">${getNotificationText(notif, fromUser)}</div>
          <div class="notif-time">${formatDate(notif.created_at)}</div>
        </div>
        ${(notif.post_id || notif.comment_id) ? '<span class="notif-arrow material-icons" aria-hidden="true">north_east</span>' : ""}
      </li>
    `;
    notifList.insertAdjacentHTML("beforeend", notifHtml);
  }
  // Click event for notifications with post_id (show modal)
  notifList.querySelectorAll(".notif-item").forEach((li) => {
    li.addEventListener("click", async function () {
      const postId = this.getAttribute("data-postid");
      const commentId = this.getAttribute("data-commentid");
      if (!postId && !commentId) return;
      if (postId) {
        try {
          const post = await fetchPostById(postId, token);
          showPostModal(post, token);
        } catch (err) {
          showToast("Failed to load post.", "error");
        }
      }
    });
  });
}
// Fetch like status
async function fetchIsLikedStatus(postId, token) {
  try {
    const response = await api.get(`/bini/likes/check/post/${postId}`);
    return response.data.isLiked;
  } catch (error) {
    return false;
  }
}
// Fetch like counts
async function fetchLikedcounts(postId, token) {
  try {
    const response = await api.get(`/bini/likes/count/post/${postId}`);
    return response.data.likeCount;
  } catch (error) {
    return 0;
  }
}
// Toggle like function
async function toggleLike(postId, token, likeType = "post", commentId = null) {
  try {
    const url = `/bini/likes/toggle/${likeType}/${postId}${commentId ? `/${commentId}` : ""}`;
    const response = await api.post(url);
    return response.data;
  } catch (error) {
    throw error;
  }
}
// Show post modal
async function showPostModal(post, token) {
  const oldModal = document.querySelector(".notif-post-modal");
  if (oldModal) oldModal.remove();
  // Get like status and count
  const isLiked = await fetchIsLikedStatus(post.post_id, token);
  const likeCount = await fetchLikedcounts(post.post_id, token);

  const modal = document.createElement("div");
  modal.className = "notif-post-modal";

  const tagsHtml =
    post.tags && post.tags.length > 0
      ? `<div class="post-tags">${Array.isArray(post.tags) ? post.tags.join(", ") : post.tags}</div>`
      : "";
  const safeContent = escapeHtml(getSafePostContent(post));
  const safeTags = sanitizePostTags(post.tags);
  const imageHtml = post.img_url
    ? `<img src="${post.img_url}" alt="Post Image" class="post-image notif-post-image" />`
    : "";

  modal.innerHTML = `
    <div class="notif-post-dialog">
      <button class="notif-post-close" id="closeModalBtn" aria-label="Close">&times;</button>
      <div class="post-card notif-post-card">
        <div class="post-meta1 notif-post-meta">
          <a href="#" class="profile-link" data-user-id="${post.user_id}">
            <img src="${post.profile_picture || "/circle-user.png"}" class="profile-picture notif-post-avatar" onerror="this.src='/circle-user.png';">
          </a>
          <a href="#" class="profile-link" data-user-id="${post.user_id}">
            <span class="post-fullname">${post.fullname || "Unknown User"}</span>
          </a>
          <span class="post-time">${formatDate(post.created_at)}</span>
        </div>
        <div class="post-content notif-post-content">${safeContent}</div>
        ${safeTags.length ? `<div class="post-tags">${escapeHtml(safeTags.join(", "))}</div>` : ""}
        ${imageHtml}
        <div class="post-actions notif-post-actions">
          <button class="post-action like-button ${isLiked ? "liked" : ""}" data-post-id="${post.post_id}" data-like-type="post">
            <span class="notif-post-action-icon" aria-hidden="true">${renderNotifActionIcon("like", isLiked)}</span>
            <span class="like-count">${likeCount}</span>
          </button>
          <button class="post-action comment-button" data-post-id="${post.post_id}">
            <span class="notif-post-action-icon" aria-hidden="true">${renderNotifActionIcon("comment")}</span>
          </button>
          <button class="post-action repostbtn" data-post-id="${post.post_id}">
            <span class="notif-post-action-icon" aria-hidden="true">${renderNotifActionIcon("repost")}</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#closeModalBtn").onclick = () => modal.remove();
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });

  // Profile link event
  modal.querySelectorAll(".profile-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const userId = link.getAttribute("data-user-id");
      sessionStorage.setItem("selectedUserId", userId);
      const siteSlug = getActiveSiteSlug() || "bini";
      window.history.pushState({}, "", `/fanhub/community-platform/${encodeURIComponent(siteSlug)}/others-profile?userId=${encodeURIComponent(String(userId || ""))}`);
      window.dispatchEvent(new Event("popstate"));
      modal.remove();
    });
  });

  // Like button event
  modal.querySelectorAll(".like-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const postId = button.getAttribute("data-post-id");
      const likeType = button.getAttribute("data-like-type");
      try {
        const updatedLikeData = await toggleLike(postId, token, likeType);
        const likeCountElement = button.querySelector(".like-count");
        const likeIcon = button.querySelector(".notif-post-action-icon");

        likeCountElement.textContent = updatedLikeData.likes;
        if (likeIcon) {
          likeIcon.innerHTML = renderNotifActionIcon("like", updatedLikeData.isLiked);
        }
        button.classList.toggle("liked", updatedLikeData.isLiked);
      } catch (error) {
        showToast("Error updating like: " + error.message, "error");
      }
    });
  });

  // Repost button event
  modal.querySelectorAll(".repostbtn").forEach((button) => {
    button.addEventListener("click", async () => {
      const postId = button.getAttribute("data-post-id");
      try {
        await repost(postId, token);
      } catch (error) {
      }
    });
  });

  // Comment button event
  modal.querySelectorAll(".comment-button").forEach((button) => {
    button.addEventListener("click", () => {
      const postId = button.getAttribute("data-post-id");
      try {
        createCommentModal(postId);
      } catch (error) {
        showToast("Error opening comments: " + error.message, "error");
      }
    });
  });
}


