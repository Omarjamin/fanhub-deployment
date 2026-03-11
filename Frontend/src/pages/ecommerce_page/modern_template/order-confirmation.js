import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernOrderConfirmation(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "orderConfirmation",
  });
}
