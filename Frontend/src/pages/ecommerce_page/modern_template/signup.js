import mountModernReactApp from "../../../lib/modern-react/mount.js";

export default function ModernSignup(payload = {}) {
  mountModernReactApp(this.root, {
    ...payload,
    page: "signup",
  });
}
