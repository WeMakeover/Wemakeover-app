import axios from "axios";
import { BACKEND_URL } from "../config/env";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStorage";

/**
 * Shared axios instance for authenticated endpoints (addresses, bookings,
 * payments, reviews, notifications, serviceability...). Mirrors the web axios
 * setup but injects a Bearer token instead of relying on cookies, and refreshes
 * transparently on 401.
 */
export const http = axios.create({
  baseURL: BACKEND_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json", "X-Client": "mobile" },
});

http.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

async function runRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await axios.post(
      `${BACKEND_URL}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json", "X-Client": "mobile" } }
    );
    const data = res.data?.data || res.data || {};
    const newAccess = data.accessToken;
    const newRefresh = data.refreshToken || refreshToken;
    if (newAccess) {
      await setTokens(newAccess, newRefresh);
      return true;
    }
    return false;
  } catch {
    await clearTokens();
    return false;
  }
}

http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = runRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const ok = await refreshPromise;
      if (ok) {
        const token = await getAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
    }

    const message =
      error.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default http;
