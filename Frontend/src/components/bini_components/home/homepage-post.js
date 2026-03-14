import { fetchrandomposts } from '../../../services/bini_services/post/fetchrandompost.js';
import { repost } from '../../../services/bini_services/post/repost.js';
import { fetchPostById } from '../../../services/bini_services/post/fetchPostById.js';
import {
  fetchRepostCounts,
  fetchCommentCounts,
  checkIfUserReposted,
  fetchIsCommentedStatus,
  fetchIsLikedStatus,
  fetchLikedcounts,
  toggleLike,
} from '../../../services/bini_services/post/post-interactions.js';
import createCommentModal from '../post/comment_modal.js';
import { buildPostMenuHtml, bindPostMenuActions } from '../post/post-menu.js';
import { renderThreadsSidebar } from '../threadsSidebar.js';
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from '../../../lib/site-context.js';
import { formatUserTimestamp } from '../../../utils/user-time.js';
import { showToast } from '../../../utils/toast.js';
import { isTemplatePreviewMode } from '../../../lib/template-preview.js';
let isLoading = false;

function resolveCommunityType(dataCommunityType = '', data = null) {
  const fromData = String(dataCommunityType || '').trim().toLowerCase();
  if (fromData) return fromData;

  const fromPayload = String(
    data?.siteSlug ||
    data?.siteData?.community_type ||
    data?.siteData?.site_slug ||
    data?.siteData?.domain ||
    ''
  ).trim().toLowerCase();
  if (fromPayload) return fromPayload;

  const fromStorage = String(
    sessionStorage.getItem('community_type') || ''
  ).trim().toLowerCase();
  if (fromStorage && fromStorage !== 'community-platform') return fromStorage;

  try {
    const parts = String(window?.location?.pathname || '').split('/').filter(Boolean);
    if (parts[0] === 'fanhub' && parts[1] === 'community-platform' && parts[2]) {
      return String(parts[2]).toLowerCase();
    }
    if (parts[0] === 'fanhub' && parts[1] && parts[1] !== 'community-platform') {
      return String(parts[1]).toLowerCase();
    }
    if (parts[0] === 'bini') return 'bini';
  } catch (_) {}

  return '';
}

function getPreviewSiteData(data = {}) {
  return data?.siteData && typeof data.siteData === 'object'
    ? data.siteData
    : (data && typeof data === 'object' ? data : {});
}

function buildPreviewThreadsHtml(siteData = {}) {
  const siteName = String(siteData?.site_name || siteData?.domain || 'Community').trim();
  const memberCount = Array.isArray(siteData?.members) ? siteData.members.length : 0;
  const shortBio = String(siteData?.short_bio || siteData?.description || 'Preview your homepage feed, members, and brand styling here.').trim();

  return `
    <div class="threads-sidebar">
      <button class="events-panel-close" aria-label="Close threads panel" disabled>&times;</button>
      <h3 class="threads-header">${siteName} Preview</h3>

      <ul class="threads-list">
        <li class="thread-item pinned">
          <div class="thread-item-meta">
            <div class="thread-date">Now</div>
            <span class="thread-pin-tag">Pinned</span>
          </div>
          <div class="thread-title">Theme and layout preview</div>
          <div class="thread-venue">Live typography, palette, and button styles</div>
        </li>
        <li class="thread-item">
          <div class="thread-item-meta">
            <div class="thread-date">${memberCount || 0} members</div>
          </div>
          <div class="thread-title">Member spotlight section</div>
          <div class="thread-venue">${shortBio}</div>
        </li>
      </ul>
    </div>
  `;
}

