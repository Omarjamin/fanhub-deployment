import api from "../api.js";

const FOLLOW_ENDPOINTS = [
  (userId) => `/bini/users/${userId}/follow`,
  (userId) => `/bini/follow/${userId}`,
];

export async function follow(userId) {
  let lastError = null;

  for (const endpoint of FOLLOW_ENDPOINTS) {
    try {
      const response = await api.post(endpoint(userId));
      return response.data;
    } catch (error) {
      lastError = error;
      if (error?.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Follow endpoint not found.");
}

export default follow;
