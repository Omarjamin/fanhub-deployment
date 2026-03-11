import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernSignin(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "signin",
  });
}
