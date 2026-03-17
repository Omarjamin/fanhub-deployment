// Repost a specific post by postId

import api from "../api.js";
import { showToast } from "../../../utils/toast.js";

export async function repost(postId, token) {
  try {
    const response = await api.patch(`/bini/posts/${postId}/repost`);
    showToast("Post reposted successfully!", "success");
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to repost.";
    if (String(message).toLowerCase().includes("already reposted")) {
      showToast("You have already reposted this post.", "info");
    } else if (String(message).toLowerCase().includes("own post")) {
      showToast("You cannot repost your own post.", "info");
    } else {
      showToast(`Failed to repost: ${message}`, "error");
    }
    throw error;
  }
}
