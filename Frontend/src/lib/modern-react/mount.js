import React from "react";
import { createRoot } from "react-dom/client";
import ModernApp from "./App.tsx";
import { setModernTemplateContext } from "./context.ts";
import "../../styles/modern-react.css";

function resolveBasename(siteSlug = "") {
  const slug = String(siteSlug || "").trim().toLowerCase();
  return slug ? `/fanhub/${slug}` : "";
}

export function mountModernReactApp(root, payload = {}) {
  if (!root) {
    throw new Error("Missing mount root for modern template");
  }

  const normalizedSiteData =
    payload?.siteData && typeof payload.siteData === "object"
      ? payload.siteData
      : (payload && typeof payload === "object" ? payload : null);

  const siteSlug = String(
    payload?.siteSlug ||
      normalizedSiteData?.community_type ||
      normalizedSiteData?.domain ||
      ""
  )
    .trim()
    .toLowerCase();

  setModernTemplateContext({
    siteSlug,
    siteData: normalizedSiteData,
    page: payload?.page || "home",
  });

  if (typeof root.__modernReactCleanup === "function") {
    root.__modernReactCleanup();
  }

  root.innerHTML = "";
  root.setAttribute("data-react-root", "modern");

  const reactRoot = createRoot(root);
  reactRoot.render(
    React.createElement(ModernApp, {
      basename: resolveBasename(siteSlug),
    }),
  );

  root.__modernReactCleanup = () => {
    reactRoot.unmount();
    root.removeAttribute("data-react-root");
  };
}

export default mountModernReactApp;
