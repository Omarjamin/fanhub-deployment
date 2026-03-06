import { fetchProfileData } from "../../../services/bini_services/user/fetchprofiledata.js";
import { repost } from "../../../services/bini_services/post/repost.js";
import createCommentModal from "../post/comment_modal.js";
import showEditProfileModal from "./edit-profile-modal.js"; // Import modal
import api from "../../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";
import { formatUserTimestamp } from "../../../utils/user-time.js";

const DEFAULT_PROFILE_IMAGE = "/circle-user.png";

function resolveCommunityBasePath(communityType = "") {
  const normalized = String(communityType || "").trim().toLowerCase();
  if (normalized) {
    return `/fanhub/community-platform/${encodeURIComponent(normalized)}`;
  }
  return "/bini";
}

export default async function ProfileInfo(root, data = {}) {
  const activeCommunityType = String(
    data?.community_type || data?.communityType || data?.communityData?.community_type || ""
  ).trim().toLowerCase();
  if (activeCommunityType) {
    setActiveSiteSlug(activeCommunityType);
  }

  root.innerHTML = `
    <div class="profile-container">
      <div class="profile-info">
        <img src="${DEFAULT_PROFILE_IMAGE}" alt="Profile Picture" class="profile-picture1" id="profilePicture" onerror="this.src='${DEFAULT_PROFILE_IMAGE}';">
        <div class="profile-details">
        
          <h2 id="fullname" style="font-family: 'Paytone One', sans-serif;">Loading...</h2>
          <button id="editProfileBtn" class="btn-editbutton">Edit Profile</button>
        </div>
      </div>
      <div class="nav-container">
        <button class="profile-nav-item" data-tab="threads">Bloomies</button>
        <button class="profile-nav-item" data-tab="reposts">Reposts</button>
      </div>
      <div class="feed"></div>
    </div>
  `;

  const activeSite = getActiveSiteSlug(activeCommunityType) || activeCommunityType || "bini";
  const token = getSessionToken(activeSite);
  let currentUser = null;

  if (!token) {
    alert("Please login first.");
    return;
  }

  const profilePicture = root.querySelector("#profilePicture");
  const fullname = root.querySelector("#fullname");
  const editBtn = root.querySelector("#editProfileBtn");

  // Bind edit action early so it still works even if another part of the page fails.
  if (editBtn) {
    editBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if (!currentUser) {
          const fetched = await fetchProfileData(activeCommunityType);
          currentUser = fetched?.user || fetched;
        }
        if (!currentUser) {
          alert("Profile data could not be fetched");
          return;
        }
        showEditProfileModal(currentUser, token, (newFullname, newProfilePic) => {
          currentUser = {
            ...currentUser,
            fullname: newFullname,
            profile_picture: newProfilePic,
          };
          if (fullname) fullname.textContent = newFullname;
          if (profilePicture) {
            profilePicture.src = newProfilePic || DEFAULT_PROFILE_IMAGE;
          }
        });
      } catch (error) {
        alert("Error opening edit profile modal: " + (error?.message || error));
      }
    });
  }

  try {
    const fetched = await fetchProfileData(activeCommunityType);
    const user = fetched?.user || fetched;
    currentUser = user;
    if (user) {
      profilePicture.src =
        user.profile_picture || DEFAULT_PROFILE_IMAGE;
      fullname.textContent = user.fullname || "Anonymous";
      const userId = user.user_id;
      renderPosts("threads", userId, token, root.querySelector(".feed"), user);

      const profileNavItems = root.querySelectorAll(".profile-nav-item");
      profileNavItems.forEach((item) => {
        item.addEventListener("click", () => {
          profileNavItems.forEach((navItem) =>
            navItem.classList.remove("active"),
          );
          item.classList.add("active");
	          renderPosts(
	            item.dataset.tab,
	            userId,
	            token,
	            root.querySelector(".feed"),
	            user,
	          );
        });
      });
    } else {
      alert("Profile data could not be fetched");
    }
  } catch (error) {
    alert("Error fetching profile data: " + error.message);
  }
}
// POSTS/REPOSTS RENDERING
async function renderPosts(tab, userId, token, feed, ownerUser = null) {
  feed.innerHTML = "";

  if (!userId) {
    alert("User ID not found.");
    return;
  }

  try {
    let posts = [];

    if (tab === "threads") {
      posts = await fetchUserPosts(userId, token);
    } else if (tab === "reposts") {
      posts = await fetchUserReposts(token);
    }

    if (posts.length === 0) {
      feed.innerHTML = "<p>No posts available.</p>";
      return;
    }

    const likeStatusPromises = posts.map((post) =>
      fetchIsLikedStatus(post.post_id, userId, token),
    );
    const likeStatuses = await Promise.all(likeStatusPromises);
    const likecountPromises = posts.map((post) =>
      fetchLikedCounts(post.post_id, userId, token),
    );
    const countlike = await Promise.all(likecountPromises);

	    posts.forEach((post, index) => {
	      const postCreationTime = formatDate(post.created_at);
	      const isLiked = likeStatuses[index];
	      const likeCount = countlike[index];
	      const postUserId = post.user_id || ownerUser?.user_id || userId;
	      const postFullname = post.fullname || ownerUser?.fullname || "You";
	      const postProfilePic = post.profile_picture || ownerUser?.profile_picture || DEFAULT_PROFILE_IMAGE;

	      const postContent = `
	        <div class="post-card" style="position:relative;">
	          <div class="post-meta">
              <a href="#" class="profile-link" data-user-id="${postUserId}" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;">
                <img src="${postProfilePic}" alt="${postFullname}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'">
                <span style="font-weight:600;">${postFullname}</span>
              </a>
	            <span class="post-time">${postCreationTime}</span>

          </div>
          <div class="post-content">${post.content || "No content available"}</div>
          <div class="post-tags">${post.tags ? post.tags.join(", ") : "No tags available"}</div>
          ${post.img_url ? `<img src="${post.img_url}" alt="Post Image" class="post-image" />` : ""}
	          <div class="post-actions">
	            <button class="post-action like-button ${isLiked ? "liked" : ""}" data-post-id="${post.post_id}" data-like-type="post">
	                <span class="material-icons ${isLiked ? "liked" : ""}">${isLiked ? "favorite" : "favorite_border"}</span>
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
      `;
      feed.innerHTML += postContent;
    });

    // Like button event
    feed.querySelectorAll(".like-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const postId = button.getAttribute("data-post-id");
        const likeType = button.getAttribute("data-like-type");
        try {
	          const updatedLikeData = await toggleLike(postId, likeType);
	          const likeCountElement = button.querySelector(".like-count");
	          const likeIcon = button.querySelector(".material-icons");
	          likeCountElement.textContent = updatedLikeData.likes;
	          likeIcon.classList.toggle("liked", updatedLikeData.isLiked);
	          likeIcon.textContent = updatedLikeData.isLiked ? "favorite" : "favorite_border";
	          button.classList.toggle("liked", updatedLikeData.isLiked);
        } catch (error) {
          alert("Error updating like: " + error.message);
        }
      });
    });

      feed.querySelectorAll(".profile-link").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const selectedId = link.getAttribute("data-user-id");
          if (!selectedId) return;
          const activeCommunityType = String(
            getActiveSiteSlug() ||
            sessionStorage.getItem("community_type") ||
            "",
          ).trim().toLowerCase();
          const basePath = resolveCommunityBasePath(activeCommunityType);
          if (String(selectedId) === String(userId)) {
            window.history.pushState({}, "", `${basePath}/profile`);
            window.dispatchEvent(new Event("popstate"));
            return;
          }
          sessionStorage.setItem("selectedUserId", String(selectedId));
          sessionStorage.setItem("selectedUserId", String(selectedId));
          window.history.pushState(
            {},
            "",
            `${basePath}/others-profile?userId=${encodeURIComponent(String(selectedId))}`,
          );
          window.dispatchEvent(new Event("popstate"));
        });
      });
	  } catch (error) {
    alert("Error loading posts: " + error.message);
    feed.innerHTML = "<p>Error loading posts.</p>";
  }

  // Repost button event
  feed.querySelectorAll(".repostbtn").forEach((button) => {
    button.addEventListener("click", async () => {
      const postId = button.getAttribute("data-post-id");
      try {
        await repost(postId, token);
      } catch (error) {
        console.error("Repost failed:", error);
      }
    });
  });

  // Comment button event
  feed.querySelectorAll(".comment-button").forEach((button) => {
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

function formatDate(timestamp) {
  return formatUserTimestamp(timestamp);
}
// Fetch user posts
async function fetchUserPosts() {
  try {
    const res = await api.get("/bini/posts/mypost");
 
    return res.data;
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || "Failed to fetch posts";

    alert("Error fetching posts: " + message);
    return [];
  }
}
// Fetch user reposts
export async function fetchUserReposts() {
  try {
    const res = await api.get("/bini/posts/repost");
    return res.data || [];
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch reposts";
    alert("Error fetching reposts: " + message);
    return [];
  }
}
// Toggle like function
export async function toggleLike(postId, likeType = "post", commentId = null) {
  try {
    const url = `/bini/likes/toggle/${likeType}/${postId}${commentId ? `/${commentId}` : ""}`;
    const res = await api.post(url);
    return res.data;
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || "Failed to toggle like";
    alert("Error toggling like: " + message);
    throw new Error(message);
  }
}
// Fetch like status
export async function fetchIsLikedStatus(postId) {
  try {
    const res = await api.get(`/bini/likes/check/post/${postId}`);
    return res.data?.isLiked || false;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to check like status";
    alert("Error checking like status: " + message);
    return false;
  }
}

// Fetch like counts
export async function fetchLikedCounts(postId) {
  try {
    const res = await api.get(`/bini/likes/count/post/${postId}`);
    return res.data?.likeCount || 0;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch like count";
    alert("Error fetching like count: " + message);
    return 0;
  }
}

// Delete post function
export async function deletePost(postId) {
  try {
    const res = await api.delete(`/bini/posts/${postId}`);
    return res.data;
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || "Failed to delete post";
    alert("Error deleting post: " + message);
    throw new Error(message);
  }
}