function buildPreviewPosts(siteData = {}) {
  const siteName = String(siteData?.site_name || siteData?.domain || 'Community').trim();
  const shortBio = String(siteData?.short_bio || '').trim();
  const description = String(siteData?.description || siteData?.site_description || '').trim();
  const members = Array.isArray(siteData?.members) ? siteData.members : [];
  const logo = siteData?.logo || siteData?.logo_url || members[0]?.image || members[0]?.image_profile || '/circle-user.png';
  const leadImage = siteData?.lead_image || siteData?.group_photo || '';
  const now = new Date();

  const posts = [
    {
      post_id: 'preview-intro',
      user_id: 'preview-site',
      fullname: siteName,
      profile_picture: logo,
      content: shortBio || description || 'Your community homepage will inherit the current theme, typography, and uploaded media in this preview.',
      img_url: leadImage || '',
      tags: ['Preview', 'Homepage'],
      created_at: now.toISOString(),
      likeCount: 128,
      commentCount: 24,
      repostCount: 8,
    },
  ];

  members.slice(0, 2).forEach((member, index) => {
    posts.push({
      post_id: `preview-member-${index + 1}`,
      user_id: `preview-member-${index + 1}`,
      fullname: member?.name || `Member ${index + 1}`,
      profile_picture: member?.image || member?.image_profile || logo,
      content: member?.description || `${member?.name || 'This member'} will appear with the selected fonts, colors, and spacing across the generated site.`,
      img_url: member?.image || member?.image_profile || '',
      tags: [member?.role || 'Member'],
      created_at: new Date(now.getTime() - ((index + 1) * 36e5)).toISOString(),
      likeCount: 48 - (index * 6),
      commentCount: 15 - (index * 2),
      repostCount: 5 - index,
    });
  });

  if (posts.length === 1 && description) {
    posts.push({
      post_id: 'preview-about',
      user_id: 'preview-about',
      fullname: `${siteName} Team`,
      profile_picture: logo,
      content: description,
      img_url: '',
      tags: ['About'],
      created_at: new Date(now.getTime() - (2 * 36e5)).toISOString(),
      likeCount: 36,
      commentCount: 9,
      repostCount: 3,
    });
  }

  return posts;
}


export default async function Homepage(root, data) {
  const previewMode = isTemplatePreviewMode(data);
  const previewSiteData = getPreviewSiteData(data);
  const communityType = resolveCommunityType(data?.community_type, data);
  if (communityType) {
    setActiveSiteSlug(communityType);
  }

  if (previewMode) {
    root.innerHTML = `
      <div class="homepage-container">
        <div class="homepage-feed"></div>
        <div class="homepage-right">
          ${buildPreviewThreadsHtml(previewSiteData)}
        </div>
      </div>
      <div id="image-modal" class="image-modal">
        <div class="image-stage">
          <div class="modal-header">
            <button class="download-button" id="download-btn" title="Download image">
              <span class="material-icons">download</span>
            </button>
            <div class="zoom-controls" aria-label="Zoom controls">
              <button id="zoom-out" type="button" title="Zoom out">-</button>
              <span id="zoom-level" class="zoom-level" aria-live="polite">100%</span>
              <button id="zoom-in" type="button" title="Zoom in">+</button>
              <button id="zoom-reset" type="button" title="Reset zoom">Reset</button>
            </div>
            <button class="modal-close" type="button" aria-label="Close image viewer">&times;</button>
          </div>
          <img class="modal-content" id="modal-img" alt="Expanded post image">
          <div class="modal-hint">Esc to close · + / - to zoom</div>
        </div>
      </div>
    `;

    const feed = root.querySelector('.homepage-feed');
    if (feed) {
      feed.innerHTML = buildPreviewPosts(previewSiteData)
        .map((post, index) => buildPostCardHtml(post, {
          postCreationTime: formatDate(post.created_at),
          isLiked: index === 0,
          isCommented: index === 1,
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          repostCount: post.repostCount || 0,
        }))
        .join('');
    }

    attachLocalImageModal();
    return;
  }

  const threadsSidebar = await renderThreadsSidebar();
  root.innerHTML = `
    <div class="homepage-container">
      <div class="homepage-feed"></div>
      <div class="homepage-right">
        ${threadsSidebar.html}
      </div>
    </div>
    <!-- IMAGE MODAL (LOCAL TO THIS PAGE) -->
    <div id="image-modal" class="image-modal">
      <div class="image-stage">
        <div class="modal-header">
          <button class="download-button" id="download-btn" title="Download image">
            <span class="material-icons">download</span>
          </button>

          <div class="zoom-controls" aria-label="Zoom controls">
            <button id="zoom-out" type="button" title="Zoom out">-</button>
            <span id="zoom-level" class="zoom-level" aria-live="polite">100%</span>
            <button id="zoom-in" type="button" title="Zoom in">+</button>
            <button id="zoom-reset" type="button" title="Reset zoom">Reset</button>
          </div>

          <button class="modal-close" type="button" aria-label="Close image viewer">&times;</button>
        </div>

        <img class="modal-content" id="modal-img" alt="Expanded post image">
        <div class="modal-hint">Esc to close · + / - to zoom</div>
      </div>
    </div>
  `;


  const feed = root.querySelector('.homepage-feed');
  const threadsSidebarContainer = root.querySelector('.threads-sidebar');
  
  // Setup click handlers for threads
  if (threadsSidebarContainer && threadsSidebar.setupClickHandlers) {
    threadsSidebar.setupClickHandlers(threadsSidebarContainer);
  }
  
  let currentOffset = 0;
  const limit = 7;
  const activeSite = getActiveSiteSlug(communityType) || communityType;
  const token = getSessionToken(activeSite);

  if (!token) {
    feed.innerHTML = '<p>Please sign in to view posts.</p>';
    return;
  }


  // Initial load
  await loadPosts(feed, token, limit, currentOffset, false, communityType);
  await focusTargetPost(feed, token, communityType);

  // Real-time: when user creates a post, prepend it to the feed without reload
  const onNewPostCreated = (e) => {
    const newPost = e.detail?.post;
    if (newPost && feed && feed.isConnected) {
      prependSinglePost(newPost, token, feed, communityType);
    }
  };
  window.addEventListener('new-post-created', onNewPostCreated);

  // Infinite scroll
  window.addEventListener('scroll', async () => {
    if (isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 100) { // Near bottom
      currentOffset += limit;
      await loadPosts(feed, token, limit, currentOffset, true, communityType);
    }
  });
}

