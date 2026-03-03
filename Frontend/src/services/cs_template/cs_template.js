import PageNotFound from "../../pages/bini_pages/page_not_found/pageNotFound";

export default async function Cs_template(params) {
  const id = params?.[1] || 1;
  const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || "https://fanhub-deployment-production.up.railway.app/v1";
  const API_KEY = import.meta.env.VITE_API_KEY || "thread";
  const token = localStorage.getItem("authToken");
  const root = this?.root || document.getElementById("app");

  try {
    const res = await fetch(`${ADMIN_API_BASE}/generate/generated-websites/${id}`, {
      headers: {
        apikey: API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      throw new Error(json?.message || "Community not found");
    }

    // render mo dito using json.data
    root.innerHTML = `<h1>${json.data?.site_name || "Community"}</h1>`;
  } catch (err) {
    console.error(err);
    PageNotFound.call(this);
  }
}


