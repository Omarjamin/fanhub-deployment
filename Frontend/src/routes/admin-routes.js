export default function registerAdminRoutes(app, deps) {
  const {
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
  } = deps;

  app.add("/subadmin/login", SubAdminLogin);
  app.add("/subadmin/login/", SubAdminLogin);
  app.add("/admin/login", SubAdminLogin);
  app.add("/admin/login/", SubAdminLogin);
  app.add(/\/fanhub\/([^/]+)\/admin-login\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");
    if (siteSlug) {
      const normalized = String(siteSlug).trim().toLowerCase();
      sessionStorage.setItem("admin_selected_site", normalized);
      sessionStorage.setItem("site_slug", normalized);
      sessionStorage.setItem("community_type", normalized);
    }
    SubAdminLogin.call({ root }, { siteSlug });
  });

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
  app.add("/bini/threads", SubAdminThreads);
}