async function focusTargetPost(feed, token, communityType) {
  const targetPostId = sessionStorage.getItem('focusPostId');
  if (!targetPostId || !feed) return;

  let targetCard = feed.querySelector(`.post-card[data-post-id="${targetPostId}"]`);
  if (!targetCard) {
    try {
      const post = await fetchPostById(targetPostId);
      const normalized = {
        ...post,
        post_id: post?.post_id || post?.id || targetPostId,
      };
      prependSinglePost(normalized, token, feed, communityType);
      targetCard = feed.querySelector(`.post-card[data-post-id="${targetPostId}"]`);
    } catch (error) {
      console.warn('Failed to focus target post:', error?.message || error);
    }
  }

  if (targetCard) {
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetCard.classList.add('target-post-flash');
    setTimeout(() => targetCard.classList.remove('target-post-flash'), 1800);
  }

  sessionStorage.removeItem('focusPostId');
}

// LOAD POSTS FUNCTION FOR INFINITE SCROLLING
async function loadPosts(feed, token, limit, offset, append = false, communityType = '') {
  if (isLoading) return;
  isLoading = true;

  try {
    const postsResponse = await fetchrandomposts(token, limit, offset, communityType);
    const posts = Array.isArray(postsResponse) ? postsResponse : (postsResponse?.posts || postsResponse?.data || []);

    if (posts.length > 0) {
      // Fetch all stats (likes, comments, and reposts) for ranking
      const postsWithStats = await Promise.all(
        posts.map(async (post) => {
          try {
            const [likeCount, commentCount, repostCount] = await Promise.all([
              fetchLikedcounts(post.post_id),
              fetchCommentCounts(post.post_id),
              fetchRepostCounts(post.post_id)
            ]);
            
            return { 
              ...post, 
              likeCount,
              commentCount,
              repostCount,
              timestamp: new Date(post.created_at).getTime()
            };
          } catch (error) {
            console.error('Error fetching post stats:', error);
            return { 
              ...post, 
              likeCount: 0, 
              commentCount: 0,
              repostCount: 0,
              timestamp: new Date(post.created_at).getTime()
            };
          }
        })
      );

      // Sort posts by rank: 1) Latest, 2) Likes, 3) Comments
      const sortedPosts = sortPostsByRank(postsWithStats);
      await renderPosts(sortedPosts, token, feed, append, communityType);
    } else if (!append) {
      feed.innerHTML = '<p>No posts available.</p>';
    }
  } catch (error) {
    if (!append) {
      alert("Error fetching posts: " + error.message);
    }
  } finally {
    isLoading = false;
  }
}



// SORT POSTS: Newest first in homepage feed
function sortPostsByRank(posts) {
  return posts.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Newest first
  });
}

// Build HTML for a single post (shared by renderPosts and prependSinglePost)
function getCurrentUserId() {
  const storedUserId =
    sessionStorage.getItem('currentUserId') ||
    sessionStorage.getItem('userId') ||
    sessionStorage.getItem('user_id') ||
    '';

  if (String(storedUserId || '').trim()) {
    return String(storedUserId).trim();
  }

  try {
    const token = String(getSessionToken(getActiveSiteSlug()) || '').trim();
    const [, payload = ''] = token.split('.');
    if (!payload) return '';

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded));
    return String(decoded?.id || decoded?.user_id || decoded?.sub || '').trim();
  } catch (_) {
    return '';
  }
}

