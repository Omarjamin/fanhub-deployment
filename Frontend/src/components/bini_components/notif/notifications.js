import { fetchNotifications } from "../../../services/bini_services/notif/fetchnotif.js";
import { fetchUserById } from "../../../services/bini_services/user/fetchUserById.js";
import { fetchPostById } from "../../../services/bini_services/post/fetchPostById.js";
import { repost } from "../../../services/bini_services/post/repost.js";
import createCommentModal from "../post/comment_modal.js";
import { renderThreadsSidebar } from "../threadsSidebar.js";
import api from "../../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";
import { formatUserTimestamp } from "../../../utils/user-time.js";

const DEFAULT_PROFILE_IMAGE = "/circle-user.png";

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
  panel.innerHTML = `<h3></h3><ul style="list-style:none;padding:0;" id="notif-list"></ul>`;
  const notifList = panel.querySelector("#notif-list");
  const list = Array.isArray(notifs) ? notifs : (Array.isArray(notifs?.notifications) ? notifs.notifications : []);

  if (list.length === 0) {
    notifList.innerHTML = "<li>No notifications.</li>";
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
        class="notif-item" 
        style="padding:8px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px;cursor:${(notif.post_id || notif.comment_id) ? "pointer" : "default"};"
        ${notif.post_id ? `data-postid="${notif.post_id}"` : ""}
        ${notif.comment_id ? `data-commentid="${notif.comment_id}"` : ""}
      >
        <img src="${profilePic || DEFAULT_PROFILE_IMAGE}" alt="${fromUser}" style="width:32px;height:32px;border-radius:50%;" onerror="this.src='${DEFAULT_PROFILE_IMAGE}';">
        <span>
        ${getNotificationText(notif, fromUser)}
        <span style="font-size:12px;color:#888;">${formatDate(notif.created_at)}</span>
        </span>
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
          alert("Failed to load post.");
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
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.4)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  const tagsHtml =
    post.tags && post.tags.length > 0
      ? `<div class="post-tags">${Array.isArray(post.tags) ? post.tags.join(", ") : post.tags}</div>`
      : "";
  const imageHtml = post.img_url
    ? `<img src="${post.img_url}" alt="Post Image" class="post-image" style="max-width:100%;margin-top:8px;" />`
    : "";

  modal.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:8px;min-width:320px;max-width:90vw;max-height:80vh;overflow-y:auto;position:relative;">
      <span style="position:absolute;top:8px;right:16px;cursor:pointer;font-size:24px;" id="closeModalBtn">&times;</span>
      <div class="post-card">
        <div class="post-meta1" style="display:flex;align-items:center;gap:12px;">
          <a href="#" class="profile-link" data-user-id="${post.user_id}">
            <img src="${post.profile_picture || "/circle-user.png"}" class="profile-picture" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.src='/circle-user.png';">
          </a>
          <a href="#" class="profile-link" data-user-id="${post.user_id}">
            <span class="post-fullname" style="font-weight:bold;">${post.fullname || "Unknown User"}</span>
          </a>
          <span class="post-time" style="margin-left:auto;font-size:12px;color:#888;">${formatDate(post.created_at)}</span>
        </div>
        <div class="post-content" style="margin:12px 0;">${post.content || "No content available"}</div>
        ${tagsHtml}
        ${imageHtml}
        <div class="post-actions" style="margin-top:16px;display:flex;gap:24px;">
          <button class="post-action like-button ${isLiked ? "liked" : ""}" data-post-id="${post.post_id}" data-like-type="post">
            <span class="material-icons ${isLiked ? "liked" : ""}">favorite_border</span>
            <span class="like-count">${likeCount}</span>
          </button>
          <button class="post-action comment-button" data-post-id="${post.post_id}">
            <span class="material-icons">chat_bubble_outline</span>
          </button>
          <button class="post-action repostbtn" data-post-id="${post.post_id}">
            <span class="material-icons">repeat</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#closeModalBtn").onclick = () => modal.remove();

  // Profile link event
  modal.querySelectorAll(".profile-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const userId = link.getAttribute("data-user-id");
      sessionStorage.setItem("selectedUserId", userId);
      const siteSlug = getActiveSiteSlug() || "bini";
      window.history.pushState({}, "", `/fanhub/community-platform/${encodeURIComponent(siteSlug)}/others-profile`);
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
        const likeIcon = button.querySelector(".material-icons");

        likeCountElement.textContent = updatedLikeData.likes;
        likeIcon.classList.toggle("liked", updatedLikeData.isLiked);
        button.classList.toggle("liked", updatedLikeData.isLiked);
      } catch (error) {
        alert("Error updating like: " + error.message);
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
        alert("Repost failed: " + error.message);
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
        alert("Error opening comments: " + error.message);
      }
    });
  });
}


