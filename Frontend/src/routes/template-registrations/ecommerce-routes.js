export default function registerEcommerceRoutes(app, deps) {
  const {
    SIGNUP,
    SHOP,
    Checkout,
    OrderHistory,
    OrderConfirmation,
    PageNotFound,
    renderEcommerceTemplatePage,
  } = deps;

  function resolveStoredSiteSlug() {
    const candidates = [
      sessionStorage.getItem("site_slug"),
      sessionStorage.getItem("community_type"),
      sessionStorage.getItem("active_site_slug"),
      localStorage.getItem("active_site_slug"),
      localStorage.getItem("community_type"),
      localStorage.getItem("site_slug"),
    ];

    return String(
      candidates.find((value) => String(value || "").trim()) || "",
    )
      .trim()
      .toLowerCase();
  }

  async function renderStoredTemplatePage({
    root,
    page,
    fallback,
    passMode = "raw",
  }) {
    const storedSiteSlug = resolveStoredSiteSlug();

    if (storedSiteSlug) {
      try {
        await renderEcommerceTemplatePage({
          root,
          siteSlug: storedSiteSlug,
          page,
          passMode,
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    if (typeof fallback === "function") {
      await fallback.call({ root });
      return;
    }

    PageNotFound.call({ root });
  }
  
  app.add("/signup", async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "signup",
      fallback: SIGNUP,
    });
  });
  app.add("/shop", async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "shop",
      fallback: SHOP,
    });
  });
  app.add(/\/shop\/product\/([^/]+)\/?$/, async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "buyNowConfirm",
      fallback: SHOP,
    });
  });
  app.add(/\/product\/([^/]+)\/?$/, async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "shop",
      fallback: SHOP,
    });
  });
  app.add("/checkout", async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "checkout",
      fallback: Checkout,
    });
  });
  app.add("/order-history", async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "orderHistory",
      fallback: OrderHistory,
    });
  });
  app.add("/order-confirmation", async function () {
    const root = this?.root || document.getElementById("app");
    await renderStoredTemplatePage({
      root,
      page: "orderConfirmation",
      fallback: OrderConfirmation,
    });
  });

  app.add(/\/fanhub\/([^/]+)\/login\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "login" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/signin\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "signin" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/signup\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "signup" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/shop\/product\/([^/]+)\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "buyNowConfirm" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/product\/([^/]+)\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "shop", passMode: "raw" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/shop\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "shop", passMode: "raw" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/cart\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "cart" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/checkout\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "checkout" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/order-history\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "orderHistory" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)\/order-confirmation\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "orderConfirmation" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/([^/]+)$/, async function (params) {
    const siteSlug = params?.[0];
    const root = this?.root || document.getElementById("app");

    try {
      await renderEcommerceTemplatePage({ root, siteSlug, page: "home", passMode: "raw" });
    } catch (error) {
      console.error(error);
      PageNotFound.call({ root });
    }
  });
}
