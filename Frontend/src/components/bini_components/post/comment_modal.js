import { createComment, getComments } from '../../../services/bini_services/post/create-comment-api.js';
import api from '../../../services/bini_services/api.js';
import { socket, setupSocket } from '../../../hooks/bini_hooks/socket.js';
import '../../../styles/bini_styles/comment.css';
import { getActiveSiteSlug, getSessionToken } from '../../../lib/site-context.js';
import { formatUserTimestamp } from '../../../utils/user-time.js';
import {
  escapeHtml,
  resolveCommunitySubmissionError,
  sanitizeCommunityText,
  validateCommunityText,
} from '../../../utils/community-text.js';

const COMMUNITY_TEXT_MAX_LENGTH = 1000;

function getTextValidation(value, label = 'Content') {
  return validateCommunityText(value, {
    label,
    maxLength: COMMUNITY_TEXT_MAX_LENGTH,
  });
}

function syncSanitizedTextareaValue(textarea, label = 'Content') {
  if (!textarea) {
    return getTextValidation('', label);
  }

  const validation = getTextValidation(textarea.value, label);
  const sanitized = sanitizeCommunityText(textarea.value, {
    maxLength: COMMUNITY_TEXT_MAX_LENGTH,
  });
  if (textarea.value !== sanitized) {
    textarea.value = sanitized;
  }
  return validation;
}

function getStoredItem(key) {
  if (key === 'authToken') {
    return getSessionToken(getActiveSiteSlug());
  }
  return sessionStorage.getItem(key);
}

function setStoredItem(key, value) {
  sessionStorage.setItem(key, value);
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function resolveCurrentUser(authToken) {
  const rawUser = getStoredItem('user');
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      const userId = parsed?.id || parsed?.user_id;
      const userName = parsed?.name || parsed?.fullname || parsed?.username || null;
      if (userId) return { userId, userName };
    } catch (_) {}
  }

  const storedUserId =
    getStoredItem('userId') ||
    getStoredItem('currentUserId') ||
    getStoredItem('user_id');
  if (storedUserId) return { userId: storedUserId, userName: null };

  const payload = parseJwtPayload(authToken);
  const tokenUserId = payload?.id || payload?.user_id || payload?.sub;
  const tokenUserName = payload?.fullname || payload?.name || payload?.username || null;
  if (tokenUserId) {
    setStoredItem('userId', String(tokenUserId));
    return { userId: tokenUserId, userName: tokenUserName };
  }

  return null;
}

function navigateToProfile(userId) {
  if (!userId) return;
  setStoredItem('selectedUserId', String(userId));
  const siteSlug = getActiveSiteSlug();
  if (!siteSlug) return;
  window.history.pushState({}, '', `/fanhub/community-platform/${encodeURIComponent(siteSlug)}/others-profile`);
  window.dispatchEvent(new Event('popstate'));
}

