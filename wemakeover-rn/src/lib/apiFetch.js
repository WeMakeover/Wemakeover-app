import { BACKEND_URL } from "../config/env";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./tokenStorage";

/**
 * Drop-in replacement for `fetch` used by the ported web API files.
 *
 * Differences from the browser:
 *  - No cookies. We attach `Authorization: Bearer <accessToken>` from secure storage.
 *  - Adds `X-Client: mobile` so the backend returns tokens in the JSON body.
 *  - On a 401, transparently refreshes the token once and retries the request.
 *
 * It returns the real `Response` object, so callers can still use
 * `res.ok`, `res.status`, `res.json()`, `res.text()` exactly like before.
 *
 * The ported files call it with absolute URLs (`${BACKEND_URL}/...`) and may
 * still pass `credentials: "include"` — that option is simply ignored here.
 */

// Ensures only one refresh runs at a time even if many requests 401 together.
let refreshPromise = null;

async function runRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearTokens();
    return false;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client": "mobile" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      return false;
    }
    const data = await res.json().catch(() => null);
    const newAccess = data?.accessToken;
    const newRefresh = data?.refreshToken || refreshToken;
    if (!newAccess) {
      await clearTokens();
      return false;
    }
    await setTokens(newAccess, newRefresh);
    return true;
  } catch {
    return false;
  }
}

async function buildHeaders(extra) {
  const access = await getAccessToken();
  const headers = { "X-Client": "mobile", ...(extra || {}) };
  if (access) headers.Authorization = `Bearer ${access}`;
  return headers;
}

export async function apiFetch(url, options = {}) {
  // Strip cookie-only option carried over from the web code.
  const { credentials, headers: optHeaders, ...rest } = options;

  let headers = await buildHeaders(optHeaders);
  let res = await fetch(url, { ...rest, headers });

  // Token expired → refresh once and retry.
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = runRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      headers = await buildHeaders(optHeaders);
      res = await fetch(url, { ...rest, headers });
    }
  }

  return res;
}

export async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = String(text || "").slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      preview ? `Server did not return JSON (${preview})` : "Server did not return JSON"
    );
  }
}

export default apiFetch;
