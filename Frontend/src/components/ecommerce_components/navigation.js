import { api as buildEcommerceApiUrl } from '../../services/ecommerce_services/config.js';
import { getAuthToken, removeAuthToken, authHeaders } from '../../services/ecommerce_services/auth/auth.js';
import CustomerCart from './cart/customer_cart_modal.js';
import { showToast, showConfirmToast } from '../../utils/toast.js';

function redirectToSigninWithDelay(signinPath) {
  try {
    sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search);
  } catch (_) {}

  setTimeout(() => {
    window.location.href = signinPath;
  }, 2000);
}

function buildNavIcon({
  href,
  icon,
  id = '',
  title = '',
  classes = '',
  authFeature = '',
  hidden = false,
}) {
  const className = `nav-icon ${classes}`.trim();
  return `
      <a href="${href}"${id ? ` id="${id}"` : ''} class="${className}"${authFeature ? ` data-auth-feature="${authFeature}"` : ''}${title ? ` title="${title}" aria-label="${title}"` : ''}${hidden ? ' style="display:none"' : ''}>
        <span class="nav-icon-glyph" aria-hidden="true">${icon}</span>
      </a>
  `;
}

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
  const isDefaultLogo = !String(data?.logo || data?.logo_url || data?.logo_image || data?.image_url || '').trim();
  const isHeroHomepage = pathParts[0] === 'fanhub' && pathParts.length === 2;
  const orderHistoryIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 6h11"></path>
      <path d="M9 12h11"></path>
      <path d="M9 18h11"></path>
      <path d="M5 6h.01"></path>
      <path d="M5 12h.01"></path>
      <path d="M5 18h.01"></path>
    </svg>
  `;
  const cartIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="20" r="1.4"></circle>
      <circle cx="18" cy="20" r="1.4"></circle>
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 7H6.1"></path>
    </svg>
  `;
  const userIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0"></path>
      <circle cx="12" cy="8" r="4"></circle>
    </svg>
  `;
  const logoutIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <path d="M14 7l5 5-5 5"></path>
      <path d="M19 12H9"></path>
    </svg>
  `;

  const heroNavLinks = `
      <a href="${homePath}" class="nav-link active">Home</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#home" class="nav-link">Videos</a>
      <a href="#music" class="nav-link">Music</a>
      <a href="#events" class="nav-link">Events</a>
      <a href="#announcements" class="nav-link">Announcements</a>
      <a href="${shopPath}" class="nav-link">Shop</a>
      <a href="${communityPlatformPath}" class="nav-link">Community</a>
  `;

  const defaultNavLinks = `
      <a href="${homePath}" class="nav-link active">Home</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#music" class="nav-link">Music</a>
      <a href="#events" class="nav-link">Events</a>
      <a href="#announcements" class="nav-link">Announcement</a>
      <a href="${shopPath}" class="nav-link">Shop</a>
      <a href="${communityPlatformPath}" class="nav-link">Community</a>
  `;

  const heroRightContent = `
      ${buildNavIcon({ href: orderHistoryPath, icon: orderHistoryIcon, classes: 'nav-auth-only nav-icon-orders', authFeature: 'order-history', title: 'Order history' })}
      ${buildNavIcon({ href: cartPath, icon: cartIcon, classes: 'nav-auth-only nav-icon-cart', authFeature: 'cart', title: 'Cart' })}
      ${buildNavIcon({ href: signinPath, icon: userIcon, id: 'signinLink', classes: 'nav-icon-user', title: 'Sign in' })}
      ${buildNavIcon({ href: '#', icon: logoutIcon, id: 'logoutBtn', classes: 'nav-icon-logout', title: 'Logout', hidden: true })}
  `;

  const defaultRightContent = `
      ${buildNavIcon({ href: orderHistoryPath, icon: orderHistoryIcon, classes: 'nav-auth-only nav-icon-orders', authFeature: 'order-history', title: 'Order history' })}
      ${buildNavIcon({ href: cartPath, icon: cartIcon, classes: 'nav-auth-only nav-icon-cart', authFeature: 'cart', title: 'Cart' })}
      ${buildNavIcon({ href: signinPath, icon: userIcon, id: 'signinLink', classes: 'nav-icon-user', title: 'Sign in' })}
      ${buildNavIcon({ href: '#', icon: logoutIcon, id: 'logoutBtn', classes: 'nav-icon-logout', title: 'Logout', hidden: true })}
  `;

  root.innerHTML = `
  <header class="navbar">
    <button id="menuToggle" class="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">&#9776;</button>
    <a href="${homePath}" class="logo">
      <img src="${logoSrc}" alt="Logo" class="logo-img${isDefaultLogo ? ' logo-img-default' : ''}" onerror="this.src='/BINI_logo.svg.png'">
    </a>
    <nav id="navMenu" role="navigation" aria-label="Main navigation">
      <button class="nav-close-btn" aria-label="Close navigation menu">&#10005;</button>
      ${isHeroHomepage ? heroNavLinks : defaultNavLinks}
    </nav>
    <div class="nav-right" role="navigation" aria-label="User actions">
      ${isHeroHomepage ? heroRightContent : defaultRightContent}
    </div>
  </header>
  `;

  const isAuthenticated = () => !!getAuthToken();

  const menuToggle = root.querySelector('#menuToggle');
  const navMenu = root.querySelector('#navMenu');
  const navLinks = navMenu ? Array.from(navMenu.querySelectorAll('a')) : [];
  const navCloseBtn = root.querySelector('.nav-close-btn');
  const navBar = root.querySelector('.navbar');
  const syncHeroNavState = () => {
    if (!navBar) return;
    if (!isHeroHomepage) {
      document.body.classList.remove('ec-hero-nav-home');
      document.body.classList.remove('ec-hero-nav-scrolled');
      navBar.classList.remove('ec-hero-nav');
      navBar.classList.remove('scrolled');
      return;
    }
    document.body.classList.add('ec-hero-nav-home');
    const isScrolled = window.scrollY > 8;
    navBar.classList.add('ec-hero-nav');
    navBar.classList.toggle('scrolled', isScrolled);
    document.body.classList.toggle('ec-hero-nav-scrolled', isScrolled);
  };

  syncHeroNavState();
  window.addEventListener('resize', syncHeroNavState);

  menuToggle?.addEventListener('click', () => {
    if (!navMenu) return;
    const isActive = navMenu.classList.contains('active');
    navMenu.classList.toggle('active');
    menuToggle.textContent = navMenu.classList.contains('active') ? '\u2715' : '\u2630';
    menuToggle.setAttribute('aria-expanded', !isActive);
  });

  navCloseBtn?.addEventListener('click', () => {
    if (!navMenu) return;
    navMenu.classList.remove('active');
    if (menuToggle) {
      menuToggle.textContent = '\u2630';
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', async (e) => {
      const href = link.getAttribute('href') || '';

      if ((href === shopPath || href === communityPlatformPath) && !isAuthenticated()) {
        e.preventDefault();
        showToast('You need an account to access this feature. Please sign in or sign up.', 'error');
        redirectToSigninWithDelay(signinPath);
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
        const navHeight = navBar?.offsetHeight || 88;
        const extraOffset = 18;
        const targetPosition = window.scrollY + targetSection.getBoundingClientRect().top - navHeight - extraOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        navMenu?.classList.remove('active');
        if (menuToggle) {
          menuToggle.textContent = '\u2630';
          menuToggle.setAttribute('aria-expanded', 'false');
        }
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
        if (link.classList.contains('nav-auth-only')) {
          redirectToSigninWithDelay(signinPath);
        }
      }
    });
  });

  const cartLink = root.querySelector(`a[href="${cartPath}"]`);
  if (cartLink) {
    cartLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthenticated()) {
        showToast('You need an account to access this feature. Please sign in or sign up.', 'error');
        redirectToSigninWithDelay(signinPath);
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
      logoutBtn && (logoutBtn.style.display = 'inline-flex');
    } else {
      signinLink && (signinLink.style.display = 'inline-flex');
      logoutBtn && (logoutBtn.style.display = 'none');
    }

    root.querySelectorAll('.nav-auth-only').forEach((link) => {
      link.style.display = auth ? 'inline-flex' : 'none';
    });
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

  // Throttled scroll handler for better performance
  let scrollTimeout;
  const throttledScrollHandler = () => {
    if (scrollTimeout) {
      return;
    }
    
    scrollTimeout = setTimeout(() => {
      syncHeroNavState();

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
      
      scrollTimeout = null;
    }, 16); // ~60fps
  };

  window.addEventListener('scroll', throttledScrollHandler, { passive: true });
}