function resolvePostOwnerId(post = {}) {
  return String(
    post.user_id ||
      post.userId ||
      post.owner_id ||
      post.author_id ||
      post.user?.user_id ||
      post.user?.id ||
      post.author?.user_id ||
      post.author?.id ||
      '',
  ).trim();
}

function findPostCard(container, postId) {
  if (!container || !postId) return null;
  if (
    container.classList?.contains('post-card') &&
    String(container.getAttribute('data-post-id') || '') === String(postId)
  ) {
    return container;
  }
  return container.querySelector(`.post-card[data-post-id="${postId}"]`);
}

function buildPostCardHtml(post, { postCreationTime, isLiked, isCommented, likeCount, commentCount, repostCount }) {
  const currentUserId = getCurrentUserId();
  const postOwnerId = resolvePostOwnerId(post);
  const isOwnPost = Boolean(currentUserId && postOwnerId && postOwnerId === currentUserId);
  const imageHtml = post.img_url
    ? `<img src="${post.img_url}" data-full="${post.img_url}" alt="Post Image" class="post-image" />`
    : '';

  const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? [].concat(post.tags) : []);
  const tagsHtml = tags.length > 0
    ? `<div class="post-tags">${tags.join(', ')}</div>`
    : '';
//
  const displayContent =
    post.content && String(post.content).trim() !== ''
      ? post.content
      : (tags.length > 0 ? tags.join(' ') : 'No content available');

  return `
    <div class="post-card" data-post-id="${post.post_id}">
      <div class="post-meta1">
        <a href="#" class="profile-link" data-user-id="${postOwnerId}">
          <img src="${post.profile_picture || '/circle-user.png'}" class="profile-picture" onerror="this.src='/circle-user.png';">
        </a>
        <a href="#" class="profile-link" data-user-id="${postOwnerId}">
          <span class="post-fullname">${post.fullname || 'You'}</span>
        </a>
        <span class="post-time">${postCreationTime}</span>
        ${buildPostMenuHtml({ postId: post.post_id, isOwnPost })}
      </div>

      <div class="post-content">${displayContent}</div>
      ${tagsHtml}
      ${imageHtml}

      <div class="post-actions">
        <button class="post-action like-button ${isLiked ? 'liked' : ''}"
                data-post-id="${post.post_id}"
                data-like-type="post">
          <span class="material-icons ${isLiked ? 'liked' : ''}">
            ${isLiked ? 'favorite' : 'favorite_border'}
          </span>
          <span class="like-count">${likeCount}</span>
        </button>

        <button class="post-action comment-button ${isCommented ? 'commented' : ''}" data-post-id="${post.post_id}">
          <span class="material-icons">${isCommented ? 'chat_bubble' : 'chat_bubble_outline'}</span>
          <span class="comment-count">${commentCount}</span>
        </button>

        <button class="post-action repostbtn" data-post-id="${post.post_id}">
          <span class="material-icons">repeat</span>
          <span class="repost-count">${repostCount}</span>
        </button>
      </div>
    </div>
  `;
}

// Prepend a single new post to the feed (real-time, no reload)
function prependSinglePost(newPost, token, feed, communityType = '') {
  const post = {
    ...newPost,
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    tags: Array.isArray(newPost.tags) ? newPost.tags : (newPost.tags ? [].concat(newPost.tags) : []),
  };
  const postCreationTime = formatDate(post.created_at);
  const html = buildPostCardHtml(post, {
    postCreationTime,
    isLiked: false,
    isCommented: false,
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
  });
  feed.insertAdjacentHTML('afterbegin', html);
  const firstCard = feed.querySelector('.post-card');
  if (firstCard) attachPostActions(feed, token, firstCard, communityType);
  attachLocalImageModal();
}

