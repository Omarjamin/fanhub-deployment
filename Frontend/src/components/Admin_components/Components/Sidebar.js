import '../../../styles/Admin_styles/Sidebar.css';

export default function Sidebar(root) {
  root.classList.add('admin-sidebar');

  root.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <span class="sidebar-logo" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
          >
            <path
              d="M12 20s-6.5-4.2-8.7-8C1.8 9.3 2.7 6 5.8 5c2-.6 3.7.2 4.7 1.7 1-1.5 2.7-2.3 4.7-1.7 3.1 1 4 4.3 2.5 7-2.2 3.8-8.7 8-8.7 8z"
              fill="#ec0b0b"
            ></path>
          </svg>
        </span>
        <h2 class="sidebar-title">FanHub</h2>
      </div>
      <button
        class="sidebar-toggle"
        id="sidebarToggle"
        type="button"
        aria-label="Toggle sidebar"
      >&#9776;</button>
    </div>

    <nav class="sidebar-nav">
      <a href="/subadmin/dashboard" class="nav-link active" data-link>
        <span class="nav-icon">&#128202;</span>
        <span class="nav-text">Dashboard</span>
      </a>
    
      <a href="/subadmin/community" class="nav-link" data-link>
        <span class="nav-icon">&#128172;</span>
        <span class="nav-text">Community</span>
      </a>
      <a href="/subadmin/marketplace" class="nav-link" data-link>
        <span class="nav-icon">&#128717;</span>
        <span class="nav-text">Marketplace</span>
      </a>
      <a href="/subadmin/orders" class="nav-link" data-link>
        <span class="nav-icon">&#128230;</span>
        <span class="nav-text">Orders</span>
      </a>
    
      <a href="/subadmin/threads" class="nav-link" data-link>
        <span class="nav-icon">&#129525;</span>
        <span class="nav-text">Threads</span>
      </a>


      <a href="/subadmin/discography" class="nav-link" data-link>
        <span class="nav-icon">&#128200;</span>
        <span class="nav-text">Discography</span>
      </a>
      <a href="/subadmin/reports" class="nav-link" data-link>
        <span class="nav-icon">&#128203;</span>
        <span class="nav-text">Reports</span>
      </a>
      <a href="/subadmin/settings" class="nav-link" data-link>
        <span class="nav-icon">&#9881;</span>
        <span class="nav-text">Settings</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <button class="logout-btn" id="logoutBtn">Logout</button>
    </div>
  `;

  let mobileToggle = document.querySelector('#mobileSidebarToggle');
  if (!mobileToggle) {
    mobileToggle = document.createElement('button');
    mobileToggle.id = 'mobileSidebarToggle';
    mobileToggle.className = 'mobile-sidebar-toggle';
    mobileToggle.type = 'button';
    mobileToggle.setAttribute('aria-label', 'Open sidebar');
    mobileToggle.innerHTML = '&#9776;';
    document.body.appendChild(mobileToggle);
  }

  function setSidebarExpanded(isExpanded) {
    root.classList.toggle('expanded', isExpanded);
    document.body.classList.toggle('sidebar-open', isExpanded);
    mobileToggle.classList.toggle('is-open', isExpanded);
    mobileToggle.setAttribute('aria-label', isExpanded ? 'Close sidebar' : 'Open sidebar');
    mobileToggle.innerHTML = isExpanded ? '&times;' : '&#9776;';
  }

  function toggleSidebar() {
    setSidebarExpanded(!root.classList.contains('expanded'));
  }

  root.querySelector('#sidebarToggle').addEventListener('click', toggleSidebar);
  mobileToggle.addEventListener('click', toggleSidebar);

  const links = root.querySelectorAll('.nav-link');

  function setActiveLink(pathname) {
    links.forEach(link => {
      const linkPath = new URL(link.href, window.location.origin).pathname;
      link.classList.toggle('active', linkPath === pathname);
    });
  }

  links.forEach(link => {
    link.addEventListener('click', () => {
      const path = new URL(link.href, window.location.origin).pathname;
      setActiveLink(path);

      if (window.matchMedia('(max-width: 768px)').matches) {
        setSidebarExpanded(false);
      }
    });
  });

  setActiveLink(window.location.pathname);

  root.querySelector('#logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      window.location.href = 'login.html';
    }
  });
}
