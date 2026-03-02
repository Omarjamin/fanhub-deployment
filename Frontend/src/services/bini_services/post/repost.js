// Repost a specific post by postId

import api from "../api.js";

export async function repost(postId, token) {
  try {
    const response = await api.patch(`/bini/posts/${postId}/repost`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
