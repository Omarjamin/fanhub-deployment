import api from "../api.js";

const POST_BY_ID_ENDPOINTS = [
  (postId) => `/bini/posts/${postId}`,
  (postId) => `/bini/post/${postId}`,
];

export async function fetchPostById(postId) {
  let lastError = null;

  for (const endpoint of POST_BY_ID_ENDPOINTS) {
    try {
      const response = await api.get(endpoint(postId));
      const payload = response.data;
      return payload?.post || payload?.data || payload;
    } catch (error) {
      lastError = error;
      if (error?.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  console.error("Error fetching post by ID:", lastError);
  throw lastError || new Error("Post not found");
}
