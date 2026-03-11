import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernShop(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "shop",
  });
}
