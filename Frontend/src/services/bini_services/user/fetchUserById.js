// Halimbawa fetchUserById function

import api from "../api.js";

export async function fetchUserById(userId, token) {
  try {
    const response = await api.get(`/bini/users/${userId}`);
    return response.data;
  } catch (e) {
    return { fullname: `User #${userId}`, profile_picture: 'default-profile.png' };
  }
}
