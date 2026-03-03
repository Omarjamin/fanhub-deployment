  // import Home from "./pages/home";
  // import Registerform from "./pages/register-page.js";
  // import Loginform from "./pages/login-page.js";
  // import PageNotFound from "./pages/pageNotFound";
  // import SPA from "./core/spa";
  // import Page from "./pages/page";
  // import Search from "./pages/search-page";
  // import Profile from "./pages/profile-page";
  // import OthersProfilePage from "./pages/others-profile-page.js";
  // import Notifications from "./pages/notif-page.js";
  import { setupSocket } from "./hooks/bini_hooks/socket.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "./lib/site-context.js";

  /**
   * All Pages in Bini
   */
  import SPA from "./core/bini_core/spa";
  import Loginform from "./pages/bini_pages/auth_page/login-page";
  import Registerform from "./pages/bini_pages/auth_page/register-page";
  import Home from "./pages/bini_pages/home_page/home";
  import Notifications from "./pages/bini_pages/notif_page/notif-page";
  import PageNotFound from "./pages/bini_pages/page_not_found/pageNotFound";
  import OthersProfilePage from "./pages/bini_pages/profile_page/others-profile-page";
  import Profile from "./pages/bini_pages/profile_page/profile-page";
  import Search from "./pages/bini_pages/search_page/search-page";
  import ThreadTopic from "./components/bini_components/thread-topic.js";


  /**
   * All Pages in Ecommerce
   */
  import HOMEPAGE from './pages/ecommerce_page/home_page/home_page.js';
  import SIGNIN from './pages/ecommerce_page/auth_page/signin_page.js';
  import SIGNUP from './pages/ecommerce_page/auth_page/signup_page.js';
  import SHOP from './pages/ecommerce_page/shop_page/shop_page.js';
  import Checkout from './pages/ecommerce_page/checkout_page/checkout_page/check_page.js';
  import OrderHistory from './pages/ecommerce_page/order_page/order_history_page.js';
  import OrderConfirmation from './components/ecommerce_components/order/order_confirmation.js';



  import "./styles/bini_styles/common.css";
  import "./styles/bini_styles/header.css";



  // sub_admin pages (from Admin_spa structure)
  import SubAdminDashboard from './pages/Admin_page/Dashboard.js';

  import SubAdminLandingPage from './pages/Admin_page/LandingPage.js';
  import SubAdminUsers from './pages/Admin_page/Users.js';
  import SubAdminGroups from './pages/Admin_page/Groups.js';
  import SubAdminMarketplace from './pages/Admin_page/Marketplace.js';
  import SubAdminOrders from './pages/Admin_page/Orders.js';
  import SubAdminPayments from './pages/Admin_page/Payments.js';
  import SubAdminMessaging from './pages/Admin_page/Messaging.js';
  import SubAdminSettings from './pages/Admin_page/Settings.js';
  import SubAdminDiscography from './pages/Admin_page/Discography.js';
  import SubAdminCommunity from './pages/Admin_page/Community.js';
  import SubAdminGenerateWebsite from './pages/Admin_page/GenerateWebsite.js';
  import SubAdminReports from './pages/Admin_page/Reports.js';
  import SubAdminThreads from './pages/Admin_page/Threads.js';
  import SubAdminLogin from './pages/Admin_page/login.js';


  // Initialize SPA
  const app = new SPA({
    root: document.getElementById("app"),
    defaultRoute: PageNotFound,
  });




  // All routing in sub admin
  app.add("/subadmin/login", SubAdminLogin);
  app.add("/subadmin/login/", SubAdminLogin);
  app.add("/admin/login", SubAdminLogin);
  app.add("/admin/login/", SubAdminLogin);
  app.add(/\/fanhub\/([^/]+)\/admin-login\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    if (siteSlug) {
      const normalized = String(siteSlug).trim().toLowerCase();
      sessionStorage.setItem('admin_selected_site', normalized);
      sessionStorage.setItem('site_slug', normalized);
      sessionStorage.setItem('community_type', normalized);
    }
    SubAdminLogin.call({ root }, { siteSlug });
  });
  //1
  app.add("/subadmin", SubAdminDashboard);
  app.add("/subadmin/", SubAdminDashboard);
  app.add("/subadmin/dashboard", SubAdminDashboard);
  app.add("/", SubAdminLandingPage);
  app.add("/subadmin/landing", SubAdminLandingPage);
  app.add("/subadmin/users", SubAdminUsers);
  app.add("/subadmin/groups", SubAdminGroups);
  app.add("/subadmin/marketplace", SubAdminMarketplace);
  app.add("/subadmin/orders", SubAdminOrders);
  app.add("/subadmin/payments", SubAdminPayments);
  app.add("/subadmin/messaging", SubAdminMessaging);
  app.add("/subadmin/settings", SubAdminSettings);
  app.add("/subadmin/discography", SubAdminDiscography);
  app.add("/subadmin/community", SubAdminCommunity);
  app.add("/subadmin/generate-website", SubAdminGenerateWebsite);
  app.add("/subadmin/reports", SubAdminReports);
  app.add("/subadmin/threads", SubAdminThreads);
  app.add("/bini/threads", SubAdminThreads); // Add direct route for sidebar link with /bini prefix

  /**
   * All routing in Bini
   */

  app.add("/bini", Home);
  app.add("/bini/register", Registerform);
  app.add("/bini/login", Loginform);
  app.add("/bini/logina", Loginform);
  app.add("/bini/search", Search);
  app.add("/bini/profile", Profile);
  app.add("/bini/notifications", Notifications);
  app.add("/bini/others-profile", OthersProfilePage);
  // Thread topic route (captures thread id)
  app.add(/\/bini\/thread\/([^/]+)/, ThreadTopic);
  // app.add(/\/pages\/(?<id>\d+)/i, Page);

  // Dynamic BINI routes: /fanhub/community-platform/:siteSlug/...
  app.add(/\/fanhub\/community-platform\/([^/]+)\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Home.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/register\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Registerform.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/login\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Loginform.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/logina\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Loginform.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/search\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Search.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/profile\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Profile.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/notifications\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Notifications.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/others-profile\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      OthersProfilePage.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/thread\/([^/]+)\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const threadId = params?.[1];
    const root = this?.root || document.getElementById("app");
    try {
      await fetchSiteBySlug(siteSlug);
      ThreadTopic.call({ root }, [threadId]);
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });


  /**
   * All Routing in Ecommerce
   */
  // app.add('/', HOMEPAGE);
  // app.add('/signin', SIGNIN);
  app.add('/signup', SIGNUP);
  app.add('/shop', SHOP);
  app.add('/checkout', Checkout);
  app.add('/order-history', OrderHistory);
  app.add('/order-confirmation', OrderConfirmation);

  const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:4000/v1";
  const API_KEY = import.meta.env.VITE_API_KEY || "thread";

  function applyButtonStyle(style, root = document.documentElement) {
    const buttonStyles = {
      rounded: { radius: '12px', border: 'none', shadow: '0 6px 16px rgba(0, 0, 0, 0.18)' },
      square: { radius: '0px', border: 'none', shadow: '0 4px 12px rgba(0, 0, 0, 0.15)' },
      pill: { radius: '999px', border: 'none', shadow: '0 6px 16px rgba(0, 0, 0, 0.18)' },
      flat: { radius: '6px', border: '1px solid rgba(0, 0, 0, 0.15)', shadow: 'none' },
    };

    const normalizedStyle = String(style || 'rounded').trim().toLowerCase();
    const activeButtonStyle = buttonStyles[normalizedStyle] || buttonStyles.rounded;

    root.style.setProperty('--theme-button-radius', activeButtonStyle.radius);
    root.style.setProperty('--theme-button-border', activeButtonStyle.border);
    root.style.setProperty('--theme-button-shadow', activeButtonStyle.shadow);
  }

  function hexToHSL(hex) {
    const safeHex = String(hex || '').replace('#', '');
    if (!/^[A-Fa-f0-9]{6}$/.test(safeHex)) return null;

    let r = parseInt(safeHex.substring(0, 2), 16) / 255;
    let g = parseInt(safeHex.substring(2, 4), 16) / 255;
    let b = parseInt(safeHex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      l: l * 100,
    };
  }

  function HSLToHex(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  function adjustLightness(hex, amount) {
    const hsl = hexToHSL(hex);
    if (!hsl) return '#000000';
    hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
    return HSLToHex(hsl.h, hsl.s, hsl.l);
  }

  function getContrastColor(hex) {
    const safeHex = String(hex || '').replace('#', '');
    if (!/^[A-Fa-f0-9]{6}$/.test(safeHex)) return '#000000';
    const r = parseInt(safeHex.substring(0, 2), 16);
    const g = parseInt(safeHex.substring(2, 4), 16);
    const b = parseInt(safeHex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? '#000000' : '#ffffff';
  }

  function applyThemeColors(data) {
    if (!data) return;

    const root = document.documentElement;
    const primary = String(data.primary_color || data.primaryColor || '#3b82f6');
    const secondary = String(data.secondary_color || data.secondaryColor || '#ffffff');
    const accent = String(data.accent_color || data.accentColor || primary);

    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--secondary-color', secondary);
    root.style.setProperty('--accent-color', accent);

    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-light', adjustLightness(primary, 15));
    root.style.setProperty('--primary-dark', adjustLightness(primary, -15));
    root.style.setProperty('--primary-soft-bg', adjustLightness(primary, 40));

    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-light', adjustLightness(accent, 15));
    root.style.setProperty('--accent-dark', adjustLightness(accent, -15));

    root.style.setProperty('--text-on-primary', getContrastColor(primary));
    root.style.setProperty('--text-on-accent', getContrastColor(accent));
    root.style.setProperty('--border', adjustLightness(primary, 35));
    root.style.setProperty('--hover-background', adjustLightness(accent, -8));
    root.style.setProperty('--hover-text-color', getContrastColor(adjustLightness(accent, -8)));
    root.style.setProperty('--secondary-background', secondary);

    const fontMap = {
      arial: 'Arial, Helvetica, sans-serif',
      calibri: 'Calibri, Arial, sans-serif',
      'segoe ui': '"Segoe UI", Arial, sans-serif',
      'century gothic': '"Century Gothic", sans-serif',
      verdana: 'Verdana, Geneva, sans-serif',
      helvetica: 'Helvetica, Arial, sans-serif',
      tahoma: 'Tahoma, Geneva, sans-serif',
      'trebuchet ms': '"Trebuchet MS", sans-serif',
      georgia: 'Georgia, "Times New Roman", serif',
      'times new roman': '"Times New Roman", Times, serif',
      'sans-serif': 'Arial, Helvetica, sans-serif',
      serif: 'Georgia, "Times New Roman", serif',
      cursive: '"Brush Script MT", "Comic Sans MS", cursive',
      monospace: '"Courier New", Courier, monospace',
    };
    const fontStyleRaw = String(data.font_style || data.fontStyle || 'Arial').trim();
    const fontStyle = fontStyleRaw.toLowerCase();
    root.style.setProperty('--theme-font-family', fontMap[fontStyle] || fontStyleRaw || fontMap.arial);

    applyButtonStyle(data.button_style || data.buttonStyle, root);
  }

  async function fetchSiteBySlug(siteSlug) {
    const slug = String(siteSlug || "").trim().toLowerCase();
    if (!slug) {
      throw new Error("Invalid site slug");
    }

    setActiveSiteSlug(slug);
    const token = getSessionToken(slug);
    const res = await fetch(`${ADMIN_API_BASE}/generate/generated-websites/type/${encodeURIComponent(slug)}`, {
      headers: {
        apikey: API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await res.json();
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || "Site not found");
    }

    try {
      const payload = json.data || {};
      sessionStorage.setItem(`site_data:${slug}`, JSON.stringify(payload));
      sessionStorage.setItem("active_site_data", JSON.stringify(payload));
      sessionStorage.setItem("active_site_slug", slug);
      localStorage.setItem("active_site_data", JSON.stringify(payload));
      localStorage.setItem("active_site_slug", slug);
    } catch (_) {}

    applyThemeColors(json.data);
    return json.data;
  }

  


  app.add(/\/fanhub\/([^/]+)\/login\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      SIGNIN.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/signin\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      SIGNIN.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/signup\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app"); 

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      SIGNUP.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/shop\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const data = await fetchSiteBySlug(siteSlug);
      SHOP.call({ root }, data);
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/checkout\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      Checkout.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/order-history\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      OrderHistory.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/order-confirmation\/?/, async function(params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      OrderConfirmation.call({ root }, { siteSlug, siteData });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });


  app.add(/\/fanhub\/([^/]+)$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      const data = await fetchSiteBySlug(siteSlug);
      HOMEPAGE.call({ root }, data);
    } catch (error) {
      console.error(error);
      PageNotFound.call({ root });
    }
  });


  


  // Global socket init (only for community-platform routes with auth)
  const currentPath = String(window.location.pathname || "");
  const isSiteRoute =
    /^\/bini(\/|$)/.test(currentPath) ||
    /^\/fanhub\/(?:community-platform\/)?[^/]+(\/|$)/.test(currentPath);
  const socketSite = getActiveSiteSlug();
  const socketToken = getSessionToken(socketSite);
  const socketUserId =
    sessionStorage.getItem("userId") ||
    sessionStorage.getItem("currentUserId");
  const hasSocketAuth = Boolean(
    socketToken && socketUserId
  );
  const socket = isSiteRoute && hasSocketAuth ? setupSocket() : null;

  // Global listener for user status updates
  window.addEventListener("userStatusUpdate", (e) => {
    const { id, status } = e.detail;
    console.log(`🌍 Global user status: ${id} → ${status}`);
  });

  // Make socket accessible globally
  window.globalSocket = socket;
    
  app.handleRouteChanges();




