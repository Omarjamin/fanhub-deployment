// Fetch suggested followers from the API

import api from "../api.js";

export async function fetchSuggestedFollowers(token, limit = 10, offset = 0) {
  try {
    const res = await api.get(`/bini/follow/suggested-followers?limit=${limit}&offset=${offset}`);
    return res.data;
  } catch (err) {
    console.error('Error fetching suggested followers:', err);
    throw err;
  }
}

export default fetchSuggestedFollowers;
