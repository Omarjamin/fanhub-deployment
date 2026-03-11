import HOMEPAGE from "../pages/ecommerce_page/home_page/home_page.js";
import SIGNIN from "../pages/ecommerce_page/auth_page/signin_page.js";
import SIGNUP from "../pages/ecommerce_page/auth_page/signup_page.js";
import SHOP from "../pages/ecommerce_page/shop_page/shop_page.js";
import Checkout from "../pages/ecommerce_page/checkout_page/checkout_page/check_page.js";
import OrderHistory from "../pages/ecommerce_page/order_page/order_history_page.js";
import OrderConfirmation from "../components/ecommerce_components/order/order_confirmation.js";
import ModernHome from "../pages/ecommerce_page/modern_template/home.js";
import ModernSignin from "../pages/ecommerce_page/modern_template/signin.js";
import ModernSignup from "../pages/ecommerce_page/modern_template/signup.js";
import ModernShop from "../pages/ecommerce_page/modern_template/shop.js";
import ModernCheckout from "../pages/ecommerce_page/modern_template/checkout.js";
import ModernOrderHistory from "../pages/ecommerce_page/modern_template/order-history.js";
import ModernOrderConfirmation from "../pages/ecommerce_page/modern_template/order-confirmation.js";
import ModernCart from "../pages/ecommerce_page/modern_template/cart.js";
import ModernBuyNowConfirm from "../pages/ecommerce_page/modern_template/buy-now-confirm.js";

const TEMPLATE_ALIASES = {
  "default template": "bini",
  default: "bini",
  bini: "bini",
  "bini template": "bini",
  modern: "modern",
  "modern template": "modern",
  minimal: "minimal",
  "minimal template": "minimal",
};

const TEMPLATE_MODULES = import.meta.glob("../pages/templates/*/*.js");

export function resolveTemplateKey(templateValue) {
  const normalized = String(templateValue || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "bini";
  return TEMPLATE_ALIASES[normalized] || "bini";
}

async function loadTemplateModule(templateKey, page) {
  const modulePath = `../pages/templates/${templateKey}/${page}.js`;
  const importer = TEMPLATE_MODULES[modulePath];

  if (!importer) {
    return null;
  }

  const module = await importer();
  return module?.default || null;
}

export async function getTemplatePage(templateValue, page) {
  const templateKey = resolveTemplateKey(templateValue);
  const pageKey = String(page || "home").trim();

  const resolvedPage =
    (await loadTemplateModule(templateKey, pageKey)) ||
    (templateKey !== "bini" ? await loadTemplateModule("bini", pageKey) : null);

  return resolvedPage || null;
}

const ECOMMERCE_TEMPLATE_REGISTRY = {
  bini: {
    home: HOMEPAGE,
    login: SIGNIN,
    signin: SIGNIN,
    signup: SIGNUP,
    shop: SHOP,
    checkout: Checkout,
    orderHistory: OrderHistory,
    orderConfirmation: OrderConfirmation,
    cart: ModernCart,
    buyNowConfirm: ModernBuyNowConfirm,
  },
  modern: {
    home: ModernHome,
    login: ModernSignin,
    signin: ModernSignin,
    signup: ModernSignup,
    shop: ModernShop,
    checkout: ModernCheckout,
    orderHistory: ModernOrderHistory,
    orderConfirmation: ModernOrderConfirmation,
    cart: ModernCart,
    buyNowConfirm: ModernBuyNowConfirm,
  },
  minimal: {
    home: HOMEPAGE,
    login: SIGNIN,
    signin: SIGNIN,
    signup: SIGNUP,
    shop: SHOP,
    checkout: Checkout,
    orderHistory: OrderHistory,
    orderConfirmation: OrderConfirmation,
    cart: ModernCart,
    buyNowConfirm: ModernBuyNowConfirm,
  },
};

export async function getEcommerceTemplatePage(templateValue, page) {
  const templateKey = resolveTemplateKey(templateValue);
  const activeTemplate =
    ECOMMERCE_TEMPLATE_REGISTRY[templateKey] || ECOMMERCE_TEMPLATE_REGISTRY.bini;

  return activeTemplate?.[page] || ECOMMERCE_TEMPLATE_REGISTRY.bini?.[page] || null;
}