export default function createCommentModal(postId, onCommentSubmitted = null) {
  // Initialize socket and use the returned instance (may be null if unauthenticated)
  const ws = setupSocket() || window.socket || (typeof socket !== 'undefined' ? socket : null);

  // Handle real-time messages
  const handleNewMessage = (message) => {
    if (message.post_id === postId) {
      loadComments();
    }
  };

  // Listen for new comments if socket is available
  if (ws && typeof ws.on === 'function') {
    ws.on('receive_comment', handleNewMessage);
  }

  // Clean up on modal close
  const cleanup = () => {
    if (ws && typeof ws.off === 'function') {
      ws.off('receive_comment', handleNewMessage);
    }
    const existingModal = document.querySelector('.comment-modal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
  };
  // Load comments function
  const loadComments = async () => {
    try {
      const commentList = document.getElementById('commentList');
      
      // Check if commentList element exists
      if (!commentList) {
        console.warn('Comment list element not found');
        return;
      }
      
      const token = getStoredItem('authToken');
      const comments = await getComments(postId, token);
      
      // Ensure comments is always an array
      if (!Array.isArray(comments)) {
        console.error('Comments is not an array:', comments);
        commentList.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
        return;
      }
      
      if (comments.length === 0) {
        commentList.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
        return;
      }
      
      commentList.innerHTML = '';
      comments.forEach(comment => renderComment(comment, commentList, token));
      
    } catch (error) {
      console.error('Error loading comments:', error);
      const commentList = document.getElementById('commentList');
      if (commentList) {
        commentList.innerHTML = 'Error loading comments. Please try again.';
      }
    }
  };
  const existingModal = document.querySelector('.comment-modal');
  if (existingModal) {
    document.body.removeChild(existingModal);
    return;
  }
  const modal = document.createElement('div');
  modal.classList.add('comment-modal');

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Comments</h3> 
        <button class="close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div id="commentList" class="comment-list"></div>
        <div class="add-comment">
          <textarea id="newCommentText" placeholder="Write a comment..." maxlength="${COMMUNITY_TEXT_MAX_LENGTH}"></textarea>
          <button id="addCommentBtn" disabled>Post Comment</button>
          <p class="error-message" style="display: none; color: red;">Error</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.close-btn').addEventListener('click', () => {
    cleanup();
  });
  const newCommentText = modal.querySelector('#newCommentText');
  const addCommentBtn = modal.querySelector('#addCommentBtn');
  const errorMessage = modal.querySelector('.error-message');
  // Initial load of comments
  loadComments();

  newCommentText.addEventListener('input', () => {
    errorMessage.style.display = 'none';
    addCommentBtn.disabled = !getTextValidation(newCommentText.value, 'Comment').isValid;
  });
  newCommentText.addEventListener('blur', () => {
    const validation = syncSanitizedTextareaValue(newCommentText, 'Comment');
    addCommentBtn.disabled = !validation.isValid;
  });

  addCommentBtn.addEventListener('click', async () => {
    const commentValidation = syncSanitizedTextareaValue(newCommentText, 'Comment');
    const authToken = getStoredItem('authToken');
    
    if (!authToken) {
      errorMessage.textContent = 'You must be logged in to comment';
      errorMessage.style.display = 'block';
      return;
    }

    if (!commentValidation.isValid) {
      errorMessage.textContent = commentValidation.errors[0];
      errorMessage.style.display = 'block';
      return;
    }

    const content = commentValidation.sanitized;
    newCommentText.value = content;

    try {
      await createComment(postId, content, authToken);
      newCommentText.value = '';
      addCommentBtn.disabled = true;
      
      // Emit the new comment via socket
      const currentUser = resolveCurrentUser(authToken);
      if (currentUser?.userId && ws && typeof ws.emit === 'function') {
        ws.emit('send_comment', {
          post_id: postId,
          content: content,
          user_id: currentUser.userId,
          user_name: currentUser.userName
        });
      } else if (!currentUser?.userId) {
        console.warn('User id not found for socket comment emit');
      }
      
      // Refresh local list immediately and notify caller (e.g. update post card count)
      await loadComments();
      if (typeof onCommentSubmitted === 'function') {
        await onCommentSubmitted();
      }
    } catch (err) {
      console.error('Error posting comment:', err);
        errorMessage.textContent = `Failed to post comment: ${err.message}`;
      errorMessage.style.display = 'block';
    }
  });
  function renderComment(comment, commentList, token) {
  const commentBox = document.createElement('div');
  commentBox.classList.add('comment-box');

  // Format the comment date
  const commentDate = new Date(comment.created_at);
  const timeString = formatCommentTime(commentDate);

  commentBox.innerHTML = `
    <div class="comment-content-wrapper">
      <div class="comment-header">
        <h4 class="comment-fullname comment-profile-link" data-user-id="${escapeHtml(comment.user_id || '')}">${escapeHtml(comment.fullname || 'User')}</h4>
        <span class="comment-time">${escapeHtml(timeString)}</span>
      </div>
      <p class="comment-content"></p>
      <div class="comment-actions">
        <button class="reply-button" data-comment-id="${escapeHtml(comment.comment_id)}">
          <span class="material-icons" style="font-size: 1rem;">reply</span>
          <span>Reply</span>
        </button>
        <div class="reply-count" style="display: inline-flex; font-size: 0.85rem; color: #65676b; cursor: pointer; margin-left: 12px;">
          <!-- Reply count will be populated here -->
        </div>
      </div>
      <div class="replies">
        <!-- Replies will be dynamically rendered here -->
      </div>
      <div class="reply-input">
        <textarea class="reply-text" placeholder="Write a reply..." maxlength="${COMMUNITY_TEXT_MAX_LENGTH}"></textarea>
        <button class="submit-reply-btn" disabled>Submit Reply</button>
      </div>
    </div>
  `;
  const commentContent = commentBox.querySelector('.comment-content');
  if (commentContent) {
    commentContent.textContent = sanitizeCommunityText(comment.content);
  }

  const replyButton = commentBox.querySelector('.reply-button');
  const repliesContainer = commentBox.querySelector('.replies');
  const replyCountDiv = commentBox.querySelector('.reply-count');
  const replyInput = commentBox.querySelector('.reply-input');
  const replyText = replyInput.querySelector('.reply-text');
  const submitReplyBtn = replyInput.querySelector('.submit-reply-btn');
  const commentName = commentBox.querySelector('.comment-profile-link');
  if (commentName && commentName.getAttribute('data-user-id')) {
    commentName.style.cursor = 'pointer';
    commentName.addEventListener('click', () => {
      cleanup();
      navigateToProfile(commentName.getAttribute('data-user-id'));
    });
  }

  // TOGGLE REPLIES AND REPLY INPUT
  const setReplyCount = (count) => {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
    replyCountDiv.innerHTML = `<span>${safeCount} ${safeCount === 1 ? 'reply' : 'replies'}</span>`;
    replyCountDiv.style.display = 'inline-flex';
    replyCountDiv.dataset.loaded = '1';
  };

  if (Array.isArray(comment.replies)) {
    setReplyCount(comment.replies.length);
  } else {
    setReplyCount(0);
    getReplies(comment.comment_id, token)
      .then((replies) => setReplyCount(Array.isArray(replies) ? replies.length : 0))
      .catch(() => {});
  }

  replyButton.addEventListener('click', async () => {
    const isShowing = repliesContainer.classList.contains('show');
    
    if (!isShowing) {
      repliesContainer.classList.add('show');
      try {
        const replies = await getReplies(comment.comment_id, token);
        if (!replies || replies.length === 0) {
          repliesContainer.innerHTML = '<p style="color: #65676b; font-size: 0.9rem; padding: 8px 0;">No replies yet.</p>';
          setReplyCount(0);
        } else {
          // Update reply count
          setReplyCount(replies.length);
          
          repliesContainer.innerHTML = ''; 
          replies.forEach(reply => {
            const replyElement = document.createElement('div');
            replyElement.classList.add('reply');
            const replyDate = formatCommentTime(new Date(reply.created_at));
            replyElement.innerHTML = `
              <div>
                <h5 class="reply-profile-link" data-user-id="${escapeHtml(reply.user_id || '')}">${escapeHtml(reply.fullname || 'User')} <span style="font-size: 0.8rem; color: #65676b; font-weight: 400;">${escapeHtml(replyDate)}</span></h5>
                <p class="reply-content"></p>
              </div>
            `;
            const replyContent = replyElement.querySelector('.reply-content');
            if (replyContent) {
              replyContent.textContent = sanitizeCommunityText(reply.content);
            }
            repliesContainer.appendChild(replyElement);
          });
          repliesContainer.querySelectorAll('.reply-profile-link').forEach((el) => {
            if (!el.getAttribute('data-user-id')) return;
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
              cleanup();
              navigateToProfile(el.getAttribute('data-user-id'));
            });
          });
        }
      } catch (err) {
        repliesContainer.innerHTML = `<p style="color: #c53030;">Error fetching replies: ${escapeHtml(err.message)}</p>`;
      }
    } else {
      repliesContainer.classList.remove('show');
    }

    replyInput.classList.toggle('show');
  });

  // REPLY TEXT INPUT HANDLER
  replyText.addEventListener('input', () => {
    submitReplyBtn.disabled = !getTextValidation(replyText.value, 'Reply').isValid;
  });
  replyText.addEventListener('blur', () => {
    const validation = syncSanitizedTextareaValue(replyText, 'Reply');
    submitReplyBtn.disabled = !validation.isValid;
  });

  
  submitReplyBtn.addEventListener('click', async () => {
    const replyValidation = syncSanitizedTextareaValue(replyText, 'Reply');
    try {
      if (!replyValidation.isValid) {
        throw new Error(replyValidation.errors[0]);
      }
      if (comment.comment_id === null || comment.comment_id === undefined) throw new Error('Invalid comment id');
      const content = replyValidation.sanitized;
      replyText.value = content;
      await postReply(comment.comment_id, content, token);
      replyText.value = ''; 
      submitReplyBtn.disabled = true;

      
      repliesContainer.classList.remove('show');
      replyInput.classList.remove('show');
      repliesContainer.innerHTML = ''; 
      replyButton.click();
    } catch (err) {
      console.error('Reply submission error:', err);
      alert(`Error submitting reply: ${err.message}`);
    }
  });
  commentList.appendChild(commentBox);
}
}
// POST REPLY FUNCTION
async function postReply(commentId, content, token) {
  if (commentId === null || commentId === undefined) throw new Error('Invalid comment id');
  const replyValidation = validateCommunityText(content, {
    label: 'Reply',
    maxLength: COMMUNITY_TEXT_MAX_LENGTH,
  });
  if (!replyValidation.isValid) throw new Error(replyValidation.errors[0]);
  if (!token) throw new Error('Authentication required to post replies');

  try {
    const response = await api.post(`/bini/comments/reply/${commentId}`, {
      content: replyValidation.sanitized,
    });
    return response.data;
  } catch (error) {
    const details = resolveCommunitySubmissionError(error, 'Failed to post reply.');
    throw new Error(`Failed to post reply: ${details}`);
  }
}
// TOGGLE LIKE FUNCTION
async function toggleLikecomment(commentId, token) {
  try {
    const response = await api.post(`/bini/likes/toggle/comment/${commentId}`);
    return response.data;
  } catch (error) {
    alert('Error toggling like: ' + error.message);
    throw error; 
  }
}
// FETCH IS LIKED STATUS FUNCTION
async function fetchIsLikedStatuscomment(Id, token) {
  try {
    const response = await api.get(`/bini/likes/check/comment/${Id}`);
    return response.data.isLiked;
  } catch (error) {
    alert('Error checking like status: ' + error.message);
    return false;
  }
}
// FETCH LIKED COUNTS FUNCTION
async function fetchLikedCountscomment(commentId, token) {
  try {
    const response = await api.get(`/bini/likes/count/comment/${commentId}`);
    return response.data.likeCount;
  } catch (error) {
    alert('Error fetching like count: ' + error.message);
    return 0;
  }
}
// GET REPLIES FUNCTION
async function getReplies(commentId, token) {
  try {
    if (commentId === null || commentId === undefined) return [];
    const response = await api.get(`/bini/comments/${commentId}/reply`);
    const data = response.data;

    return data.replies || [];  
  } catch (error) {
    console.error('Error fetching replies:', error.message);
    return [];  
  }
}

// FORMAT COMMENT TIME FUNCTION
function formatCommentTime(date) {
  return formatUserTimestamp(date);
}
