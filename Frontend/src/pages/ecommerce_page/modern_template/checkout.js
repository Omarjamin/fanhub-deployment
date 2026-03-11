import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernCheckout(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "checkout",
  });
}
