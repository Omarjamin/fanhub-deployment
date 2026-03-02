import api from "../api.js";

function normalizeComments(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.comments)) return payload.comments;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function createComment(postId, content) {
  const endpoints = [
    `/bini/comments/create/${postId}`,
    `/bini/posts/${postId}/comments/create`,
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const res = await api.post(endpoint, { content });
      return res.data;
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) break;
    }
  }

  console.error(
    "Failed to create comment:",
    lastError?.response?.data || lastError?.message,
  );
  throw new Error(
    lastError?.response?.data?.message ||
      lastError?.message ||
      "Comment creation failed",
  );
}

export async function getComments(postId) {
  const endpoints = [
    `/bini/comments/${postId}`,
    `/bini/posts/${postId}/comments`,
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const res = await api.get(endpoint);
      return normalizeComments(res.data);
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) break;
    }
  }

  console.error(
    "Error fetching comments:",
    lastError?.response?.data || lastError?.message,
  );
  return [];
}
