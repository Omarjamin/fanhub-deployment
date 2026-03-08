import { getTemplatePage } from "../../lib/template-registry.js";

function resolveRoot(ctx) {
  return ctx?.root || document.getElementById("app");
}

function renderStaticBiniPage(page, ctx, payload) {
  const Page = getTemplatePage("bini", page);

  if (typeof Page !== "function") {
    throw new Error(`Missing bini page: ${page}`);
  }

  Page.call({ root: resolveRoot(ctx) }, payload);
}

export default function registerBiniRoutes(app, deps) {
  const {
    PageNotFound,
    renderCommunityTemplatePage,
    fetchSiteBySlug,
  } = deps;

  app.add("/bini", function () {
    renderStaticBiniPage("home", this);
  });

  app.add("/bini/register", function () {
    renderStaticBiniPage("register", this);
  });

  app.add("/bini/login", function () {
    renderStaticBiniPage("login", this);
  });

  app.add("/bini/logina", function () {
    renderStaticBiniPage("login", this);
  });

  app.add("/bini/search", function () {
    renderStaticBiniPage("search", this);
  });

  app.add("/bini/profile", function () {
    renderStaticBiniPage("profile", this);
  });

  app.add("/bini/notifications", function () {
    renderStaticBiniPage("notifications", this);
  });

  app.add("/bini/others-profile", function () {
    renderStaticBiniPage("othersProfile", this);
  });

  app.add(/\/bini\/thread\/([^/]+)/, function (params) {
    renderStaticBiniPage("thread", this, [params?.[0]]);
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "home" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/register\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "register" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/login\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "login" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/logina\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "login" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/search\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "search" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/profile\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "profile" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/notifications\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "notifications" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/others-profile\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const root = resolveRoot(this);
    try {
      await renderCommunityTemplatePage({ root, siteSlug, page: "othersProfile" });
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });

  app.add(/\/fanhub\/community-platform\/([^/]+)\/thread\/([^/]+)\/?$/, async function (params) {
    const siteSlug = params?.[0];
    const threadId = params?.[1];
    const root = resolveRoot(this);

    try {
      const siteData = await fetchSiteBySlug(siteSlug);
      const templateValue = String(siteData?.template || "bini").trim().toLowerCase();
      const Page = getTemplatePage(templateValue, "thread");

      if (typeof Page !== "function") {
        throw new Error("Missing template page: thread");
      }

      Page.call({ root }, [threadId]);
    } catch (err) {
      console.error(err);
      PageNotFound.call({ root });
    }
  });
}
