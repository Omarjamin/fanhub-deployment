import api from "../api.js";

export async function getComments(postId, token) {
  try {
    const response = await api.get(`/bini/comments/${postId}`);
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.comments)) return payload.comments;
    return [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}
