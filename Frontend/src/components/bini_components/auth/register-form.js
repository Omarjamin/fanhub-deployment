import { registerUser } from '../../../services/bini_services/user/User-Api.js';
import api from '../../../services/bini_services/api.js';
import { getActiveSiteSlug, setActiveSiteSlug, setSessionToken } from '../../../lib/site-context.js';

export default function RegisterformComponent(root) {
  const siteSlug = getActiveSiteSlug();
  if (!siteSlug) {
    root.innerHTML = '<p>Site scope is required.</p>';
    return;
  }
  setActiveSiteSlug(siteSlug);
  const basePath = `/fanhub/community-platform/${encodeURIComponent(siteSlug)}`;
  root.innerHTML = `
    <div class="signUp-container">
      <div class="signup-card">SIGNUP</div>
      <div class="sigup-form">
        <form id="createAcct-form">
          <label>Username</label>
          <input type="text" id="username" name="username" placeholder="Username" required />
          <label>Full Name</label>
          <input type="text" id="fullname" name="fullname" placeholder="Full Name" required />
          <label>Email</label>
          <input type="text" id="email" name="email" placeholder="Email" required />
          <label>Password</label>
          <input type="password" id="password" name="password" placeholder="Password" required />
          <label>Confirm password</label>
          <input type="password" id="confirmPass" name="confirmPass" placeholder="Confirm Password" required />
          <input type="file" id="imageFile" accept="image/*" />
          <button type="submit" class="sign-btn">Sign In</button>
        </form>
      </div>
      <p id="already-have-account">
        Already have an account? <a id="already-have-account-link" href="${basePath}/login">Log in</a>
      </p>
    </div>
  `;

  const form = root.querySelector('#createAcct-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = form.querySelector('#username').value;
    const fullname = form.querySelector('#fullname').value;
    const password = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirmPass').value;
    const email = form.querySelector('#email').value;
    const imageFile = form.querySelector('#imageFile').files[0];

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      let imageUrl = '';
      if (imageFile) {
        const imageData = new FormData();
        imageData.append('file', imageFile);

        const uploadResponse = await api.post('/bini/cloudinary/upload', imageData);
        const uploadResult = uploadResponse.data;
        imageUrl = uploadResult.url;
      }

      const userData = {
        username,
        fullname,
        password,
        email,
        imageUrl,
      };

        const result = await registerUser(userData);

  if (result.token) {
      setSessionToken(result.token, siteSlug);
      if (result.user && (result.user.id || result.user.user_id)) {
          sessionStorage.setItem('userId', String(result.user.id || result.user.user_id));
          sessionStorage.setItem('currentUserId', String(result.user.id || result.user.user_id));
      }
  }

  alert('User registered successfully');
  window.location.href = `/fanhub/community-platform/${encodeURIComponent(siteSlug)}/login`;

    } catch (error) {
      console.error('Error registering user:', error);
      alert(`Registration failed: ${error.message}`);
    }
  });
}



