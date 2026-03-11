import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernHome(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "home",
  });
}
