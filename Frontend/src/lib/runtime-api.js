const DEFAULT_API_V1 = "https://fanhub-deployment-production.up.railway.app/v1";

export function getRuntimeApiV1() {
  const fromWindow =
    typeof window !== "undefined" && window.__API_ORIGIN__
      ? `${String(window.__API_ORIGIN__).replace(/\/$/, "")}/v1`
      : "";
  return String(fromWindow || import.meta.env.VITE_API_URL || DEFAULT_API_V1).trim().replace(/\/$/, "");
}

export default { getRuntimeApiV1 };
