import * as SecureStore from "expo-secure-store";

/**
 * Secure storage for JWT access/refresh tokens.
 * Replaces the website's HttpOnly cookies (which aren't available to a native app).
 * Backed by Android Keystore / iOS Keychain via expo-secure-store.
 */
const ACCESS_KEY = "wm_access_token";
const REFRESH_KEY = "wm_refresh_token";
const FCM_KEY = "wm_fcm_token";

export async function setTokens(accessToken, refreshToken) {
  try {
    if (accessToken) await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  } catch (e) {
    console.warn("tokenStorage.setTokens failed:", e?.message);
  }
}

export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

// Remember the last FCM token we registered with the backend so we only
// re-POST it when it actually changes.
export async function getStoredFcmToken() {
  try {
    return await SecureStore.getItemAsync(FCM_KEY);
  } catch {
    return null;
  }
}

export async function setStoredFcmToken(token) {
  try {
    if (token) await SecureStore.setItemAsync(FCM_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function clearStoredFcmToken() {
  try {
    await SecureStore.deleteItemAsync(FCM_KEY);
  } catch {
    /* ignore */
  }
}
