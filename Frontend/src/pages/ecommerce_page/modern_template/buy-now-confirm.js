import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernBuyNowConfirm(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "buyNowConfirm",
  });
}
