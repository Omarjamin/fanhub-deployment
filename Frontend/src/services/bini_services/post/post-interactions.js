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
  } catch (_) {}

  return "";
}

export async function fetchRepostCounts(postId) {
  try {
    const response = await api.get(`/bini/posts/repost/count/${postId}`);
    const data = response.data;
    return data.repostCount || 0;
  } catch (error) {
    console.warn("Error fetching repost count:", error.message);
    return 0;
  }
}

export async function fetchCommentCounts(postId) {
  try {
    const response = await api.get(`/bini/posts/comments/count/${postId}`);
    const data = response.data;
    return data.commentCount || data.count || 0;
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    const message = error?.response?.data?.message || error?.message || "unknown error";
    console.warn(`Comment count unavailable for post ${postId} (status ${status || "n/a"}): ${message}`);
    return 0;
  }
}

export async function checkIfUserReposted(postId) {
  try {
    const response = await api.get(`/bini/posts/${postId}/repost`);
    const payload = response.data;
    if (typeof payload?.hasUserReposted === "boolean") {
      return payload.hasUserReposted;
    }

    const reposts = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.reposts)
        ? payload.reposts
        : [];

    return reposts.length > 0;
  } catch (error) {
    console.warn("Error checking repost status:", error);
    return false;
  }
}

export async function fetchIsCommentedStatus(postId) {
  try {
    const response = await api.get("/bini/comments/user");
    const userComments = response.data;

    return (
      Array.isArray(userComments) &&
      userComments.some((comment) => comment.post_id === parseInt(postId, 10))
    );
  } catch (error) {
    return false;
  }
}

export async function fetchIsLikedStatus(postId) {
  try {
    const response = await api.get(`/bini/posts/${postId}/likes/check`);
    const { isLiked } = response.data;
    return isLiked;
  } catch (_) {
    return false;
  }
}

export async function fetchLikedcounts(postId) {
  try {
    const response = await api.get(`/bini/posts/${postId}/likes/count`);
    const { likeCount } = response.data;
    return likeCount;
  } catch (_) {
    return 0;
  }
}

export async function toggleLike(postId, likeType = "post", commentId = null) {
  const response = await api.post(`/bini/posts/${postId}/likes/toggle`, { likeType, commentId });
  return response.data;
}

export async function reportPost(postId, reportDetails, communityType = "") {
  const endpoints = [`/bini/posts/${postId}/report`, `/bini/posts/report/${postId}`];
  const activeCommunity = resolveCommunityType(communityType);
  const requestPayload =
    typeof reportDetails === "string"
      ? { category: reportDetails, reason: "" }
      : {
          category: String(reportDetails?.category || reportDetails?.reason || "").trim(),
          reason: String(reportDetails?.reason || "").trim(),
          image_url: String(reportDetails?.image_url || reportDetails?.proof_url || "").trim() || null,
        };

  let lastPayload = null;
  let lastStatus = null;
  let lastErrorMessage = "";

  for (const endpoint of endpoints) {
    try {
      const response = await api.post(
        endpoint,
        requestPayload,
        { headers: activeCommunity ? { "x-community-type": activeCommunity } : {} },
      );
      const responsePayload = response.data || {};
      if (responsePayload.success !== false) {
        return responsePayload;
      }
      lastPayload = responsePayload;
      lastStatus = response.status;
    } catch (error) {
      const status = error.response?.status;
      const errorPayload = error.response?.data || {};
      lastPayload = errorPayload;
      lastStatus = status;
      lastErrorMessage = String(
        errorPayload?.error ||
        errorPayload?.message ||
        error?.message ||
        "",
      ).trim();
      if (status !== 404) {
        break;
      }
    }
  }

  const detail = lastPayload?.details ? ` (${lastPayload.details})` : "";
  const fallbackMessage =
    lastErrorMessage ||
    (lastStatus ? `HTTP ${lastStatus}` : "Failed to submit report.");
  throw new Error(fallbackMessage + detail);
}
