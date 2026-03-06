import api from "../api.js";
import { getActiveSiteSlug, setActiveSiteSlug } from "../../../lib/site-context.js";

export async function fetchOthersData(userId, preferredCommunity = "") {
  const resolvedUserId = String(userId || "").trim();
  if (!resolvedUserId) {
    throw new Error("Missing target user id");
  }
  const normalizedPreferredCommunity = String(preferredCommunity || "").trim().toLowerCase();
  const routeParts = String(window?.location?.pathname || "").split("/").filter(Boolean);
  const routeCommunity =
    routeParts[0] === "fanhub" && routeParts[1] === "community-platform" && routeParts[2]
      ? String(routeParts[2]).trim().toLowerCase()
      : "";
  const storedCommunity = String(
    getActiveSiteSlug() || sessionStorage.getItem("community_type") || "",
  ).trim().toLowerCase();
  const communitiesToTry = Array.from(
    new Set([
      normalizedPreferredCommunity,
      routeCommunity,
      storedCommunity,
      "bini",
      "",
    ]),
  );

  let lastError = null;
  for (const community of communitiesToTry) {
    const endpoints = [
      `/bini/users/profile/${encodeURIComponent(resolvedUserId)}`,
      `/bini/users/${encodeURIComponent(resolvedUserId)}`,
    ];
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint, community
          ? { headers: { "x-community-type": community } }
          : undefined);
        if (community) {
          setActiveSiteSlug(community);
        }
        return response.data;
      } catch (error) {
        lastError = error;
        if (error?.response?.status !== 404) break;
      }
    }
  }

  if (lastError?.response?.status === 404) {
    return null;
  }

  console.error("Error fetching other user profile:", lastError);
  throw lastError || new Error("Failed to fetch other user profile");
}
