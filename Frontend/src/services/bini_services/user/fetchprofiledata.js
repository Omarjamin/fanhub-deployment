// Fetch profile data for the currently authenticated user

import api from "../api.js";
import { getActiveSiteSlug, getSessionToken, setActiveSiteSlug } from "../../../lib/site-context.js";

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function resolveToken(preferredSite = "") {
  const siteSlug = getActiveSiteSlug(preferredSite) || preferredSite || "bini";
  return getSessionToken(siteSlug);
}

function resolveCommunityTypeFromPath() {
  try {
    const parts = String(window?.location?.pathname || "").split("/").filter(Boolean);
    if (parts[0] === "fanhub" && parts[1] === "community-platform" && parts[2]) {
      return String(parts[2]).trim().toLowerCase();
    }
    if (parts[0] === "fanhub" && parts[1] && parts[1] !== "community-platform") {
      return String(parts[1]).trim().toLowerCase();
    }
    return "";
  } catch (_) {
    return "";
  }
}

// const BINI_URL = import.meta.env.VITE_BINI_API_URL || 'http://localhost:4000/v1/bini';

// import api from './api'; // your axios instance

// Fetch profile data for the currently authenticated user
export async function fetchProfileData(preferredCommunity = "") {
  const token = resolveToken(preferredCommunity);
  const routeCommunity = resolveCommunityTypeFromPath();
  const storedCommunity = String(
    getActiveSiteSlug() || sessionStorage.getItem("community_type") || "",
  ).trim().toLowerCase();
  const communitiesToTry = Array.from(
    new Set([String(preferredCommunity || "").trim().toLowerCase(), routeCommunity, storedCommunity, "bini"].filter(Boolean)),
  );
  if (communitiesToTry[0]) {
    setActiveSiteSlug(communitiesToTry[0]);
  }

  const requestShapes = [
    (community) => ({ url: "/bini/users/profile", config: { headers: { "x-community-type": community } } }),
  ];

  const payload = parseJwtPayload(token);
  const userId = payload?.id || payload?.user_id || payload?.sub;
  if (userId) {
    requestShapes.push((community) => ({
      url: `/bini/users/profile/${encodeURIComponent(userId)}`,
      config: { headers: { "x-community-type": community } },
    }));
  }

  try {
    for (const community of communitiesToTry) {
      for (const shape of requestShapes) {
        try {
          const { url, config } = shape(community);
          const response = await api.get(url, config);
          return response.data?.user || response.data;
        } catch (innerErr) {
          if (innerErr?.response?.status !== 404) throw innerErr;
        }
      }
    }
    throw new Error("Failed to fetch profile data");
  } catch (error) {
    console.error("Error fetching profile data:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch profile data"
    );
  }
}

// Fetch profile data for a specific user by userId
export async function fetchProfileById(userId) {
  try {
    const response = await api.get(`/bini/users/profile/${encodeURIComponent(userId)}`);
    return response.data?.user || response.data;
  } catch (error) {
    console.error("Error fetching profile data:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch profile data"
    );
  }
}


