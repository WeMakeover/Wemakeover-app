import Constants from "expo-constants";

/**
 * Backend base URL (must include the `/api` suffix).
 *
 * Resolution order:
 *  1. EXPO_PUBLIC_API_URL  (set in .env — requires Metro restart after change)
 *  2. app.json / app.config.js → expo.extra.apiBaseUrl
 *  3. Hardcoded LAN fallback (keep in sync with your current Wi‑Fi IP)
 *
 * Current PC Wi‑Fi IP: 192.168.1.15
 */
const FALLBACK = "http://192.168.1.15:3000/api";

const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;

export const BACKEND_URL = (fromEnv || fromExtra || FALLBACK).replace(/\/+$/, "");

export default BACKEND_URL;
