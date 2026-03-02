import { fetchOthersData } from "../../../services/bini_services/user/fetchOthersProfile.js";
import { repost } from "../../../services/bini_services/post/repost.js";
import createCommentModal from "../post/comment_modal.js";
import "../../../styles/bini_styles/OthersProfile.css";
import api from "../../../services/bini_services/api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";

const DEFAULT_PROFILE_IMAGE = "/circle-user.png";

// Helper to decode JWT and get userId
function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id;
  } catch (e) {
    return null;
  }
}

export default async function ProfileInfo(main, params) {
  const activeCommunityType = String(
    params?.community_type || params?.communityType || params?.communityData?.community_type || ""
  ).trim().toLowerCase();
  if (activeCommunityType) {
    setActiveSiteSlug(activeCommunityType);
  }

  const viewedUserId =
    params?.id ||
    params?.[0] ||
    sessionStorage.getItem("selectedUserId") ||
    sessionStorage.getItem("selectedUserId");

  main.innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <img src="${DEFAULT_PROFILE_IMAGE}" 
             alt="Profile Picture" 
             class="profile-picture1" 
             id="profilePicture" 
             onerror="this.src='${DEFAULT_PROFILE_IMAGE}'"
             onload="this.style.opacity = '1'">
        
        <h2 id="fullname" class="profile-name">Loading...</h2>
        
        <div class="profile-actions">
          <button id="editProfileBtn" class="btn-editbutton">Edit Profile</button>
          <button id="followBtn" class="btn-follow">Follow</button>
        </div>
        
        <div class="profile-stats">
          <div class="stat-item" id="postsCount">
            <span class="stat-count">0</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-item" id="followersCount">
            <span class="stat-count">0</span>
            <span class="stat-label">Followers</span>
          </div>
          <div class="stat-item" id="followingCount">
            <span class="stat-count">0</span>
            <span class="stat-label">Following</span>
          </div>
        </div>
        
        <div class="profile-bio" id="userBio"></div>
      </div>
      
      <div class="nav-container">
        <button class="nav-tab active" data-tab="threads">Bloomies</button>
        <button class="nav-tab" data-tab="reposts">Reposts</button>
      </div>
      
      <div class="feed"></div>
    </div>
  `;

  const activeSite = getActiveSiteSlug(activeCommunityType) || activeCommunityType || "bini";
  const token = getSessionToken(activeSite);
  const myUserId = getUserIdFromToken(token);

  if (!token) {
    alert("Please login first.");
    return;
  }

  if (!viewedUserId) {
    main.querySelector(".feed").innerHTML = "<p>User not found.</p>";
    return;
  }

  try {
    // Fetch the profile data of the user being viewed
    const user = await fetchOthersData(viewedUserId, activeCommunityType);

    console.log("Fetched user data:", user); // Debug log

    if (user && user.user) {
      const profilePicture = main.querySelector("#profilePicture");
      const fullname = main.querySelector("#fullname");
      const followBtn = main.querySelector("#followBtn");
      const editProfileBtn = main.querySelector("#editProfileBtn");

      // Update profile picture and fullname
      if (profilePicture) {
        const picUrl = user.user.profile_picture || DEFAULT_PROFILE_IMAGE;
        profilePicture.src = picUrl;
        profilePicture.style.display = "block";
        profilePicture.style.opacity = "1";
        profilePicture.style.visibility = "visible";
      }
      if (fullname) {
        const name = user.user.fullname || user.user.username || "Anonymous";
        fullname.textContent = name;
        fullname.style.display = "block";
        fullname.style.visibility = "visible";
      }

      // Ensure profile header and container are visible
      const profileHeader = main.querySelector(".profile-header");
      const profileContainer = main.querySelector(".profile-container");

      if (profileHeader) {
        profileHeader.style.display = "block";
        profileHeader.style.visibility = "visible";
        profileHeader.style.opacity = "1";
      }

      if (profileContainer) {
        profileContainer.style.display = "block";
        profileContainer.style.visibility = "visible";
        profileContainer.style.opacity = "1";
      }

      // Ensure stats are visible
      const profileStats = main.querySelector(".profile-stats");
      if (profileStats) {
        profileStats.style.display = "flex";
        profileStats.style.visibility = "visible";
      }

      // Ensure actions are visible
      const profileActions = main.querySelector(".profile-actions");
      if (profileActions) {
        profileActions.style.display = "flex";
        profileActions.style.visibility = "visible";
      }

      // Force visibility with inline styles
      if (profileContainer) {
        profileContainer.setAttribute(
          "style",
          "display: block !important; visibility: visible !important; opacity: 1 !important; background-color: #ffffff !important;",
        );
      }

      console.log("Profile updated:", {
        picture: user.user.profile_picture,
        fullname: user.user.fullname || user.user.username,
        userId: user.user.user_id,
        profileContainerExists: !!profileContainer,
        profileHeaderExists: !!profileHeader,
        profileContainerStyle: profileContainer
          ? window.getComputedStyle(profileContainer).display
          : "N/A",
        profileHeaderStyle: profileHeader
          ? window.getComputedStyle(profileHeader).display
          : "N/A",
      }); // Debug log
      // Hide edit button if not own profile, show follow button
      if (myUserId && String(myUserId) !== String(viewedUserId)) {
        editProfileBtn.style.display = "none";
        followBtn.style.display = "";
      } else {
        editProfileBtn.style.display = "";
        followBtn.style.display = "none";
      }

      // FOLLOW BUTTON LOGIC
      let isFollowing = false;
      // Fetch following status from API
      try {
        const res = await api.get(`/bini/users/${viewedUserId}/is-following`);
        isFollowing = res.data.isFollowing;
      } catch (err) {
        isFollowing = false;
      }

      followBtn.textContent = isFollowing ? "Unfollow" : "Follow";

      followBtn.addEventListener("click", async () => {
        try {
          if (!isFollowing) {
            const res = await api.post(`/bini/users/${viewedUserId}/follow`);
            if (res.status >= 200 && res.status < 300) {
              isFollowing = true;
              followBtn.textContent = "Unfollow";
              // Stats endpoints are failing, so skip refresh
            } else {
              alert("Failed to follow user.");
            }
          } else {
            // Unfollow user
            const res = await api.post(`/bini/users/${viewedUserId}/unfollow`);
            if (res.status >= 200 && res.status < 300) {
              isFollowing = false;
              followBtn.textContent = "Follow";
              // Stats endpoints are failing, so skip refresh
            } else {
              alert("Failed to unfollow user.");
            }
          }
        } catch (err) {
          alert("Error updating follow status.");
        }
      });

      // Render posts (default: threads) - this will also update posts count
      const userId = user.user.user_id;
      const feedElement = main.querySelector(".feed");

      if (feedElement) {
        feedElement.style.display = "block";
        feedElement.style.visibility = "visible";
        feedElement.style.opacity = "1";
        console.log("Feed element found, rendering posts...");
        await renderPosts("threads", userId, token, feedElement, main);
      } else {
        console.error("Feed element not found!");
      }

      // Load profile stats (followers, following) - with better error handling
      // Don't block rendering if stats fail
      loadProfileStats(viewedUserId, token, main).catch((err) => {
        console.error("Stats loading failed, but continuing:", err);
      });

      // Tab navigation - FIXED: Changed from .profile-nav-item to .nav-tab to match HTML
      const profileNavItems = main.querySelectorAll(".nav-tab");
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
            main.querySelector(".feed"),
            main,
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

// LOAD PROFILE STATS (Followers, Following, Posts Count)
// Skip endpoints that are returning 500 errors - just set defaults
async function loadProfileStats(userId, token, main) {
  // Since all stats endpoints are returning 500 errors, just set defaults
  // This prevents console errors and allows the page to render
  const followersCountEl = main.querySelector("#followersCount .stat-count");
  const followingCountEl = main.querySelector("#followingCount .stat-count");

  if (followersCountEl) {
    followersCountEl.textContent = "0";
  }
  if (followingCountEl) {
    followingCountEl.textContent = "0";
  }

  // Posts count will be set by renderPosts function
}

// POSTS/REPOSTS RENDERING
// POSTS/REPOSTS RENDERING
async function renderPosts(tab, userId, token, feed, mainContainer = null) {
  feed.innerHTML = "";
  if (!userId) {
    feed.innerHTML = "<p>User ID not found.</p>";
    return;
  }

  try {
    let posts = [];

    if (tab === "threads") {
      posts = await fetchUserPosts(userId, token);
      console.log("Fetched posts:", posts);
    } else if (tab === "reposts") {
      posts = await fetchUserRepost(userId, token);
      console.log("Fetched repost data:", posts);

      // Extract the reposts array from the response

      // console.log("REPOST:", repostData);
      // posts = repostData.reposts || [];
    }

    console.log("POSTS:", posts);

    // Update posts count in stats (only for threads tab)
    if (tab === "threads" && mainContainer) {
      const postsCountEl = mainContainer.querySelector(
        "#postsCount .stat-count",
      );
      if (postsCountEl) {
        const postsCount = Array.isArray(posts) ? posts.length : 0;
        postsCountEl.textContent = postsCount;
      }
    }

    if (!posts || posts.length === 0) {
      feed.innerHTML = `<p>No ${tab === "threads" ? "posts" : "reposts"} available.</p>`;
      // Update count to 0 if no posts
      if (tab === "threads" && mainContainer) {
        const postsCountEl = mainContainer.querySelector(
          "#postsCount .stat-count",
        );
        if (postsCountEl) {
          postsCountEl.textContent = "0";
        }
      }
      return;
    }

    const likeStatusPromises = posts.map((post) =>
      fetchIsLikedStatus(post.post_id, userId, token),
    );
    const likeStatuses = await Promise.all(likeStatusPromises);
    const likecountPromises = posts.map((post) =>
      fetchLikedcounts(post.post_id, userId, token),
    );
    const countlike = await Promise.all(likecountPromises);

    posts.forEach((post, index) => {
      const postCreationTime = formatDate(post.created_at);
      const isLiked = likeStatuses[index];
      const likeCount = countlike[index];

	      const postContent = `
	        <div class="post-card">
	          <div class="post-meta">
	            <a href="#" class="profile-link" data-user-id="${post.user_id || ''}" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;">
	              <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" alt="${post.fullname || "User"}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'">
	              <span style="font-weight:600;">${post.fullname || "Unknown User"}</span>
	            </a>
	            ${tab === "reposts" ? '<span class="repost-indicator">Reposted</span>' : ""}
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

    // Ensure feed is visible after rendering
    if (feed) {
      feed.style.display = "block";
      feed.style.visibility = "visible";
      feed.style.opacity = "1";
      console.log(`Rendered ${posts.length} ${tab} in feed`);
    }

    feed.querySelectorAll(".like-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const postId = button.getAttribute("data-post-id");
        const likeType = button.getAttribute("data-like-type");
        try {
	          const updatedLikeData = await toggleLike(postId, token, likeType);
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

    feed.querySelectorAll(".repostbtn").forEach((button) => {
      button.addEventListener("click", async () => {
        const postId = button.getAttribute("data-post-id");
        try {
          await repost(postId, token);
          // Optionally show a success message
          alert("Reposted successfully!");
        } catch (error) {
          console.error("Repost failed:", error);
          alert("Failed to repost: " + error.message);
        }
      });
    });

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

	    feed.querySelectorAll(".profile-link").forEach((link) => {
	      link.addEventListener("click", (e) => {
	        e.preventDefault();
	        const selectedId = link.getAttribute("data-user-id");
	        if (!selectedId) return;
	        sessionStorage.setItem("selectedUserId", String(selectedId));
	        window.history.pushState({}, "", `fanhub/community-platform/${data.community_type}/others-profile`);
	        window.dispatchEvent(new Event("popstate"));
	      });
	    });
	  } catch (error) {
    feed.innerHTML = "<p>Error loading posts.</p>";
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}
// Fetch user posts
async function fetchUserPosts(userId, token) {
  try {
    const response = await api.get(`/bini/posts/${userId}/posts`);
    const data = response.data;
    // Handle case where backend returns error object instead of array
    if (data.error) {
      console.warn("Backend returned error:", data.error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }
    console.error("Error fetching user posts:", error);
    return [];
  }
}
// Fetch user reposts
async function fetchUserRepost(userId, token) {
  try {
    const response = await api.get(`/bini/posts/${userId}/repost`);
    return response.data;
  } catch (error) {
    return [];
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
// Fetch like status
async function fetchIsLikedStatus(Id, userId, token) {
  try {
    const response = await api.get(`/bini/likes/check/post/${Id}`);
    return response.data.isLiked;
  } catch (error) {
    return false;
  }
}
// Fetch like counts
async function fetchLikedcounts(postId, userId, token) {
  try {
    const response = await api.get(`/bini/likes/count/post/${postId}`);
    return response.data.likeCount;
  } catch (error) {
    return 0;
  }
}
