// Fetch users based on search keyword
import api from "../api.js";

const SEARCH_ENDPOINTS = [
  (keyword) => `/bini/search/users?keyword=${encodeURIComponent(keyword)}`,
  (keyword) => `/bini/search/search?keyword=${encodeURIComponent(keyword)}`,
];

export async function fetchSearchAll(token, keyword) {
  const query = String(keyword || "").trim();
  if (!query) {
    return { users: [] };
  }

  let lastError = null;

  for (const endpoint of SEARCH_ENDPOINTS) {
    try {
      const response = await api.get(endpoint(query));
      const payload = response.data;
      if (Array.isArray(payload)) return { users: payload };
      if (Array.isArray(payload?.users)) return payload;
      return { users: [] };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  return { users: [] };
}

export async function fetchHashtagPosts(token, keyword) {
  const query = String(keyword || "").trim();
  if (!query) {
    return { posts: [] };
  }

  const endpoints = [
    (value) => `/bini/search/hashtags?keyword=${encodeURIComponent(value)}`,
    (value) => `/bini/search/posts?keyword=${encodeURIComponent(value)}`,
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint(query));
      const payload = response.data;
      if (Array.isArray(payload)) return { posts: payload };
      if (Array.isArray(payload?.posts)) return payload;
      return { posts: [] };
    } catch (error) {
      lastError = error;
      if (error?.response?.status === 404) continue;
      throw error;
    }
  }

  throw lastError || new Error("Hashtag search endpoint not found");
}

export async function fetchPostsByQuery(token, keyword) {
  const query = String(keyword || "").trim();
  if (!query) return { posts: [] };

  const endpoints = [
    (value) => `/bini/search/posts?keyword=${encodeURIComponent(value)}`,
    (value) => `/bini/search/hashtags?keyword=${encodeURIComponent(value)}`,
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint(query));
      const payload = response.data;
      if (Array.isArray(payload)) return { posts: payload };
      if (Array.isArray(payload?.posts)) return payload;
      return { posts: [] };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error("Post search endpoint not found");
}

export default fetchSearchAll;
