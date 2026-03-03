import api from "../api.js";
import { getActiveSiteSlug, setSessionToken } from "../../../lib/site-context.js";

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export async function registerUser(userData) {
  try {
    const response = await api.post("/bini/users/register", userData);
    return response.data;
  } catch (error) {
    console.error("Failed to register:", error);
    throw new Error(getErrorMessage(error, "Registration failed"));
  }
}

export async function loginUser(loginData) {
  try {
    const response = await api.post("/bini/users/login", loginData);
    const result = response.data;
    const token = result?.token;

    if (token) {
      const siteSlug = getActiveSiteSlug();
      if (!siteSlug) throw new Error("Site scope is required");
      setSessionToken(token, siteSlug);
    }

    return result;
  } catch (error) {
    console.error("Failed to login:", error);
    throw new Error(getErrorMessage(error, "Login failed"));
  }
}
