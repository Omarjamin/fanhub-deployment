import api from '../../../services/bini_services/api.js';
import { getActiveSiteSlug, getSessionToken } from '../../../lib/site-context.js';
import { showToast } from '../../../utils/toast.js';
import {
  resolveCommunitySubmissionError,
  sanitizeCommunityText,
  validateCommunityText,
} from '../../../utils/community-text.js';
import {
  DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES,
  IMAGE_UPLOAD_ACCEPT_ATTR,
  validateSingleImageFile,
} from '../../../utils/image-upload.js';

const POST_TEXT_MAX_LENGTH = 1000;
const POST_IMAGE_LABEL = 'Post image';

function ensureModal(root) {
  if (root.__createPostModal) return root.__createPostModal;

  const emojiSet = [
    '😀','😃','😄','😁','😆','😅','😂','🤣',
    '😊','🙂','😉','😍','🥰','😘','😗','😙',
    '😚','😋','😜','🤪','😝','🫠','🤗','🤩',
    '🤔','🤨','😐','😶','😏','😣','😥','😮',
    '😪','😴','😷','🤒','🤕','🤧','😵','🤯',
    '😎','🥳','😤','😭','😡','🤬','🥺','😇',
    '👍','👎','🙏','👏','💪','🔥','✨','🎉',
    '❤️','💔','💯','✅','🎶','⭐','🌈','☀️'
  ];

  const modal = document.createElement('div');
  modal.id = 'create-post-modal';
  modal.className = 'modal create-post-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="create-post-dialog" role="dialog" aria-modal="true" aria-labelledby="create-post-title">
      <div class="create-post-header">
        <h2 id="create-post-title">Create post</h2>
        <button type="button" class="create-post-close" aria-label="Close create post">&times;</button>
      </div>
      <form id="create-post-form" class="create-post-body">
        <div class="create-post-profile">
          <img id="create-post-avatar" src="" alt="Profile photo" />
          <div class="create-post-meta">
            <div id="create-post-name" class="create-post-name">You</div>
          </div>
        </div>
        <textarea id="create-post-content" name="content" placeholder="What's on your mind?" required maxlength="${POST_TEXT_MAX_LENGTH}"></textarea>
        <div class="create-post-preview" id="create-post-preview"></div>
        <div class="create-post-actions">
          <div class="create-post-add">
            <span>Add to your post</span>
            <div class="create-post-icons">
              <label class="create-post-icon" for="create-post-image" title="Photo">
                <span>🖼️</span>
              </label>
              <button type="button" class="create-post-icon emoji-toggle" aria-label="Add emoji" title="Emoticons">
                <span>😃</span>
              </button>
            </div>
          </div>
        </div>
        <div class="create-post-emoji-panel" id="create-post-emoji-panel" aria-hidden="true"></div>
        <input type="file" id="create-post-image" name="image_file" accept="${IMAGE_UPLOAD_ACCEPT_ATTR}" />
        <button class="create-post-submit" type="submit" id="create-post-submit">Post</button>
      </form>
    </div>
  `;

  root.appendChild(modal);

  const form = modal.querySelector('#create-post-form');
  const closeBtn = modal.querySelector('.create-post-close');
  const nameEl = modal.querySelector('#create-post-name');
  const avatarEl = modal.querySelector('#create-post-avatar');
  const textarea = modal.querySelector('#create-post-content');
  const imageInput = modal.querySelector('#create-post-image');
  const imagePreview = modal.querySelector('#create-post-preview');
  const submitButton = modal.querySelector('#create-post-submit');
  const emojiPanel = modal.querySelector('#create-post-emoji-panel');
  const emojiToggle = modal.querySelector('.emoji-toggle');

  const buildEmojiPanel = () => {
    if (!emojiPanel) return;
    emojiPanel.innerHTML = '';
    const fragment = document.createDocumentFragment();
    emojiSet.forEach((emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'emoji-button';
      button.textContent = emoji;
      button.setAttribute('aria-label', `Insert ${emoji}`);
      fragment.appendChild(button);
    });
    emojiPanel.appendChild(fragment);
  };

  const toggleEmojiPanel = (forceOpen = null) => {
    if (!emojiPanel) return;
    const willOpen = forceOpen === null ? !emojiPanel.classList.contains('is-open') : forceOpen;
    emojiPanel.classList.toggle('is-open', Boolean(willOpen));
    emojiPanel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
  };

  const insertAtCursor = (value) => {
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value || '';
    textarea.value = text.slice(0, start) + value + text.slice(end);
    const cursor = start + value.length;
    textarea.setSelectionRange(cursor, cursor);
    textarea.focus();
  };

  const syncSanitizedTextareaValue = () => {
    if (!textarea) {
      return validateCommunityText('', { label: 'Post', maxLength: POST_TEXT_MAX_LENGTH });
    }

    const validation = validateCommunityText(textarea.value, {
      label: 'Post',
      maxLength: POST_TEXT_MAX_LENGTH,
    });
    const sanitized = sanitizeCommunityText(textarea.value, {
      maxLength: POST_TEXT_MAX_LENGTH,
    });
    if (textarea.value !== sanitized) {
      textarea.value = sanitized;
    }
    return validation;
  };

  const openModal = ({ profilePicUrl = '', displayName = 'You' } = {}) => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    nameEl.textContent = displayName || 'You';
    avatarEl.src = profilePicUrl || '';
    avatarEl.alt = displayName ? `${displayName} profile photo` : 'Profile photo';
    setTimeout(() => textarea.focus(), 0);
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    form.reset();
    imagePreview.innerHTML = '';
    imagePreview.classList.remove('active');
    toggleEmojiPanel(false);
  };

  if (!root.__createPostModalBound) {
    root.__createPostModalBound = true;

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    if (emojiToggle) {
      emojiToggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggleEmojiPanel();
      });
    }

    if (emojiPanel) {
      buildEmojiPanel();
      emojiPanel.addEventListener('click', (event) => {
        const button = event.target.closest('.emoji-button');
        if (!button) return;
        insertAtCursor(button.textContent || '');
      });
    }

    textarea?.addEventListener('blur', () => {
      syncSanitizedTextareaValue();
    });

    document.addEventListener('click', (event) => {
      if (!modal.classList.contains('is-open')) return;
      if (!emojiPanel || !emojiToggle) return;
      const isToggle = emojiToggle.contains(event.target);
      const isPanel = emojiPanel.contains(event.target);
      if (!isToggle && !isPanel) {
        toggleEmojiPanel(false);
      }
    });

    imageInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const imageValidation = validateSingleImageFile(file, {
        label: POST_IMAGE_LABEL,
        maxSizeBytes: DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES,
      });
      if (!imageValidation.isValid) {
        showToast(imageValidation.errorMessage, 'error');
        imagePreview.innerHTML = '';
        imagePreview.classList.remove('active');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.innerHTML = `
          <div class="create-post-preview-item">
            <img src="${e.target.result}" alt="Selected image" />
            <button type="button" class="create-post-preview-remove" aria-label="Remove image">&times;</button>
          </div>
        `;
        imagePreview.classList.add('active');
        const removeBtn = imagePreview.querySelector('.create-post-preview-remove');
        removeBtn.addEventListener('click', () => {
          imagePreview.innerHTML = '';
          imagePreview.classList.remove('active');
          imageInput.value = '';
        });
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const siteSlug = getActiveSiteSlug();
      if (!siteSlug) {
        alert('Site scope is required.');
        return;
      }

      const token = getSessionToken(siteSlug);
      if (!token) {
        alert('Please login first.');
        return;
      }

      const contentValidation = syncSanitizedTextareaValue();
      const imageFile = imageInput.files[0];
      const imageValidation = validateSingleImageFile(imageFile, {
        label: POST_IMAGE_LABEL,
        maxSizeBytes: DEFAULT_IMAGE_UPLOAD_MAX_SIZE_BYTES,
      });

      if (!contentValidation.isValid && !imageFile) {
        showToast('Please enter content or select an image.', 'error');
        return;
      }

      if (!imageValidation.isValid) {
        showToast(imageValidation.errorMessage, 'error');
        imageInput.value = '';
        imagePreview.innerHTML = '';
        imagePreview.classList.remove('active');
        return;
      }

      const content = contentValidation.sanitized;

      submitButton.disabled = true;

      let imageUrl = null;
      if (imageFile) {
        try {
          const imageData = new FormData();
          imageData.append('file', imageFile);

          const uploadResponse = await api.post('/bini/cloudinary/upload', imageData);
          const uploadResult = uploadResponse.data;
          imageUrl = uploadResult.url;
        } catch (error) {
          alert('Error uploading image: ' + error.message);
          submitButton.disabled = false;
          return;
        }
      }

      try {
        const postData = { content, img_url: imageUrl };
        const response = await api.post('/bini/posts/create', postData);
        const result = response.data;

        const newPostPayload = {
          ...result,
          fullname: nameEl.textContent || 'You',
          profile_picture: avatarEl.src || '',
        };

        window.dispatchEvent(
          new CustomEvent('new-post-created', {
            detail: { post: newPostPayload },
          }),
        );

        showToast('Post created successfully!', 'success');
        closeModal();
      } catch (error) {
        showToast(resolveCommunitySubmissionError(error, 'Error creating post. Please try again.'), 'error');
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  root.__createPostModal = { open: openModal, close: closeModal, element: modal };
  return root.__createPostModal;
}

export default function CreatePostModal(root) {
  return ensureModal(root);
}



