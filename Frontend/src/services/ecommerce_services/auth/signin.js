import api from "../../../lib/api.js";
import { setAuthToken } from "./auth.js";

export async function loginUser(loginData) {
  try {
    console.log("Logging in with payload:", loginData);

    const siteSlug = String(loginData?.site_slug || "").trim().toLowerCase();
    const payload = {
      ...loginData,
      domain: siteSlug,
    };

    const response = await api.post("/users/login", payload);

    const result = response.data;
    const token = result?.token;
    if (token) {
      setAuthToken(token, siteSlug);
    }
    const userId = result?.user?.id || result?.user?.user_id || null;
    if (userId) {
      sessionStorage.setItem("userId", String(userId));
      sessionStorage.setItem("currentUserId", String(userId));
    }

    return result;
  } catch (error) {
    console.error("Failed to login:", error);

    const data = error.response?.data || {};
    const message = data.error || data.message || "Login failed";
    const wrapped = new Error(message);
    wrapped.code = data.code || null;
    wrapped.email = data.email || loginData?.email || '';
    wrapped.failed_login_attempts = data.failed_login_attempts || null;
    throw wrapped;
  }
}

export async function continueWithGoogle({ credential, site_slug, recaptcha_token = "" }) {
  try {
    const siteSlug = String(site_slug || "").trim().toLowerCase();
    const payload = {
      credential,
      site_slug: siteSlug,
      domain: siteSlug,
      recaptcha_token,
    };

    const response = await api.post("/users/google-auth", payload);
    const result = response.data || {};

    const token = result?.token;
    if (token) {
      setAuthToken(token, siteSlug);
    }

    const userId = result?.user?.id || result?.user?.user_id || null;
    if (userId) {
      sessionStorage.setItem("userId", String(userId));
      sessionStorage.setItem("currentUserId", String(userId));
    }

    return result;
  } catch (error) {
    const message = error.response?.data?.error || error.response?.data?.message || "Google login failed";
    throw new Error(message);
  }
}
