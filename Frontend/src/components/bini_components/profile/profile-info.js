import { fetchProfileData } from "../../../services/bini_services/user/fetchprofiledata.js";
import { repost } from "../../../services/bini_services/post/repost.js";
import createCommentModal from "../post/comment_modal.js";
import showEditProfileModal from "./edit-profile-modal.js"; // Import modal
import { buildPostMenuHtml, bindPostMenuActions } from "../post/post-menu.js";
import api from "../../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";
import { formatUserTimestamp } from "../../../utils/user-time.js";
import { showToast } from "../../../utils/toast.js";

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
        
          <h2 id="fullname">Loading...</h2>
          <button id="editProfileBtn" class="btn-editbutton">Edit Profile</button>
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat-item" id="followersCount">
          <span class="stat-count">0</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-item" id="followingCount">
          <span class="stat-count">0</span>
          <span class="stat-label">Following</span>
        </div>
        <div class="stat-item" id="likesCount">
          <span class="stat-count">0</span>
          <span class="stat-label">Likes</span>
        </div>
      </div>
      <div class="nav-container">
        <button class="profile-nav-item active" data-tab="threads">Bloomies</button>
        <button class="profile-nav-item" data-tab="reposts">Reposts</button>
      </div>
      <div class="feed"></div>
    </div>
  `;

  const activeSite = getActiveSiteSlug(activeCommunityType) || activeCommunityType || "bini";
  const token = getSessionToken(activeSite);
  let currentUser = null;

  if (!token) {
    showToast("Please login first.", "error");
    return;
  }

  const profilePicture = root.querySelector("#profilePicture");
  const fullname = root.querySelector("#fullname");
  const editBtn = root.querySelector("#editProfileBtn");
  const followersStat = root.querySelector("#followersCount");
  const followingStat = root.querySelector("#followingCount");
  let followModal = null;

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
          showToast("Profile data could not be fetched", "error");
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
          const feed = root.querySelector(".feed");
          if (feed) {
            feed.querySelectorAll(".post-fullname").forEach((el) => {
              el.textContent = newFullname || "You";
            });
          }
          if (feed && currentUser?.user_id) {
            renderPosts("threads", currentUser.user_id, token, feed, currentUser).catch(() => {});
          }
        });
      } catch (error) {
        showToast("Error opening edit profile modal: " + (error?.message || error), "error");
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
      loadProfileStats(userId, root).catch((err) => {
        console.error("Stats loading failed, but continuing:", err);
      });

      const ensureFollowModal = () => {
        if (followModal) return followModal;
        followModal = document.createElement("div");
        followModal.className = "profile-follow-modal";
        followModal.innerHTML = `
          <div class="profile-follow-dialog" role="dialog" aria-modal="true">
            <div class="profile-follow-header">
              <h3 class="profile-follow-title">Followers</h3>
              <button type="button" class="profile-follow-close" aria-label="Close">&times;</button>
            </div>
            <div class="profile-follow-body">
              <div class="profile-follow-list"></div>
            </div>
          </div>
        `;
        document.body.appendChild(followModal);
        followModal.querySelector(".profile-follow-close")?.addEventListener("click", () => {
          followModal.classList.remove("open");
        });
        followModal.addEventListener("click", (event) => {
          if (event.target === followModal) {
            followModal.classList.remove("open");
          }
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && followModal.classList.contains("open")) {
            followModal.classList.remove("open");
          }
        });
        return followModal;
      };

      const normalizeList = (payload, key) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.[key])) return payload[key];
        if (Array.isArray(payload?.data)) return payload.data;
        return [];
      };

      const renderFollowList = (items, title) => {
        const modal = ensureFollowModal();
        const titleEl = modal.querySelector(".profile-follow-title");
        const listEl = modal.querySelector(".profile-follow-list");
        if (titleEl) titleEl.textContent = title;
        if (listEl) {
          if (!items.length) {
            listEl.innerHTML = `<p class="profile-follow-empty">No ${title.toLowerCase()} yet.</p>`;
          } else {
            listEl.innerHTML = items
              .map((item) => {
                const name = item.fullname || item.username || "User";
                const avatar = item.profile_picture || DEFAULT_PROFILE_IMAGE;
                const id = item.user_id || item.id || "";
                return `
                  <div class="profile-follow-item" data-user-id="${id}">
                    <img src="${avatar}" alt="${name}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'">
                    <div class="profile-follow-name">${name}</div>
                  </div>
                `;
              })
              .join("");
          }
        }
        modal.classList.add("open");
        if (listEl && !listEl.__boundProfileLinks) {
          listEl.__boundProfileLinks = true;
          listEl.addEventListener("click", (event) => {
            const target = event.target.closest(".profile-follow-item");
            if (!target) return;
            const selectedId = target.getAttribute("data-user-id");
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
              followModal.classList.remove("open");
              return;
            }
            sessionStorage.setItem("selectedUserId", String(selectedId));
            window.history.pushState(
              {},
              "",
              `${basePath}/others-profile?userId=${encodeURIComponent(String(selectedId))}`,
            );
            window.dispatchEvent(new Event("popstate"));
            followModal.classList.remove("open");
          });
        }
      };

      const openFollowers = async () => {
        try {
          const res = await api.get(`/bini/users/${encodeURIComponent(String(userId))}/followers`);
          const items = normalizeList(res.data, "followers");
          renderFollowList(items, "Followers");
        } catch (error) {
          showToast("Failed to load followers.", "error");
        }
      };

      const openFollowing = async () => {
        try {
          const res = await api.get(`/bini/users/${encodeURIComponent(String(userId))}/following`);
          const items = normalizeList(res.data, "following");
          renderFollowList(items, "Following");
        } catch (error) {
          showToast("Failed to load following.", "error");
        }
      };

      if (followersStat) {
        followersStat.addEventListener("click", openFollowers);
      }
      if (followingStat) {
        followingStat.addEventListener("click", openFollowing);
      }

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
      showToast("Profile data could not be fetched", "error");
    }
  } catch (error) {
    showToast("Error fetching profile data: " + error.message, "error");
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

    posts = posts
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const repostOriginals =
      tab === "reposts" ? await hydrateRepostOriginals(posts) : new Map();

    const likeStatusPromises = posts.map((post) =>
      fetchIsLikedStatus(post.post_id, userId, token),
    );
    const likeStatuses = await Promise.all(likeStatusPromises);
    const likecountPromises = posts.map((post) =>
      fetchLikedCounts(post.post_id, userId, token),
    );
    const countlike = await Promise.all(likecountPromises);
    if (tab === "threads") {
      const likesTotal = countlike.reduce((sum, value) => sum + (Number(value) || 0), 0);
      const likesCountEl = feed.closest(".profile-container")?.querySelector("#likesCount .stat-count");
      if (likesCountEl) likesCountEl.textContent = String(likesTotal);
    }

	    posts.forEach((post, index) => {
	      const postCreationTime = formatDate(post.created_at);
	      const isLiked = likeStatuses[index];
	      const likeCount = countlike[index];
      const postUserId = post.user_id || ownerUser?.user_id || userId;
      const postFullname = post.fullname || ownerUser?.fullname || "You";
      const postProfilePic = post.profile_picture || ownerUser?.profile_picture || DEFAULT_PROFILE_IMAGE;
      const isOwnPost = String(postUserId) === String(userId);
      const tags = Array.isArray(post.tags) ? post.tags : [];
      const originalPost = repostOriginals.get(String(post.repost_id || "")) || null;
      const originalName = originalPost?.fullname || null;
      const originalUserId = originalPost?.user_id || null;

	      const postContent = `
	        <div class="post-card" data-post-id="${post.post_id}" data-owner-id="${postUserId}">
	          <div class="post-meta1">
              <a href="#" class="profile-link" data-user-id="${postUserId}">
                <img src="${postProfilePic}" alt="${postFullname}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'">
              </a>
              <a href="#" class="profile-link" data-user-id="${postUserId}">
                <span class="post-fullname">${postFullname}</span>
              </a>
	            <span class="post-time">${postCreationTime}</span>
              ${buildPostMenuHtml({ postId: post.post_id, isOwnPost: true })}
          </div>
          ${tab === "reposts" && originalName ? `
            <div class="post-repost-meta">
              <span>Reposted from</span>
              <a href="#" class="profile-link" data-user-id="${originalUserId || ''}">${originalName}</a>
            </div>
          ` : ""}
          <div class="post-content">${post.content || "No content available"}</div>
          ${tags.length ? `<div class="post-tags">${tags.join(", ")}</div>` : ""}
          ${post.img_url ? `<img src="${post.img_url}" alt="Post Image" class="post-image" />` : ""}
	          <div class="post-actions">
	            <button class="post-action like-button ${isLiked ? "liked" : ""}" data-post-id="${post.post_id}" data-like-type="post">
	                <span class="material-icons ${isLiked ? "liked" : ""}">${isLiked ? "favorite" : "favorite_border"}</span>
	                <span class="like-count">${likeCount}</span>
	            </button>
            <button class="post-action comment-button" data-post-id="${post.post_id}">
                <span class="material-icons">chat_bubble_outline</span>
            </button>
            <button class="post-action repostbtn${isOwnPost ? " repost-disabled" : ""}" data-post-id="${post.post_id}"${isOwnPost ? ' disabled aria-disabled="true" title="You cannot repost your own post."' : ""}>
                <span class="material-icons">repeat</span>
            </button>
          </div>
        </div>
      `;
      feed.innerHTML += postContent;
    });

    bindPostMenuActions(feed, {
      resolvePost: async (postId) =>
        posts.find((item) => String(item.post_id) === String(postId)) || null,
      onPostUpdated: (postId, updatedPost) => {
        const target = posts.find((item) => String(item.post_id) === String(postId));
        if (target) {
          target.content = updatedPost.content;
          target.img_url = updatedPost.img_url;
        }
        const card = feed.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (!card) return;
        const contentEl = card.querySelector(".post-content");
        const imageEl = card.querySelector(".post-image");
        if (contentEl) contentEl.textContent = updatedPost.content || "No content available";
        if (updatedPost.img_url) {
          if (imageEl) {
            imageEl.src = updatedPost.img_url;
          } else {
            contentEl?.insertAdjacentHTML("afterend", `<img src="${updatedPost.img_url}" alt="Post Image" class="post-image" />`);
          }
        } else {
          imageEl?.remove();
        }
      },
      onPostDeleted: (postId) => {
        const idx = posts.findIndex((item) => String(item.post_id) === String(postId));
        if (idx >= 0) posts.splice(idx, 1);
        feed.querySelector(`.post-card[data-post-id="${postId}"]`)?.remove();
        if (!posts.length) {
          feed.innerHTML = "<p>No posts available.</p>";
        }
      },
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

async function hydrateRepostOriginals(posts) {
  const map = new Map();
  const uniqueIds = Array.from(
    new Set(posts.map((post) => post.repost_id).filter(Boolean).map(String)),
  );
  if (!uniqueIds.length) return map;

  const results = await Promise.allSettled(
    uniqueIds.map((id) => api.get(`/bini/posts/${encodeURIComponent(id)}`)),
  );

  results.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const original = result.value?.data;
    if (!original) return;
    map.set(uniqueIds[index], original);
  });

  return map;
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

// LOAD PROFILE STATS (Followers, Following)
async function loadProfileStats(userId, root) {
  const followersCountEl = root.querySelector("#followersCount .stat-count");
  const followingCountEl = root.querySelector("#followingCount .stat-count");

  try {
    const [followersRes, followingRes] = await Promise.allSettled([
      api.get(`/bini/users/${encodeURIComponent(String(userId))}/follower-count`),
      api.get(`/bini/users/${encodeURIComponent(String(userId))}/following-count`),
    ]);

    let followerCount =
      followersRes.status === "fulfilled"
        ? Number(followersRes.value?.data?.followerCount ?? followersRes.value?.data?.count ?? 0)
        : null;
    let followingCount =
      followingRes.status === "fulfilled"
        ? Number(followingRes.value?.data?.followingCount ?? followingRes.value?.data?.count ?? 0)
        : null;

    if (followerCount === null || followingCount === null) {
      const [followersListRes, followingListRes] = await Promise.allSettled([
        api.get(`/bini/users/${encodeURIComponent(String(userId))}/followers`),
        api.get(`/bini/users/${encodeURIComponent(String(userId))}/following`),
      ]);

      if (followerCount === null && followersListRes.status === "fulfilled") {
        const followers = followersListRes.value?.data?.followers;
        followerCount = Array.isArray(followers) ? followers.length : 0;
      }

      if (followingCount === null && followingListRes.status === "fulfilled") {
        const following = followingListRes.value?.data?.following;
        followingCount = Array.isArray(following) ? following.length : 0;
      }
    }

    if (followersCountEl) {
      followersCountEl.textContent = String(
        Number.isFinite(followerCount) ? followerCount : 0,
      );
    }
    if (followingCountEl) {
      followingCountEl.textContent = String(
        Number.isFinite(followingCount) ? followingCount : 0,
      );
    }
  } catch (error) {
    console.error("Error loading profile stats:", error);
    if (followersCountEl) followersCountEl.textContent = "0";
    if (followingCountEl) followingCountEl.textContent = "0";
  }
}


