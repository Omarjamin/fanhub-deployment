import { setupSocket } from "./hooks/bini_hooks/socket.js";
import { getActiveSiteSlug, getSessionToken } from "./lib/site-context.js";
import {
  fetchSiteBySlug,
  renderCommunityTemplatePage,
  renderEcommerceTemplatePage,
  setupRuntimeApiConfig,
} from "./lib/site-runtime.js";
import SPA from "./core/bini_core/spa";
import PageNotFound from "./pages/bini_pages/page_not_found/pageNotFound";
import SIGNUP from "./pages/ecommerce_page/auth_page/signup_page.js";
import SHOP from "./pages/ecommerce_page/shop_page/shop_page.js";
import Checkout from "./pages/ecommerce_page/checkout_page/checkout_page/check_page.js";
import OrderHistory from "./pages/ecommerce_page/order_page/order_history_page.js";
import OrderConfirmation from "./components/ecommerce_components/order/order_confirmation.js";
import registerAdminRoutes from "./routes/admin-routes.js";
import registerBiniRoutes from "./routes/template-registrations/bini-routes.js";
import registerEcommerceRoutes from "./routes/template-registrations/ecommerce-routes.js";

import "./styles/bini_styles/common.css";
import "./styles/bini_styles/header.css";

import SubAdminDashboard from "./pages/Admin_page/Dashboard.js";
import SubAdminLandingPage from "./pages/Admin_page/LandingPage.js";
import SubAdminUsers from "./pages/Admin_page/Users.js";
import SubAdminGroups from "./pages/Admin_page/Groups.js";
import SubAdminMarketplace from "./pages/Admin_page/Marketplace.js";
import SubAdminOrders from "./pages/Admin_page/Orders.js";
import SubAdminPayments from "./pages/Admin_page/Payments.js";
import SubAdminMessaging from "./pages/Admin_page/Messaging.js";
import SubAdminSettings from "./pages/Admin_page/Settings.js";
import SubAdminDiscography from "./pages/Admin_page/Discography.js";
import SubAdminCommunity from "./pages/Admin_page/Community.js";
import SubAdminGenerateWebsite from "./pages/Admin_page/GenerateWebsite.js";
import SubAdminReports from "./pages/Admin_page/Reports.js";
import SubAdminThreads from "./pages/Admin_page/Threads.js";
import SubAdminLogin from "./pages/Admin_page/login.js";

setupRuntimeApiConfig();

const app = new SPA({
  root: document.getElementById("app"),
  defaultRoute: PageNotFound,
});

registerAdminRoutes(app, {
  SubAdminLogin,
  SubAdminDashboard,
  SubAdminLandingPage,
  SubAdminUsers,
  SubAdminGroups,
  SubAdminMarketplace,
  SubAdminOrders,
  SubAdminPayments,
  SubAdminMessaging,
  SubAdminSettings,
  SubAdminDiscography,
  SubAdminCommunity,
  SubAdminGenerateWebsite,
  SubAdminReports,
  SubAdminThreads,
});

registerBiniRoutes(app, {
  PageNotFound,
  renderCommunityTemplatePage,
  fetchSiteBySlug,
});

registerEcommerceRoutes(app, {
  SIGNUP,
  SHOP,
  Checkout,
  OrderHistory,
  OrderConfirmation,
  PageNotFound,
  renderEcommerceTemplatePage,
});

const currentPath = String(window.location.pathname || "");
const isSiteRoute =
  /^\/bini(\/|$)/.test(currentPath) ||
  /^\/fanhub\/(?:community-platform\/)?[^/]+(\/|$)/.test(currentPath);
const socketSite = getActiveSiteSlug();
const socketToken = getSessionToken(socketSite);
const socketUserId =
  sessionStorage.getItem("userId") ||
  sessionStorage.getItem("currentUserId");
const hasSocketAuth = Boolean(socketToken && socketUserId);
const socket = isSiteRoute && hasSocketAuth ? setupSocket() : null;

window.addEventListener("userStatusUpdate", (e) => {
  const { id, status } = e.detail;
  console.log(`Global user status: ${id} -> ${status}`);
});

window.globalSocket = socket;

app.handleRouteChanges();
