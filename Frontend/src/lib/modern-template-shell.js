const MODERN_TEMPLATE_CLASS = "ec-template-modern";

export function applyModernTemplateShell(root, page = "page") {
  if (typeof document === "undefined") return;

  document.body.classList.add(MODERN_TEMPLATE_CLASS);
  document.documentElement.classList.add(MODERN_TEMPLATE_CLASS);

  if (root && root.classList) {
    root.classList.add(MODERN_TEMPLATE_CLASS);
    root.setAttribute("data-template-page", String(page || "page").trim().toLowerCase());
  }
}