// RENDER POSTS FUNCTION
async function renderPosts(posts, token, feed, append = false, communityType = '') {
  if (!append) {
    feed.innerHTML = '';
  }

  try {
    // Fetch like and comment status for each post
    const likeStatusPromises = posts.map(post => fetchIsLikedStatus(post.post_id));
    const commentStatusPromises = posts.map(post => fetchIsCommentedStatus(post.post_id));
    const [likeStatuses, commentStatuses] = await Promise.all([
      Promise.all(likeStatusPromises),
      Promise.all(commentStatusPromises)
    ]);

    posts.forEach((post, index) => {
      const postCreationTime = formatDate(post.created_at);
      const isLiked = likeStatuses[index];
      const isCommented = commentStatuses[index];
      const likeCount = post.likeCount || 0;
      const commentCount = post.commentCount || 0;
      const repostCount = post.repostCount || 0;

      const postContent = buildPostCardHtml(post, {
        postCreationTime,
        isLiked,
        isCommented,
        likeCount,
        commentCount,
        repostCount,
      });

      if (append) {
        feed.insertAdjacentHTML('beforeend', postContent);
      } else {
        feed.innerHTML += postContent;
      }
    });

    // Attach Like, Repost, Comment, and Profile link events
    attachPostActions(feed, token, null, communityType);

    // FIXED LOCAL MODAL
    attachLocalImageModal();

  } catch (error) {
    alert("Error rendering posts: " + error.message);
  }
}

// REFRESH POST COUNTS FUNCTION
async function refreshPostCounts(postId, token) {
  try {
    const [likeCount, commentCount, repostCount] = await Promise.all([
      fetchLikedcounts(postId),
      fetchCommentCounts(postId),
      fetchRepostCounts(postId)
    ]);
    
    // Find and update the post in the DOM
    const postElement = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    
    if (postElement) {
      const likeCountEl = postElement.querySelector('.like-count');
      const commentCountEl = postElement.querySelector('.comment-count');
      const repostCountEl = postElement.querySelector('.repost-count');
      
      if (likeCountEl) likeCountEl.textContent = likeCount;
      if (commentCountEl) commentCountEl.textContent = commentCount;
      if (repostCountEl) repostCountEl.textContent = repostCount;
    }
    
    return { likeCount, commentCount, repostCount };
  } catch (error) {
    console.error('Error refreshing post counts:', error);
  }
}

