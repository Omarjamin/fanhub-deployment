import React from "react";
import { createRoot } from "react-dom/client";
import ModernApp from "./App";
import { setModernTemplateContext } from "./context";
import "../../styles/modern-react.css";

const THEME_VARIABLE_KEYS = [
  "--color-background",
  "--color-surface",
  "--color-surface-alt",
  "--color-border",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-primary",
  "--color-secondary",
  "--color-accent",
  "--color-primary-soft",
  "--color-primary-hover",
  "--color-primary-active",
  "--color-secondary-soft",
  "--color-secondary-hover",
  "--color-accent-soft",
  "--color-accent-hover",
  "--color-on-primary",
  "--color-on-secondary",
  "--color-on-accent",
  "--color-on-surface",
  "--color-on-background",
  "--background-rgb",
  "--foreground-rgb",
  "--card-rgb",
  "--card-foreground-rgb",
  "--primary-rgb",
  "--primary-foreground-rgb",
  "--secondary-rgb",
  "--secondary-foreground-rgb",
  "--accent-rgb",
  "--accent-foreground-rgb",
  "--muted-rgb",
  "--muted-foreground-rgb",
  "--border-rgb",
  "--theme-font-heading",
  "--theme-font-body",
  "--theme-font-family",
  "--theme-font-size-base",
  "--theme-line-height",
  "--theme-letter-spacing",
  "--theme-button-bg",
  "--theme-button-text",
  "--theme-button-hover-bg",
  "--theme-button-hover-text",
  "--theme-nav-bg",
  "--theme-nav-text",
  "--theme-nav-hero-text",
];

function copyThemeVariablesToRoot(root) {
  const computed = window.getComputedStyle(document.documentElement);
  THEME_VARIABLE_KEYS.forEach((key) => {
    const value = computed.getPropertyValue(key);
    if (value && value.trim()) {
      root.style.setProperty(key, value.trim());
    }
  });
}

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
  root.classList.add("modern-react-root");
  document.documentElement.classList.add("ec-template-modern");
  document.body.classList.add("ec-template-modern");
  copyThemeVariablesToRoot(root);

  const reactRoot = createRoot(root);
  reactRoot.render(
    React.createElement(ModernApp, {
      basename: resolveBasename(siteSlug),
    }),
  );

  root.__modernReactCleanup = () => {
    reactRoot.unmount();
    root.removeAttribute("data-react-root");
    root.classList.remove("modern-react-root");
    if (!document.querySelector("[data-react-root='modern']")) {
      document.documentElement.classList.remove("ec-template-modern");
      document.body.classList.remove("ec-template-modern");
    }
  };
}

export default mountModernReactApp;
