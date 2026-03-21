import api from "../api.js";
import {
  resolveCommunitySubmissionError,
  validateCommunityText,
} from "../../../utils/community-text.js";

function normalizeComments(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.comments)) return payload.comments;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function createComment(postId, content) {
  const validation = validateCommunityText(content, {
    label: "Comment",
    maxLength: 1000,
  });
  if (!validation.isValid) {
    throw new Error(validation.errors[0]);
  }

  const endpoints = [
    `/bini/comments/create/${postId}`,
    `/bini/posts/${postId}/comments/create`,
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const res = await api.post(endpoint, { content: validation.sanitized });
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
  throw new Error(resolveCommunitySubmissionError(lastError, "Comment creation failed"));
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