// POST ACTIONS (like, repost, comment, profile). If scope is provided, only attach to that card.
function attachPostActions(feed, token, scope = null, communityType = '') {
  const root = scope || feed;
  bindPostMenuActions(root, {
    communityType,
    resolvePost: async (postId) => {
      const card = findPostCard(root, postId);
      if (!card) return null;
      const imageEl = card.querySelector('.post-image');
      const nameEl = card.querySelector('.post-fullname');
      const contentEl = card.querySelector('.post-content');
      const post = await fetchPostById(postId).catch(() => null);
      return {
        ...(post || {}),
        post_id: postId,
        fullname: post?.fullname || nameEl?.textContent || 'You',
        content: post?.content ?? contentEl?.textContent ?? '',
        img_url: post?.img_url ?? imageEl?.getAttribute('data-full') ?? imageEl?.getAttribute('src') ?? null,
      };
    },
    onPostUpdated: (postId, updatedPost) => {
      const card = findPostCard(root, postId);
      if (!card) return;
      const contentEl = card.querySelector('.post-content');
      const existingImg = card.querySelector('.post-image');
      if (contentEl) {
        contentEl.textContent = updatedPost.content || 'No content available';
      }
      if (updatedPost.img_url) {
        if (existingImg) {
          existingImg.src = updatedPost.img_url;
          existingImg.dataset.full = updatedPost.img_url;
        } else {
          contentEl?.insertAdjacentHTML('afterend', `<img src="${updatedPost.img_url}" data-full="${updatedPost.img_url}" alt="Post Image" class="post-image" />`);
          attachLocalImageModal();
        }
      } else if (existingImg) {
        existingImg.remove();
      }
    },
    onPostDeleted: (postId) => {
      findPostCard(root, postId)?.remove();
    },
  });

  // Like
  root.querySelectorAll('.like-button').forEach(button => {
    button.addEventListener('click', async () => {
      const postId = button.getAttribute('data-post-id');
      const likeType = button.getAttribute('data-like-type');
      try {
        const likeCountElement = button.querySelector('.like-count');
        const likeIcon = button.querySelector('.material-icons');
        
        // Determine current state
        const currentlyLiked =
          button.classList.contains('liked') ||
          likeIcon.textContent.trim() === 'favorite';
        const nextLiked = !currentlyLiked;

        // Optimistic UI update: update icon immediately
        button.classList.toggle('liked', nextLiked);
        likeIcon.classList.toggle('liked', nextLiked);
        likeIcon.textContent = nextLiked ? 'favorite' : 'favorite_border';

        const updatedLikeData = await toggleLike(postId, likeType);

        // Use server only for counts; keep UI toggle as decided above
        if (updatedLikeData && typeof updatedLikeData.likes !== 'undefined') {
          likeCountElement.textContent = updatedLikeData.likes;
        }
        
        // Also update the post's stored counts for ranking if needed
        await refreshPostCounts(postId, token);
      } catch (error) {
        alert("Error updating like: " + error.message);
      }
    });
  });

  // Repost - UPDATED WITH BETTER ERROR HANDLING
  root.querySelectorAll('.repostbtn').forEach(button => {
    const postId = button.getAttribute('data-post-id');
    // Initialize button state based on current user's repost status
    checkIfUserReposted(postId)
      .then((hasReposted) => {
        setRepostButtonState(button, hasReposted);
      })
      .catch(() => {});

    button.addEventListener('click', async () => {
      const postId = button.getAttribute('data-post-id');
      const repostCountEl = button.querySelector('.repost-count');
      
      try {
        // First, check if user has already reposted
        const hasReposted = await checkIfUserReposted(postId);
        
        if (hasReposted) {
          setRepostButtonState(button, true);
          showToast('You have already reposted this post.', 'info');
          return;
        }
        
        // Perform the repost
        await repost(postId, token);
        
        // Always refresh the counts to get the updated repost count
        await refreshPostCounts(postId, token);
        
        // Lock repost action after successful repost
        setRepostButtonState(button, true);
        
      } catch (error) {
        console.error('Repost failed:', error);
        const message = error?.response?.data?.error || error.message;
        if (String(message).toLowerCase().includes('already reposted')) {
          setRepostButtonState(button, true);
        }
      }
    });
  });

  // Comment
  root.querySelectorAll('.comment-button').forEach(button => {
    button.addEventListener('click', async () => {
      const postId = button.getAttribute('data-post-id');
      const onCommentSubmitted = async () => {
        // Refresh comment count after comment is submitted
        await refreshPostCounts(postId, token);
        
        // Update the comment button to show commented state
        const commentIcon = button.querySelector('.material-icons');
        commentIcon.textContent = 'chat_bubble';
        button.classList.add('commented');
      };
      createCommentModal(postId, onCommentSubmitted);
    });
  });

  // Profile link
  root.querySelectorAll('.profile-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = link.getAttribute('data-user-id');
      sessionStorage.setItem('selectedUserId', userId);
      const activeCommunityType = resolveCommunityType(communityType);
      window.history.pushState(
        {},
        '',
        `/fanhub/community-platform/${activeCommunityType}/others-profile`,
      );
      window.dispatchEvent(new Event('popstate'));
    });
  });
}

function setRepostButtonState(button, isReposted) {
  if (!button) return;
  button.disabled = Boolean(isReposted);
  button.classList.toggle('reposted', Boolean(isReposted));
  if (isReposted) {
    button.style.color = '#e75480';
    button.style.opacity = '0.75';
    button.title = 'Already reposted';
  } else {
    button.style.color = '';
    button.style.opacity = '';
    button.title = '';
  }
}

