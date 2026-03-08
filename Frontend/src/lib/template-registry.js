import * as bini from "../pages/templates/bini";
import * as modern from "../pages/templates/modern";
import * as minimal from "../pages/templates/minimal";
import HOMEPAGE from "../pages/ecommerce_page/home_page/home_page.js";
import SIGNIN from "../pages/ecommerce_page/auth_page/signin_page.js";
import SIGNUP from "../pages/ecommerce_page/auth_page/signup_page.js";
import SHOP from "../pages/ecommerce_page/shop_page/shop_page.js";
import Checkout from "../pages/ecommerce_page/checkout_page/checkout_page/check_page.js";
import OrderHistory from "../pages/ecommerce_page/order_page/order_history_page.js";
import OrderConfirmation from "../components/ecommerce_components/order/order_confirmation.js";

const TEMPLATE_REGISTRY = {
  bini,
  modern,
  minimal,
};

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

export function resolveTemplateKey(templateValue) {
  const normalized = String(templateValue || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "bini";
  return TEMPLATE_ALIASES[normalized] || "bini";
}

export function getTemplatePage(templateValue, page) {
  const templateKey = resolveTemplateKey(templateValue);
  const activeTemplate = TEMPLATE_REGISTRY[templateKey] || TEMPLATE_REGISTRY.bini;

  return activeTemplate?.[page] || TEMPLATE_REGISTRY.bini?.[page] || null;
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
  },
  modern: {
    home: HOMEPAGE,
    login: SIGNIN,
    signin: SIGNIN,
    signup: SIGNUP,
    shop: SHOP,
    checkout: Checkout,
    orderHistory: OrderHistory,
    orderConfirmation: OrderConfirmation,
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
  },
};

export function getEcommerceTemplatePage(templateValue, page) {
  const templateKey = resolveTemplateKey(templateValue);
  const activeTemplate =
    ECOMMERCE_TEMPLATE_REGISTRY[templateKey] || ECOMMERCE_TEMPLATE_REGISTRY.bini;

  return activeTemplate?.[page] || ECOMMERCE_TEMPLATE_REGISTRY.bini?.[page] || null;
}

export { TEMPLATE_REGISTRY };
