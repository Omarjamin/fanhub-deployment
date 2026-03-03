import { createComment, getComments } from '../../../services/bini_services/post/create-comment-api.js';
import api from '../../../services/bini_services/api.js';
import { socket, setupSocket } from '../../../hooks/bini_hooks/socket.js';
import '../../../styles/bini_styles/comment.css';
import { getActiveSiteSlug, getSessionToken } from '../../../lib/site-context.js';

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
          <textarea id="newCommentText" placeholder="Write a comment..."></textarea>
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
    addCommentBtn.disabled = !newCommentText.value.trim();
  });

  addCommentBtn.addEventListener('click', async () => {
    const content = newCommentText.value.trim();
    const authToken = getStoredItem('authToken');
    
    if (!authToken) {
      errorMessage.textContent = 'You must be logged in to comment';
      errorMessage.style.display = 'block';
      return;
    }

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
        <h4 class="comment-fullname comment-profile-link" data-user-id="${comment.user_id || ''}">${comment.fullname}</h4>
        <span class="comment-time">${timeString}</span>
      </div>
      <p class="comment-content">${comment.content}</p>
      <div class="comment-actions">
        <button class="reply-button" data-comment-id="${comment.comment_id}">
          <span class="material-icons" style="font-size: 1rem;">reply</span>
          <span>Reply</span>
        </button>
        <div class="reply-count" style="display: none; font-size: 0.85rem; color: #65676b; cursor: pointer; margin-left: 12px;">
          <!-- Reply count will be populated here -->
        </div>
      </div>
      <div class="replies">
        <!-- Replies will be dynamically rendered here -->
      </div>
      <div class="reply-input">
        <textarea class="reply-text" placeholder="Write a reply..."></textarea>
        <button class="submit-reply-btn" disabled>Submit Reply</button>
      </div>
    </div>
  `;

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
  replyButton.addEventListener('click', async () => {
    const isShowing = repliesContainer.classList.contains('show');
    
    if (!isShowing) {
      repliesContainer.classList.add('show');
      try {
        const replies = await getReplies(comment.comment_id, token);
        if (!replies || replies.length === 0) {
          repliesContainer.innerHTML = '<p style="color: #65676b; font-size: 0.9rem; padding: 8px 0;">No replies yet.</p>';
          replyCountDiv.style.display = 'none';
        } else {
          // Update reply count
          replyCountDiv.innerHTML = `<span>${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>`;
          replyCountDiv.style.display = 'block';
          
          repliesContainer.innerHTML = ''; 
          replies.forEach(reply => {
            const replyElement = document.createElement('div');
            replyElement.classList.add('reply');
            const replyDate = formatCommentTime(new Date(reply.created_at));
            replyElement.innerHTML = `
              <div>
                <h5 class="reply-profile-link" data-user-id="${reply.user_id || ''}">${reply.fullname} <span style="font-size: 0.8rem; color: #65676b; font-weight: 400;">${replyDate}</span></h5>
                <p>${reply.content}</p>
              </div>
            `;
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
        repliesContainer.innerHTML = '<p style="color: #c53030;">Error fetching replies: ' + err.message + '</p>';
      }
    } else {
      repliesContainer.classList.remove('show');
    }

    replyInput.classList.toggle('show');
  });

  // Show reply count on initial load
  replyButton.addEventListener('mouseenter', async () => {
    if (replyCountDiv.innerHTML === '') {
      try {
        const replies = await getReplies(comment.comment_id, token);
        if (replies && replies.length > 0) {
          replyCountDiv.innerHTML = `<span>${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>`;
          replyCountDiv.style.display = 'block';
        }
      } catch (err) {
        // Silent fail on hover
      }
    }
  });

  // REPLY TEXT INPUT HANDLER
  replyText.addEventListener('input', () => {
    submitReplyBtn.disabled = !replyText.value.trim();
  });

  
  submitReplyBtn.addEventListener('click', async () => {
    const content = replyText.value.trim();
    try {
      if (comment.comment_id === null || comment.comment_id === undefined) throw new Error('Invalid comment id');
      await postReply(comment.comment_id, content, token);
      replyText.value = ''; 
      submitReplyBtn.disabled = true;

      
      repliesContainer.style.display = 'none'; 
      replyInput.style.display = 'none';
      repliesContainer.innerHTML = ''; 
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
  if (!content || !content.trim()) throw new Error('Reply content is required');
  if (!token) throw new Error('Authentication required to post replies');

  try {
    const response = await api.post(`/bini/comments/reply/${commentId}`, { content });
    return response.data;
  } catch (error) {
    const details = error.response?.data?.message || error.message;
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
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Format as date for older comments
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}
