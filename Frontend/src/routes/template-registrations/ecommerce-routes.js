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
  
  app.add("/signup", SIGNUP);
  app.add("/shop", SHOP);
  app.add("/checkout", Checkout);
  app.add("/order-history", OrderHistory);
  app.add("/order-confirmation", OrderConfirmation);

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
