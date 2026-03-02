import api from '../../../services/bini_services/api.js';
import { getActiveSiteSlug, getSessionToken } from '../../../lib/site-context.js';
export default function CreatePost(root) {

  const modal = document.createElement('div');
  modal.id = 'create-post-modal';
  modal.classList.add('modal');
  modal.innerHTML = `
    <div class="modal-content">
      <span id="close-modal" class="close">&times;</span>
      <h2>Create New Post</h2>
      <form id="create-post-form">
        
        <textarea id="content" name="content" placeholder="What's happening?" required></textarea>
        
        <input type="file" id="image_file" name="image_file" accept="image/*" />               

        <button class="post-btn" type="submit" id="submit-post">Create Post</button>
      </form>
    </div>
  `;

  root.appendChild(modal);

  const closeModalBtn = document.getElementById('close-modal');
  const form = document.getElementById('create-post-form');

  const openModal = () => {
    modal.style.display = 'block';
  };

  const closeModal = () => {
    modal.style.display = 'none';
  };

  closeModalBtn.addEventListener('click', closeModal);

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const content = document.getElementById('content').value;    
    const imageFile = document.getElementById('image_file').files[0]; 

    const siteSlug = getActiveSiteSlug() || 'bini';
    const token = getSessionToken(siteSlug);
    if (!token) {
      alert('Please login first.');
      return;
    }
    
    let imageUrl = null;
    if (imageFile) {
      try {
        const imageData = new FormData();
        imageData.append('file', imageFile);

        const uploadResponse = await api.post('/bini/cloudinary/upload', imageData);
        const uploadResult = uploadResponse.data;
        imageUrl = uploadResult.url;

        if (!imageUrl) {
          throw new Error('Image upload succeeded, but no URL was returned.');
        }
      } catch (error) {
        alert('Error uploading image: ' + error.message);
        return;
      }
    }

    if (content) {
      const postData = { content, img_url: imageUrl };

      try {
        await api.post('/bini/posts/create', postData);
        alert('Post created successfully!');
        closeModal();
        window.location.href = `/fanhub/community-platform/${encodeURIComponent(siteSlug)}`;
      } catch (error) {
        console.error('Error creating post:', error);
        alert('Error creating post. Please check your internet connection.');
      }
    } else {
      alert('Please fill out the content field.');
    }
  });

  openModal();
}


