import fetchSuggestedFollowers from '../../../services/bini_services/post/fetchSuggestedFollowers.js';
import fetchSearchAll from '../../../services/bini_services/search/fetchSearch.js';
import { fetchHashtagPosts } from '../../../services/bini_services/search/fetchSearch.js';
import { fetchPostsByQuery } from '../../../services/bini_services/search/fetchSearch.js';
import follow from '../../../services/bini_services/post/fetchFollow.js';
import { renderThreadsSidebar } from '../threadsSidebar.js';
import api from '../../../services/bini_services/api.js';
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from '../../../lib/site-context.js';

const DEFAULT_PROFILE_IMAGE = '/circle-user.png';

function resolveCommunityType(data = {}) {
  const fromData = String(data?.community_type || data?.communityType || data?.communityData?.community_type || "").trim().toLowerCase();
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
  return "";
}

export default async function Search_(root, data = {}) {
  const communityType = resolveCommunityType(data);
  const basePath = communityType ? `/fanhub/community-platform/${encodeURIComponent(communityType)}` : "/bini";
  if (communityType) {
    setActiveSiteSlug(communityType);
  }

  const threadsSidebar = await renderThreadsSidebar();
  
  const component = document.createElement('div');
  component.innerHTML = `
    <div class="search-container" id="searchContainer" style="position:relative;">
      <div class="search-bar" style="position:relative;">
        <img src="/search.png" alt="Search Icon" class="search-icon" id="searchIcon">
        <input type="text" id="searchInput" autocomplete="off">
        <button id="searchBtn" style="display:none"></button>
      </div>
      <div class="homepage-right">
        ${threadsSidebar.html}
      </div>
      <div class="search-results"></div>
      <div class="search-suggest_to_follow"></div>
    </div>
  `;

  root.appendChild(component);
  
  // Setup click handlers for threads
  const threadsSidebarContainer = component.querySelector('.threads-sidebar');
  if (threadsSidebarContainer && threadsSidebar.setupClickHandlers) {
    threadsSidebar.setupClickHandlers(threadsSidebarContainer);
  }

  const searchIcon = component.querySelector('#searchIcon');
  const searchInput = component.querySelector('#searchInput');
  const searchBtn = component.querySelector('#searchBtn');
  const searchResults = component.querySelector('.search-results');
  const suggestToFollowDiv = component.querySelector('.search-suggest_to_follow');
  const activeSite = getActiveSiteSlug(communityType) || communityType;
  const token = getSessionToken(activeSite);
  let searchModal = null;
  let postViewerModal = null;

  function setSuggestionsVisible(visible) {
    suggestToFollowDiv.style.display = visible ? '' : 'none';
  }

  function navigateToProfile(userId) {
    if (!userId) return;
    sessionStorage.setItem('selectedUserId', String(userId));
    window.history.pushState(
      {},
      '',
      `${basePath}/others-profile?userId=${encodeURIComponent(String(userId))}`,
    );
    window.dispatchEvent(new Event('popstate'));
  }

  function navigateToPost(postId) {
    if (!postId) return;
    sessionStorage.setItem('focusPostId', String(postId));
    window.history.pushState({}, '', `${basePath}`);
    window.dispatchEvent(new Event('popstate'));
  }

  if (!token) {
    alert('Please login first.');
    return;
  }

  // Overlay dropdown for user search
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.style.display = 'none';
  overlay.style.position = 'absolute';
  overlay.style.background = '#fff';
  overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  overlay.style.width = '100%';
  overlay.style.maxHeight = '250px';
  overlay.style.overflowY = 'auto';
  overlay.style.zIndex = '1000';
  overlay.style.borderRadius = '8px';
  overlay.style.top = '50px'; // adjust if needed
  overlay.style.left = '0';
  overlay.style.padding = '0';

  component.querySelector('.search-bar').appendChild(overlay);

  // Hide icon on focus or when typing
  searchInput.addEventListener('focus', () => {
    searchIcon.style.display = 'none';
  });

  searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim();
    if (!query) {
      searchIcon.style.display = '';
      overlay.style.display = 'none';
      searchResults.innerHTML = '';
      setSuggestionsVisible(true);
      return;
    }

    searchIcon.style.display = 'none';
    setSuggestionsVisible(false);
    await handleSearchQuery(query, { live: true });
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => { overlay.style.display = 'none'; }, 150);
    if (searchInput.value.length === 0) {
      searchIcon.style.display = '';
    }
  });

  // Allow pressing Enter to search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchBtn.click();
    }
  });

  // Overlay pointerdown: go to user profile (use pointerdown so it fires before input blur)
  overlay.addEventListener('pointerdown', function(e) {
    const li = e.target.closest('.search-overlay-item');
    if (li) {
      e.preventDefault();
      const userId = li.getAttribute('data-userid');
      navigateToProfile(userId);
      // Optionally clear search input and hide overlay
      searchInput.value = '';
      overlay.style.display = 'none';
    }
  });

  // Search button click
  searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (query) {
      setSuggestionsVisible(false);
      await handleSearchQuery(query, { live: false });
    } else {
      searchResults.innerHTML = '<p>Please enter a search term.</p>';
      setSuggestionsVisible(true);
    }
  });

  async function handleSearchQuery(query, options = {}) {
    const { live = false } = options;
    const normalizedQuery = String(query || '').trim();
    const hashtagOnlyQuery = normalizedQuery.replace(/^#+/, '');

    if (normalizedQuery.startsWith('#')) {
      overlay.style.display = 'none';
      try {
        const { posts } = await fetchHashtagPosts(token, normalizedQuery);
        const safePosts = Array.isArray(posts) ? posts : [];
        const finalPosts = safePosts.length > 0 ? safePosts : await fallbackHashtagSearch(normalizedQuery);
        renderCombinedResults({
          users: [],
          posts: finalPosts,
          query: normalizedQuery,
          live,
          postLabel: 'Hashtag',
        });
      } catch (_) {
        const fallbackPosts = await fallbackHashtagSearch(normalizedQuery);
        renderCombinedResults({
          users: [],
          posts: fallbackPosts,
          query: normalizedQuery,
          live,
          postLabel: 'Hashtag',
        });
      }
      return;
    }

    searchResults.innerHTML = '';
    try {
      const { users } = await fetchSearchAll(token, query);
      overlay.style.display = 'none';

      let resolvedPosts = [];
      if (!live) {
        try {
          const { posts } = await fetchPostsByQuery(token, normalizedQuery);
          const safePosts = Array.isArray(posts) ? posts : [];
          resolvedPosts = safePosts.length > 0 ? safePosts : await fallbackPostSearch(normalizedQuery);
        } catch (_) {
          resolvedPosts = await fallbackPostSearch(normalizedQuery);
        }
      } else {
        try {
          const { posts } = await fetchPostsByQuery(token, normalizedQuery);
          const safePosts = Array.isArray(posts) ? posts : [];
          resolvedPosts =
            safePosts.length > 0
              ? safePosts
              : await fallbackPostSearch(
                  hashtagOnlyQuery ? `#${hashtagOnlyQuery}` : normalizedQuery,
                );
        } catch (_) {
          resolvedPosts = await fallbackPostSearch(normalizedQuery);
        }
      }

      renderCombinedResults({
        users: Array.isArray(users) ? users : [],
        posts: resolvedPosts,
        query: normalizedQuery,
        live,
        postLabel: 'Posts',
      });
    } catch (_) {
      overlay.style.display = 'none';
      searchResults.innerHTML = `<p style="margin-top:8px;color:#555;">Search failed.</p>`;
    }
  }

  async function fallbackHashtagSearch(hashtagQuery) {
    const raw = String(hashtagQuery || '').trim();
    const target = raw.startsWith('#') ? raw.toLowerCase() : `#${raw.toLowerCase()}`;
    const targetWithoutHash = target.replace(/^#/, '');
    try {
      const response = await api.get('/bini/posts/getrandomposts', { params: { limit: 100, offset: 0 } });
      const posts = Array.isArray(response.data)
        ? response.data
        : (response.data?.posts || response.data?.data || []);
      return posts.filter((post) => {
        const tags = Array.isArray(post.tags)
          ? post.tags
          : (post.tags ? String(post.tags).split(',') : []);
        return tags.some((tag) => {
          const normalizedTag = String(tag).trim().toLowerCase();
          return normalizedTag === target || normalizedTag.replace(/^#/, '') === targetWithoutHash;
        });
      });
    } catch (_) {
      return [];
    }
  }

  async function fallbackPostSearch(searchQuery) {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return [];
    try {
      const response = await api.get('/bini/posts/getrandomposts', { params: { limit: 120, offset: 0 } });
      const posts = Array.isArray(response.data)
        ? response.data
        : (response.data?.posts || response.data?.data || []);
      return posts.filter((post) => {
        const content = String(post.content || '').toLowerCase();
        const tags = Array.isArray(post.tags)
          ? post.tags
          : (post.tags ? String(post.tags).split(',') : []);
        const hasTag = tags.some((tag) => String(tag).toLowerCase().includes(query));
        return content.includes(query) || hasTag;
      });
    } catch (_) {
      return [];
    }
  }

  function ensureSearchModal() {
    if (searchModal && searchModal.isConnected) return searchModal;
    searchModal = document.createElement('div');
    searchModal.className = 'search-post-modal';
    searchModal.innerHTML = `
      <div class="search-post-modal-dialog">
        <div class="search-post-modal-header">
          <h3 class="search-post-modal-title">Search Results</h3>
          <button class="search-post-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="search-post-modal-body"></div>
      </div>
    `;
    document.body.appendChild(searchModal);
    const closeBtn = searchModal.querySelector('.search-post-modal-close');
    closeBtn?.addEventListener('click', () => {
      searchModal.classList.remove('open');
    });
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) searchModal.classList.remove('open');
    });
    return searchModal;
  }

  function openPostResultsModal(posts, query, titlePrefix = 'Posts') {
    const modal = ensureSearchModal();
    const title = modal.querySelector('.search-post-modal-title');
    const body = modal.querySelector('.search-post-modal-body');
    const safePosts = Array.isArray(posts) ? posts : [];
    if (title) title.textContent = `${titlePrefix} for "${query}"`;

    if (body) {
      if (!safePosts.length) {
        body.innerHTML = `<p class="search-modal-empty">No matching posts found.</p>`;
      } else {
        body.innerHTML = `
          <div class="search-post-grid">
            ${safePosts.map((post) => {
              const tags = Array.isArray(post.tags) ? post.tags : [];
              return `
                <article class="search-post-card" data-post-id="${post.post_id}" data-user-id="${post.user_id || ''}">
                  <div class="search-post-author">
                    <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" class="search-post-avatar search-profile-link" data-user-id="${post.user_id || ''}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'" alt="${post.fullname || 'User'}">
                    <div class="search-post-meta">
                      <strong class="search-profile-link" data-user-id="${post.user_id || ''}">${post.fullname || 'Unknown User'}</strong>
                      <span>${formatRelativeTime(post.created_at)}</span>
                    </div>
                  </div>
                  <p class="search-post-content">${post.content || ''}</p>
                  ${post.img_url ? `<img src="${post.img_url}" class="search-post-image" alt="Post image">` : ''}
                  ${tags.length ? `<div class="search-post-tags">${tags.join(' ')}</div>` : ''}
                </article>
              `;
            }).join('')}
          </div>
        `;
        body.querySelectorAll('.search-post-card').forEach((card, index) => {
          card.addEventListener('click', () => navigateToPost(safePosts[index]?.post_id));
        });
        body.querySelectorAll('.search-profile-link').forEach((link) => {
          link.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateToProfile(link.getAttribute('data-user-id'));
          });
        });
      }
    }

    modal.classList.add('open');
  }

  function formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  function renderInlinePostPreview(posts, query, label = 'Posts') {
    const safePosts = Array.isArray(posts) ? posts : [];
    const preview = safePosts.slice(0, 3);
    if (!preview.length) {
      searchResults.innerHTML = `<p style="margin-top:8px;color:#555;">No ${label.toLowerCase()} found for <strong>${query}</strong>.</p>`;
      return;
    }

    searchResults.innerHTML = `
      <div class="search-live-preview">
        <div class="search-live-preview-head">
          <strong>${label} preview (${safePosts.length})</strong>
          <span>Press Enter for full results</span>
        </div>
        ${preview.map((post, index) => `
          <button type="button" class="search-live-preview-item" data-preview-index="${index}" data-post-id="${post.post_id}">
            <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'" alt="${post.fullname || 'User'}" class="search-live-preview-avatar search-profile-link" data-user-id="${post.user_id || ''}">
            <div style="min-width:0;">
              <div class="search-live-preview-name search-profile-link" data-user-id="${post.user_id || ''}">${post.fullname || 'Unknown User'}</div>
              <div class="search-live-preview-text">${post.content || ''}</div>
            </div>
          </button>
        `).join('')}
      </div>
    `;
    searchResults.querySelectorAll('.search-live-preview-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = Number(item.getAttribute('data-preview-index'));
        const post = preview[idx];
        if (post?.post_id) navigateToPost(post.post_id);
      });
    });
    searchResults.querySelectorAll('.search-profile-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigateToProfile(link.getAttribute('data-user-id'));
      });
    });
  }

  function renderFullPostResults(posts, query, label = 'Posts') {
    const safePosts = Array.isArray(posts) ? posts : [];
    if (!safePosts.length) {
      searchResults.innerHTML = `<p style="margin-top:8px;color:#555;">No ${label.toLowerCase()} found for <strong>${query}</strong>.</p>`;
      return;
    }

    searchResults.innerHTML = `
      <div class="search-live-preview">
        <div class="search-live-preview-head">
          <strong>${label} results (${safePosts.length})</strong>
          <span>Showing matching posts</span>
        </div>
        ${safePosts.map((post, index) => `
          <button type="button" class="search-live-preview-item" data-result-index="${index}" data-post-id="${post.post_id}">
            <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'" alt="${post.fullname || 'User'}" class="search-live-preview-avatar search-profile-link" data-user-id="${post.user_id || ''}">
            <div style="min-width:0;">
              <div class="search-live-preview-name search-profile-link" data-user-id="${post.user_id || ''}">${post.fullname || 'Unknown User'}</div>
              <div class="search-live-preview-text">${post.content || ''}</div>
            </div>
          </button>
        `).join('')}
      </div>
    `;

    searchResults.querySelectorAll('.search-live-preview-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = Number(item.getAttribute('data-result-index'));
        const post = safePosts[idx];
        if (post?.post_id) navigateToPost(post.post_id);
      });
    });
    searchResults.querySelectorAll('.search-profile-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigateToProfile(link.getAttribute('data-user-id'));
      });
    });
  }

  function renderCombinedResults({ users = [], posts = [], query = '', live = false, postLabel = 'Posts' }) {
    const safeUsers = Array.isArray(users) ? users : [];
    const safePosts = Array.isArray(posts) ? posts : [];

    if (!safeUsers.length && !safePosts.length) {
      searchResults.innerHTML = `<p style="margin-top:8px;color:#555;">No results found for <strong>${query}</strong>.</p>`;
      return;
    }

    const userPreview = live ? safeUsers.slice(0, 5) : safeUsers;
    const postPreview = live ? safePosts.slice(0, 5) : safePosts;

    searchResults.innerHTML = `
      <div class="search-results-stack">
        ${
          userPreview.length
            ? `
          <section class="search-result-section">
            <div class="search-live-preview-head">
              <strong>Users (${safeUsers.length})</strong>
              <span>${live ? 'Matching profiles' : 'All matching profiles'}</span>
            </div>
            <div class="search-result-list">
              ${userPreview.map((user) => `
                <button type="button" class="search-live-preview-item search-user-result-item" data-user-id="${user.user_id}">
                  <img src="${user.profile_picture || DEFAULT_PROFILE_IMAGE}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'" alt="${user.fullname || 'User'}" class="search-live-preview-avatar">
                  <div style="min-width:0;">
                    <div class="search-live-preview-name">${user.fullname || 'Unknown User'}</div>
                    <div class="search-live-preview-text">${user.username || 'User profile'}</div>
                  </div>
                </button>
              `).join('')}
            </div>
          </section>
        `
            : ''
        }
        ${
          postPreview.length
            ? `
          <section class="search-result-section">
            <div class="search-live-preview-head">
              <strong>${postLabel} (${safePosts.length})</strong>
              <span>${live ? 'Matching posts' : 'All matching posts'}</span>
            </div>
            <div class="search-result-list">
              ${postPreview.map((post, index) => `
                <button type="button" class="search-live-preview-item search-post-result-item" data-result-index="${index}" data-post-id="${post.post_id}">
                  <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'" alt="${post.fullname || 'User'}" class="search-live-preview-avatar search-profile-link" data-user-id="${post.user_id || ''}">
                  <div style="min-width:0;">
                    <div class="search-live-preview-name search-profile-link" data-user-id="${post.user_id || ''}">${post.fullname || 'Unknown User'}</div>
                    <div class="search-live-preview-text">${post.content || ''}</div>
                  </div>
                </button>
              `).join('')}
            </div>
          </section>
        `
            : ''
        }
      </div>
    `;

    searchResults.querySelectorAll('.search-user-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        navigateToProfile(item.getAttribute('data-user-id'));
      });
    });

    searchResults.querySelectorAll('.search-post-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = Number(item.getAttribute('data-result-index'));
        const post = postPreview[idx];
        if (post?.post_id) navigateToPost(post.post_id);
      });
    });

    searchResults.querySelectorAll('.search-profile-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigateToProfile(link.getAttribute('data-user-id'));
      });
    });
  }

  function ensurePostViewerModal() {
    if (postViewerModal && postViewerModal.isConnected) return postViewerModal;
    postViewerModal = document.createElement('div');
    postViewerModal.className = 'search-post-viewer-modal';
    postViewerModal.innerHTML = `
      <div class="search-post-viewer-dialog">
        <div class="search-post-viewer-header">
          <h3>Post preview</h3>
          <button class="search-post-viewer-close" aria-label="Close">&times;</button>
        </div>
        <div class="search-post-viewer-body"></div>
      </div>
    `;
    document.body.appendChild(postViewerModal);
    postViewerModal.querySelector('.search-post-viewer-close')?.addEventListener('click', () => {
      postViewerModal.classList.remove('open');
    });
    postViewerModal.addEventListener('click', (e) => {
      if (e.target === postViewerModal) postViewerModal.classList.remove('open');
    });
    return postViewerModal;
  }

  function openPostViewer(post) {
    if (!post) return;
    const modal = ensurePostViewerModal();
    const body = modal.querySelector('.search-post-viewer-body');
    const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',') : []);
    const likeCount = Number(post.likeCount ?? post.like_count ?? post.likes ?? 0) || 0;
    const commentCount = Number(post.commentCount ?? post.comment_count ?? post.comments ?? 0) || 0;
    const repostCount = Number(post.repostCount ?? post.repost_count ?? post.reposts ?? 0) || 0;
    body.innerHTML = `
      <article class="search-post-viewer-card">
        <div class="search-post-author">
          <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" class="search-post-avatar" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'" alt="${post.fullname || 'User'}">
          <div class="search-post-meta">
            <strong>${post.fullname || 'Unknown User'}</strong>
            <span>${formatRelativeTime(post.created_at)}</span>
          </div>
        </div>
        <p class="search-post-content">${post.content || ''}</p>
        ${post.img_url ? `<img src="${post.img_url}" class="search-post-image" alt="Post image">` : ''}
        ${tags.length ? `<div class="search-post-tags">${tags.join(' ')}</div>` : ''}
        <div class="search-post-viewer-actions">
          <div class="search-post-viewer-action"><span class="material-icons">favorite_border</span><span>${likeCount}</span></div>
          <div class="search-post-viewer-action"><span class="material-icons">chat_bubble_outline</span><span>${commentCount}</span></div>
          <div class="search-post-viewer-action"><span class="material-icons">repeat</span><span>${repostCount}</span></div>
        </div>
      </article>
    `;
    modal.classList.add('open');
  }

  function renderHashtagResults(posts, hashtag) {
    const safePosts = Array.isArray(posts) ? posts : [];

    if (!safePosts.length) {
      searchResults.innerHTML = `<p>No posts found for <strong>${hashtag}</strong>.</p>`;
      return;
    }

    searchResults.innerHTML = `
      <div class="hashtag-results">
        <h4 style="margin:12px 0;">Results for ${hashtag}</h4>
        ${safePosts.map((post) => {
          const tags = Array.isArray(post.tags) ? post.tags : [];
          return `
            <div class="post-card" style="margin-bottom:12px;padding:12px;border:1px solid #eee;border-radius:10px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <img src="${post.profile_picture || DEFAULT_PROFILE_IMAGE}" alt="${post.fullname || 'User'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'">
                <strong>${post.fullname || 'Unknown User'}</strong>
              </div>
              <div>${post.content || ''}</div>
              ${post.img_url ? `<img src="${post.img_url}" alt="Post image" style="max-width:100%;margin-top:8px;border-radius:8px;">` : ''}
              ${tags.length ? `<div style="margin-top:8px;color:#666;">${tags.join(' ')}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- SUGGESTED FOLLOWERS LOGIC ---
  const BATCH_SIZE = 10;
  let displayedOffset = 0;
  let hasMoreSuggestions = true;

  async function loadSuggestedFollowers(offset = 0, append = false) {
    try {
      const suggestions = await fetchSuggestedFollowers(token, BATCH_SIZE, offset);
      hasMoreSuggestions = suggestions && suggestions.length >= BATCH_SIZE;
      renderSuggestedFollowers(suggestions, append);
      if (!append) displayedOffset = suggestions ? suggestions.length : 0;
      else displayedOffset += suggestions ? suggestions.length : 0;
      updateShowMoreButton();
    } catch (err) {
      if (!append) suggestToFollowDiv.innerHTML = '<p>Failed to load suggestions.</p>';
    }
  }

  function updateShowMoreButton() {
    const btn = suggestToFollowDiv.querySelector('.show-more-btn');
    if (btn) btn.style.display = hasMoreSuggestions ? 'inline-flex' : 'none';
  }

  async function renderSuggestedFollowers(users, append = false) {
    const existingUl = suggestToFollowDiv.querySelector('.suggested-follow-list');
    if (!append || !existingUl) {
      if (!users || !users.length) {
        suggestToFollowDiv.innerHTML = '<p>No suggestions found.</p>';
        return;
      }
      suggestToFollowDiv.innerHTML = `
        <ul class="suggested-follow-list">
          ${users.map(user => buildUserRow(user)).join('')}
        </ul>
        <div class="show-more-wrap" style="text-align:center;margin-top:1rem;">
          <button class="show-more-btn" style="display:none;">Show More</button>
        </div>
      `;
    } else if (users && users.length) {
      users.forEach(user => {
        const temp = document.createElement('div');
        temp.innerHTML = buildUserRow(user);
        existingUl.appendChild(temp.firstElementChild);
      });
    }
    bindSuggestedRowEvents();
    bindShowMoreEvent();
  }

  function buildUserRow(user) {
    return `
      <li class="suggested-user-row" data-userid="${user.user_id}" style="cursor:pointer;">
      
        <img src="${user.profile_picture || '/circle-user.png'}" alt="${user.fullname}" class="suggested-user-image" onerror="this.src='/circle-user.png';">
        <div class="suggested-user-info">
          <span class="suggested-fullname">${user.fullname}</span>
          <span class="suggested-followers">${user.followers_count} followers</span>
        </div>
        <button class="follow-btn" data-userid="${user.user_id}">Follow</button>
      </li>
    `;
  }

  function bindSuggestedRowEvents() {
    suggestToFollowDiv.querySelectorAll('.suggested-user-row').forEach(li => {
      li.replaceWith(li.cloneNode(true)); // remove old listeners
    });
    const rows = suggestToFollowDiv.querySelectorAll('.suggested-user-row');
    rows.forEach(li => {
      li.addEventListener('click', function(e) {
        if (e.target.classList.contains('follow-btn')) return;
        const userId = this.getAttribute('data-userid');
        sessionStorage.setItem('selectedUserId', userId);
        window.history.pushState(
          {},
          '',
          `${basePath}/others-profile?userId=${encodeURIComponent(String(userId))}`,
        );
        window.dispatchEvent(new Event('popstate'));
      });
    });
    suggestToFollowDiv.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const userId = this.getAttribute('data-userid');
        const row = this.closest('.suggested-user-row');
        const fullname = row?.querySelector('.suggested-fullname')?.textContent || 'user';
        try {
          await follow(userId, token);
          alert(`You are now following ${fullname}`);
          row.remove();
          const next = await fetchSuggestedFollowers(token, 1, displayedOffset);
          if (next && next.length) {
            const ul = suggestToFollowDiv.querySelector('.suggested-follow-list');
            if (ul) {
              const temp = document.createElement('div');
              temp.innerHTML = buildUserRow(next[0]);
              ul.appendChild(temp.firstElementChild);
              displayedOffset++;
              bindSuggestedRowEvents();
            }
          }
        } catch (err) {
          alert('Failed to follow. Please try again.');
        }
      });
    });
  }

  function bindShowMoreEvent() {
    const btn = suggestToFollowDiv.querySelector('.show-more-btn');
    if (btn) {
      btn.onclick = () => loadSuggestedFollowers(displayedOffset, true);
    }
  }

  loadSuggestedFollowers(0, false);
  setSuggestionsVisible(true);
}


