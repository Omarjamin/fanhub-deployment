import '../../../styles/Admin_styles/Admin-landing_page.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://fanhub-deployment-production.up.railway.app/v1').trim().replace(/\/$/, '');
const API_KEY = (import.meta.env.VITE_API_KEY || 'thread').trim() || 'thread';



const config = {
  validation: {
    rules: {
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
      },
      password: {
        minLength: 8,
        message: 'Password must be at least 8 characters'
      },  
      required: {
        message: 'This field is required'
      }
    }
  }
};

// Utility functions
const utils = {
  // Form validation
  validateField: (input, rules) => {
    const value = input.value.trim();
    const fieldName = input.name || input.id || 'field';
    const errors = [];

    if (input.required && !value) {
      errors.push(config.validation.rules.required.message);
      return { isValid: false, errors };
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || 'Invalid format');
    }

    if (rules.minLength && value.length < rules.minLength) {
      errors.push(rules.message || `Must be at least ${rules.minLength} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Show error message
  showError: (input, message) => {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;

    let errorElement = formGroup.querySelector('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      formGroup.appendChild(errorElement);
    }

    errorElement.textContent = message;
    input.classList.add('error');
  },

  // Clear error
  clearError: (input) => {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;

    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
    input.classList.remove('error');
  },

  // Smooth scroll to element
  smoothScroll: (targetId) => {
    const target = document.querySelector(targetId);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  },

  // Toggle mobile menu
  toggleMobileMenu: () => {
    const navMobile = document.querySelector('#navMobile');
    const menuBtn = document.querySelector('#mobileMenuBtn');
    if (navMobile && menuBtn) {
      navMobile.classList.toggle('active');
      menuBtn.classList.toggle('active');
    }
  }
};

export default function AdminLandingPage() {
  const section = document.createElement('section');
  section.id = 'admin-landing';
  // Use a specific class to avoid global `.content-section` rules
  // (some page styles hide `.content-section` by default)
  section.className = 'admin-landing-section';

  section.innerHTML = `
  <div class="admin-landing-wrapper">
    <!-- Header -->
    <header class="header">
      <div class="header-container">
        <div class="logo">
          <div class="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="#ff4b8d" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18.01 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <span class="logo-text">FanHub</span>
        </div>
        <nav class="nav-desktop">
          <a href="#features" class="nav-link">Core Functions</a>
          <a href="#templates" class="nav-link">Community Sites</a>
          <a href="#process" class="nav-link">Template Highlights</a>
        </nav>
        <div class="header-actions">
          <button id="getStartedBtn" class="btn btn-primary">Explore Sites</button>
        </div>
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <nav class="nav-mobile" id="navMobile">
        <a href="#features" class="nav-link">Core Functions</a>
        <a href="#templates" class="nav-link">Community Sites</a>
        <a href="#process" class="nav-link">Template Highlights</a>
      </nav>
    </header>
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">A Platform Made for Fans</h1>
          <p class="hero-description">
            Interact with fans, browse products in our shop, and access different community sites in one place.
          </p>
          <p class="hero-note">
            Built to keep community operations clear, connected, and professionally managed.
          </p>
        </div>
        <!-- Suggestion Card -->
        <div class="auth-container">
          <div class="auth-card">
            <form id="suggestionForm">
              <div class="form-header">
                <h3 class="form-title">Send a Community Suggestion</h3>
                <p class="form-subtitle">No login required. Suggestions are reviewed by admin for website generation.</p>
              </div>
              <div class="form-group">
                <label class="form-label" for="suggestCommunityName">Community Name</label>
                <input type="text" id="suggestCommunityName" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="suggestNote">Suggestion Details</label>
                <textarea id="suggestNote" class="form-input" rows="4" style="height:auto;padding:0.75rem;" required></textarea>
              </div>
              <div class="form-group">
                <label class="form-label" for="suggestEmail">Contact Email (optional)</label>
                <input type="email" id="suggestEmail" class="form-input">
              </div>
              <button type="submit" class="btn btn-primary btn-full">Submit Suggestion</button>
            </form>
          </div>
        </div>
      </div>
    </section>
    <!-- Features Section -->
    <section id="features" class="features">
      <div class="features-container">
        <div class="section-header">
          <h2 class="section-title">Community + Ecommerce Platform</h2>
          <p class="section-subtitle">
            Built for fan communities to interact, discover content, and browse products in a single professional experience.
          </p>
        </div>
        <div class="features-grid" id="featuresGrid">
          <!-- Features injected via JS from admin.json -->
        </div>
        <!-- Templates: ready-made band templates (placed under Features) -->
        <div id="templates" class="templates-section" style="margin-top:2rem;">
          <div class="section-header">
            <h3 class="section-title">Community Sites</h3>
            <p class="section-subtitle">Open each site directly and manage every community under the same platform standard.</p>
          </div>
          <div class="templates-grid" id="templatesGrid">
            <!-- Templates injected via JS -->
          </div>
        </div>
      </div>
    </section>
    <!-- Developers Section -->
    <section id="process" class="success">
      <div class="success-container">
        <div class="section-header">
          <h2 class="section-title">Developers</h2>
          <p class="section-subtitle">Connect with the developers on GitHub.</p>
        </div>
        <div class="success-grid" id="processGrid">
          <!-- Developers injected via JS -->
        </div>
      </div>
    </section>
    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-bottom">
          <p>&copy; 2026 FanHub. Educational purposes only.</p>
        </div>
      </div>
    </footer>
    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>
    <!-- Feature Detail Modal -->
    <div id="featureModal" class="modal" aria-hidden="true">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button class="modal-close" id="modalClose" aria-label="Close">&times;</button>
        <div class="modal-body">
        <h3 id="modalTitle" class="feature-title"></h3>
        <p id="modalDescription" class="feature-description"></p>
        </div>
      </div>
    </div>
  </div>
</section>
`;

  const initSuggestionForm = () => {
    const suggestionForm = section.querySelector('#suggestionForm');
    if (!suggestionForm) return;

    suggestionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const communityInput = section.querySelector('#suggestCommunityName');
      const noteInput = section.querySelector('#suggestNote');
      const emailInput = section.querySelector('#suggestEmail');
      if (!communityInput || !noteInput) return;

      const communityName = communityInput.value.trim();
      const note = noteInput.value.trim();
      const contactEmail = emailInput ? emailInput.value.trim() : '';

      if (!communityName || !note) {
        showToast('Please provide both community name and suggestion details.', 'error');
        return;
      }

      const submitBtn = suggestionForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const res = await fetch(`${API_BASE}/admin/suggestions/public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: API_KEY,
          },
          body: JSON.stringify({
            community_name: communityName,
            suggestion_text: note,
            contact_email: contactEmail || null,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload?.success === false) {
          throw new Error(payload?.message || `HTTP ${res.status}`);
        }

        showToast('Suggestion submitted. Admin will review it for community website generation.', 'success');
        suggestionForm.reset();
      } catch (error) {
        showToast(error?.message || 'Failed to submit suggestion.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Suggestion';
        }
      }
    });
  };

  // Initialize event listeners
  const initEventListeners = () => {
    // Smooth scroll for anchor links
    section.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href !== '#') {
          e.preventDefault();
          utils.smoothScroll(href);
        }
      });
    });

    // Mobile menu toggle
    const mobileMenuBtn = section.querySelector('#mobileMenuBtn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', utils.toggleMobileMenu);
    }

    // Close mobile menu when clicking on a link
    section.querySelectorAll('#navMobile a').forEach(link => {
      link.addEventListener('click', utils.toggleMobileMenu);
    });

    const getStartedBtn = section.querySelector('#getStartedBtn');
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => utils.smoothScroll('#templates'));
    }
  };

  // Initialize the component
  const initialize = () => {
    initEventListeners();
    initSuggestionForm();

    // Initialize features and templates
    renderFeatures();
    renderTemplates();
    renderWorkflow();
  };

  // Helper functions
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }, 100);
  }

  // Render features from config
  const renderFeatures = () => {
    const featuresGrid = section.querySelector('#featuresGrid');
    if (!featuresGrid) return;

    const features = [
      {
        icon: 'gif',
        title: 'Banner',
        description: 'Hero banners highlight the community with a strong visual entry point and key messaging.',
        image: '/bann.gif'
      },
      {
        icon: 'info',
        title: 'About',
        description: 'About section introduces the artist story, background, and identity in one place.',
        image: '/about.png'
      },
      {
        icon: 'disc',
        title: 'Discography',
        description: 'Discography lists albums, releases, and tracks with curated metadata and artwork.',
        image: '/album.jfif'
      },
      {
        icon: 'calendar',
        title: 'Events',
        description: 'Events highlight schedules, appearances, and activities for fans to follow.',
        image: '/event.jfif'
      },
      {
        icon: 'megaphone',
        title: 'Announcements',
        description: 'Announcements keep fans updated with official news, notices, and platform updates.',
        image: '/announcement.jfif'
      },
      {
        icon: 'users',
        title: 'Community-Type Scoped System',
        description: 'Every route, fetch, and database action is isolated by community_type to keep each fan site independent.',
        image: '/com.png'
      },
      {
        icon: 'trending-up',
        title: 'Post Interactions',
        description: 'Core social actions include likes, comments, reposts, counts, status checks, and reporting with consistent API flow.',
        image: '/post.jfif'
      },
      {
        icon: 'zap',
        title: 'Messaging and Presence',
        description: 'Real-time chat with online/offline indicators and community-separated message storage for cleaner conversation history.',
        image: '/message.jfif'
      },
      {
        icon: 'shield',
        title: 'Search and Profile Routing',
        description: 'User and hashtag navigation resolves to the correct community route, including current and other-user profiles.',
        image: '/see.png'
      },
      {
        icon: 'bar-chart-3',
        title: 'Suggestion to Website Generation',
        description: 'Fans can send suggestions without login; admin review drives generated community websites from the core workflow.',
        image: '/gene.jfif'
      },
      {
        icon: 'check-circle',
        title: 'Ecommerce Order Flow',
        description: 'Shop, cart, checkout, and order history are integrated so placed items are removed from cart and tracked properly.',
        image: '/E-COMMERCE.jfif'
      }
    ];

    const icons = {
      users: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      zap: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      shield: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      'bar-chart-3': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
      'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      image: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      disc: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/></svg>',
      calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      megaphone: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M14 9h5a2 2 0 0 1 0 6h-5"/></svg>'
    };

    featuresGrid.innerHTML = features.map(feature => `
      <article class="feature-card">
        <div class="feature-media">
          <img src="${feature.image}" alt="${feature.title}">
          <div class="feature-overlay"></div>
        </div>
        <div class="feature-body">
          <h3 class="feature-title">${feature.title}</h3>
          <p class="feature-description">${feature.description}</p>
        </div>
      </article>
    `).join('');
  }

  // Render templates
  const renderTemplates = () => {
    const templatesGrid = section.querySelector('#templatesGrid');
    if (!templatesGrid) return;

    const templates = [
      { name: 'bini', badge: 'BN', desc: 'Community site for updates, fan engagement, and shop access.' },
    ];

    templatesGrid.innerHTML = templates.map(template => `
      <div class="template-card">
        <h3 class="feature-title">${template.name}</h3>
        <p class="feature-description">${template.desc}</p>
        <div style="margin-top:1.25rem;">
          <button class="btn btn-primary btn-full use-template" data-url="/fanhub/${encodeURIComponent(String(template.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))}">Open Site</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for template buttons
    const templateButtons = section.querySelectorAll('.use-template');
    templateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUrl = btn.getAttribute('data-url');
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      });
    });
  }

  const renderWorkflow = () => {
    const processGrid = section.querySelector('#processGrid');
    if (!processGrid) return;

    const developers = [
      { name: 'Serg Michael Appari', role: 'Frontend Developer', github: 'https://github.com/sergaparri', photo: '/serg.jpg' },
      { name: 'Miko Aldrin Alvarado', role: 'Backend Developer', github: 'https://github.com/MikoAldrinAlvarado', photo: '/miko.jpg' },
      { name: 'Jamin Nicole Omar', role: 'Full Stack Developer', github: 'https://github.com/Omarjamin', photo: '/jamin.jpg' },
      { name: 'Chris Aaron Abesamis', role: 'Analysis/Tester', github: 'https://github.com/chrisaaronabesamis', photo: '/aaron.jpg' },
      { name: 'Daisyrie Hilario', role: 'Documentation', github: 'https://github.com/desdiaz956', photo: '/daisy.jpg' }
    ];

    processGrid.innerHTML = developers.map((dev, index) => `
      <div class="success-card developer-card">
        <p class="success-stat">${String(index + 1).padStart(2, '0')}</p>
        <img class="developer-avatar" src="${dev.photo}" alt="${dev.name}">
        <p class="success-label">${dev.name}</p>
        <p class="developer-role">${dev.role}</p>
        <a class="success-description" href="${dev.github}" target="_blank" rel="noopener">View GitHub</a>
      </div>
    `).join('');
  }

  // Initialize the component
  setTimeout(initialize, 0);

  return section;
}
