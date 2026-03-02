import api from "../api.js";
import { getActiveSiteSlug } from "../../../lib/site-context.js";

function resolveCommunityType(explicitCommunity = "") {
  const fromArg = String(explicitCommunity || "").trim().toLowerCase();
  if (fromArg) return fromArg;

  const fromStorage = String(
    getActiveSiteSlug() || sessionStorage.getItem("community_type") || "",
  ).trim().toLowerCase();
  if (fromStorage && fromStorage !== "community-platform") return fromStorage;

  try {
    const parts = String(window?.location?.pathname || "").split("/").filter(Boolean);
    if (parts[0] === "fanhub" && parts[1] === "community-platform" && parts[2]) {
      return String(parts[2]).toLowerCase();
    }
    if (parts[0] === "fanhub" && parts[1] && parts[1] !== "community-platform") {
      return String(parts[1]).toLowerCase();
    }
    if (parts[0] === "bini") return "bini";
  } catch (_) {}

  return "bini";
}

export async function fetchNotifications(_token, communityType = "") {
  try {
    const activeCommunity = resolveCommunityType(communityType);
    const response = await api.get("/bini/notifications/mynotif", {
      headers: activeCommunity ? { "x-community-type": activeCommunity } : {},
    });
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.notifications)) return payload.notifications;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

export default fetchNotifications;
