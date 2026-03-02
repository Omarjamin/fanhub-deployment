import api from "../../../lib/api";

export async function registerUser(data) {
  try {
    const endpoint = "/users/register";
    console.log('Signup debug:', {
      baseURL: api.defaults.baseURL,
      endpoint,
      fullURL: `${api.defaults.baseURL}${endpoint}`,
      data
    });
    
    const res = await api.post(endpoint, data);

    console.log(res);

    return res.data;
  } catch (err) {
    console.error("Error details:", err);

    const errorMessage =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Registration failed";

    throw new Error(errorMessage);
  }
}

