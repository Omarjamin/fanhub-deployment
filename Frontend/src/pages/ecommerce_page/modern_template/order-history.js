import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernOrderHistory(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "orderHistory",
  });
}
