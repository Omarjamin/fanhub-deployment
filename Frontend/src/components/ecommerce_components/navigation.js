import { api as buildEcommerceApiUrl } from '../../services/ecommerce_services/config.js';
import { getAuthToken, removeAuthToken, authHeaders } from '../../services/ecommerce_services/auth/auth.js';
import CustomerCart from './cart/customer_cart_modal.js';
import { showToast, showConfirmToast } from '../../utils/toast.js';

export default function Navigation(root, data = {}) {
  const pathParts = String(window.location.pathname || '').split('/').filter(Boolean);
  const urlCommunityType =
    pathParts[0] === 'fanhub'
      ? (pathParts[1] === 'community-platform' ? (pathParts[2] || '') : (pathParts[1] || ''))
      : '';
  const storedCommunityType = String(
    sessionStorage.getItem('community_type') || localStorage.getItem('community_type') || ''
  ).trim();
  const communityType = String(data?.community_type || urlCommunityType || storedCommunityType || '')
    .trim()
    .toLowerCase();

  if (communityType) {
    sessionStorage.setItem('community_type', communityType);
    localStorage.setItem('community_type', communityType);
  }

  const signinPath = communityType ? `/fanhub/${communityType}/signin` : '/signin';
  const homePath = communityType ? `/fanhub/${communityType}` : '/';
  const shopPath = communityType ? `/fanhub/${communityType}/shop` : '/shop';
  const orderHistoryPath = communityType ? `/fanhub/${communityType}/order-history` : '/order-history';
  const cartPath = communityType ? `/fanhub/${communityType}/cart` : '/cart';
  const communityPlatformPath = communityType
    ? `/fanhub/community-platform/${communityType}`
    : '/fanhub/community-platform';

  const logoSrc = String(
    data?.logo ||
    data?.logo_url ||
    data?.logo_image ||
    data?.image_url ||
    '/BINI_logo.svg.png'
  ).trim();

  root.innerHTML = `
  <header class="navbar">
    <div id="menuToggle" class="menu-toggle">&#9776;</div>
    <a href="${homePath}" class="logo">
      <img src="${logoSrc}" alt="Logo" class="logo-img" onerror="this.src='/BINI_logo.svg.png'">
    </a>
    <nav id="navMenu">
      <button class="nav-close-btn" aria-label="Close navigation">&#10005;</button>
      <a href="${homePath}" class="nav-link active">Home</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#music" class="nav-link">Music</a>
      <a href="#events" class="nav-link">Events</a>
      <a href="#announcements" class="nav-link">Announcement</a>
      <a href="${shopPath}" class="nav-link">Shop</a>
      <a href="${communityPlatformPath}" class="nav-link">Community</a>
    </nav>
    <div class="nav-right">
      <a href="${orderHistoryPath}" class="nav-icon">&#128220;</a>
      <a href="${cartPath}" class="nav-icon">&#128722;</a>
      <a href="${signinPath}" id="signinLink" class="nav-icon">&#128100;</a>
      <a href="#" id="logoutBtn" class="nav-icon" style="display:none" title="Logout">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16,17 21,12 16,7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </a>
    </div>
  </header>
  `;

  const isAuthenticated = () => !!getAuthToken();

  const menuToggle = root.querySelector('#menuToggle');
  const navMenu = root.querySelector('#navMenu');
  const navLinks = navMenu ? Array.from(navMenu.querySelectorAll('a')) : [];
  const navCloseBtn = root.querySelector('.nav-close-btn');

  menuToggle?.addEventListener('click', () => {
    if (!navMenu) return;
    navMenu.classList.toggle('active');
    menuToggle.textContent = navMenu.classList.contains('active') ? '\u2715' : '\u2630';
  });

  navCloseBtn?.addEventListener('click', () => {
    if (!navMenu) return;
    navMenu.classList.remove('active');
    if (menuToggle) menuToggle.textContent = '\u2630';
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', async (e) => {
      const href = link.getAttribute('href') || '';

      if ((href === shopPath || href === communityPlatformPath) && !isAuthenticated()) {
        e.preventDefault();
        showToast('You need an account to access this feature. Please sign in or sign up.', 'error');
        window.location.href = signinPath;
        return;
      }

      if (!href.startsWith('#')) return;
      const targetId = href.slice(1);

      const aliases = {
        announcement: 'announcements',
        announcements: 'announcements',
        event: 'events',
        events: 'events',
        about: 'about',
      };
      const normalizedTargetId = aliases[targetId] || targetId;

      const findSection = () =>
        document.getElementById(normalizedTargetId) ||
        document.querySelector(`section.${normalizedTargetId}-section`) ||
        document.querySelector(`section.${normalizedTargetId}`) ||
        document.querySelector(`.${normalizedTargetId}`);

      const targetSection = findSection();

      if (targetSection) {
        e.preventDefault();
        const headerHeight = 80;
        const targetPosition = targetSection.offsetTop - headerHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        navMenu?.classList.remove('active');
        if (menuToggle) menuToggle.textContent = '\u2630';
        return;
      }

      if (normalizedTargetId === '') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      e.preventDefault();
      window.location.href = `${homePath}#${normalizedTargetId}`;
    });
  });

  const navRightLinks = root.querySelectorAll('.nav-right a');
  navRightLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('id') || '';
      if (id === 'logoutBtn') return;
      if (!isAuthenticated()) {
        e.preventDefault();
        showToast('You need an account to access this feature. Please sign in or sign up.', 'error');
      }
    });
  });

  const cartLink = root.querySelector(`a[href="${cartPath}"]`);
  if (cartLink) {
    cartLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthenticated()) {
        showToast('You need an account to access this feature. Please sign in or sign up.', 'error');
        return;
      }
      CustomerCart();
    });
  }

  const signinLink = root.querySelector('#signinLink');
  const logoutBtn = root.querySelector('#logoutBtn');

  function updateAuthLinks() {
    const auth = isAuthenticated();
    if (auth) {
      signinLink && (signinLink.style.display = 'none');
      logoutBtn && (logoutBtn.style.display = 'inline');
    } else {
      signinLink && (signinLink.style.display = 'inline');
      logoutBtn && (logoutBtn.style.display = 'none');
    }
  }

  updateAuthLinks();

  logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();

    showConfirmToast(
      'Are you sure you want to log out?',
      async () => {
        try {
          await fetch(buildEcommerceApiUrl('/users/logout'), {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
            credentials: 'include',
          });
        } catch (err) {
          console.error('Logout request failed', err);
        }

        removeAuthToken();
        updateAuthLinks();
        showToast('You have been logged out successfully', 'success');
        setTimeout(() => {
          window.location.href = signinPath;
        }, 1500);
      },
      () => {
        console.log('Logout cancelled by user');
      }
    );
  });

  window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section[id], section[class]');

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      if (pageYOffset >= sectionTop - 180) {
        current = section.getAttribute('id') || section.className.split(' ')[0];
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#') && href.slice(1) === current) {
        link.classList.add('active');
      }
    });
  });
}