// FIXED LOCAL IMAGE MODAL WITH DOWNLOAD FUNCTIONALITY
function attachLocalImageModal() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const closeBtn = document.querySelector('.modal-close');
  const downloadBtn = document.getElementById('download-btn');

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');
  const zoomLevelEl = document.getElementById('zoom-level');

  // Some views/routes render posts without the local image modal.
  // Skip listener binding safely when modal controls are missing.
  if (!modal || !modalImg || !closeBtn || !downloadBtn || !zoomInBtn || !zoomOutBtn) {
    return;
  }

  let currentImageUrl = '';
  let scale = 1;
  const minScale = 0.4;
  const maxScale = 3;

  function applyZoom(nextScale) {
    scale = Math.max(minScale, Math.min(maxScale, nextScale));
    modalImg.style.transform = `scale(${scale})`;
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  function resetModalState() {
    modal.style.display = 'none';
    modalImg.src = '';
    currentImageUrl = '';
    applyZoom(1);
  }

  // Image click
  document.querySelectorAll('.post-image').forEach((img) => {
    if (img.dataset.modalBound === '1') return;
    img.dataset.modalBound = '1';
    img.addEventListener('click', () => {
      modal.style.display = 'flex';
      currentImageUrl = img.dataset.full || img.src;
      modalImg.src = currentImageUrl;
      applyZoom(1);
    });
  });

  if (modal.dataset.bound === '1') {
    return;
  }
  modal.dataset.bound = '1';

  // ZOOM IN
  zoomInBtn.addEventListener('click', () => {
    applyZoom(scale + 0.2);
  });

  // ZOOM OUT
  zoomOutBtn.addEventListener('click', () => {
    applyZoom(scale - 0.2);
  });

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      applyZoom(1);
    });
  }

  // Download button
  downloadBtn.addEventListener('click', async () => {
    if (currentImageUrl) {
      await downloadImage(currentImageUrl);
    }
  });

  // Close X
  closeBtn.addEventListener('click', resetModalState);

  // Close by clicking outside modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      resetModalState();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (modal.style.display !== 'flex') return;
    if (e.key === 'Escape') {
      resetModalState();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      applyZoom(scale + 0.2);
      return;
    }
    if (e.key === '-' || e.key === '_') {
      applyZoom(scale - 0.2);
    }
  });
}
// DOWNLOAD IMAGE FUNCTION
async function downloadImage(imageUrl) {
  try {
    const downloadUrl = convertToDownloadableUrl(imageUrl);
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to fetch image');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = getFilenameFromUrl(imageUrl) || `image-${Date.now()}.jpg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

  } catch (error) {
    console.error('Download failed:', error);
    fallbackDownload(imageUrl);
  }
}

// CONVERT CLOUDINARY URL TO DIRECT DOWNLOAD
function convertToDownloadableUrl(url) {
  try {
    // If it's a Cloudinary URL, add download parameter
    if (url.includes('cloudinary.com')) {
      // Remove any existing download parameters and add fl_attachment
      const urlObj = new URL(url);
      
      // Add download parameter - method 1: add fl_attachment
      if (!urlObj.pathname.includes('/fl_attachment/')) {
        const pathParts = urlObj.pathname.split('/');
        const uploadIndex = pathParts.findIndex(part => part === 'upload');
        
        if (uploadIndex !== -1 && pathParts.length > uploadIndex + 1) {
          // Insert fl_attachment after upload
          pathParts.splice(uploadIndex + 1, 0, 'fl_attachment');
          urlObj.pathname = pathParts.join('/');
        }
      }
      
      return urlObj.toString();
    }
    
    // For non-Cloudinary URLs, return as is
    return url;
  } catch (e) {
    // If URL parsing fails, return original URL
    return url;
  }
}

// ALTERNATIVE CLOUDINARY DOWNLOAD METHOD
function convertCloudinaryUrl(url) {
  try {
    if (url.includes('cloudinary.com')) {
      const urlObj = new URL(url);
      
      // Method 2: Add download parameter as query
      urlObj.searchParams.set('_a', 'AVAJpyaS'); // This triggers download in some cases
      
      return urlObj.toString();
    }
    return url;
  } catch (e) {
    return url;
  }
}

// FALLBACK DOWNLOAD METHOD
function fallbackDownload(imageUrl) {
  try {
    const link = document.createElement('a');
    link.href = imageUrl;
    
    // Force download attribute
    const filename = getFilenameFromUrl(imageUrl) || `image-${Date.now()}.jpg`;
    link.download = filename;
    link.target = '_blank'; // Open in new tab as fallback
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show message to user
    alert('If download did not start automatically, right-click on the image and select "Save image as..."');
  } catch (error) {
    console.error('Fallback download failed:', error);
    alert('Download failed. Please try right-clicking on the image and selecting "Save image as..."');
  }
}

// EXTRACT FILENAME FROM URL - IMPROVED
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract filename from path
    let filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    
    // Remove Cloudinary version numbers if present
    filename = filename.replace(/^v\d+\//, '');
    
    // Ensure it has an extension
    if (!filename.includes('.')) {
      filename += '.jpg';
    }
    
    return filename || null;
  } catch (e) {
    // If URL parsing fails, try simple extraction
    const matches = url.match(/\/([^\/?#]+)(?:\?[^#]*)?(?:#.*)?$/);
    let filename = matches ? matches[1] : null;
    
    if (filename && !filename.includes('.')) {
      filename += '.jpg';
    }
    
    return filename;
  }
}

// FORMAT DATE FUNCTION
function formatDate(timestamp) {
  return formatUserTimestamp(timestamp);
}

