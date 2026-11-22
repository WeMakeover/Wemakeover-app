import { requireOptionalNativeModule } from "expo-modules-core";

const REVERSE_GEOCODE_URL =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

let cachedLocationModule;

/** Load expo-location only when the native ExpoLocation module exists. */
export function getLocationModule() {
  if (cachedLocationModule !== undefined) {
    return cachedLocationModule;
  }

  const nativeModule = requireOptionalNativeModule("ExpoLocation");
  if (!nativeModule) {
    cachedLocationModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    cachedLocationModule = require("expo-location");
    return cachedLocationModule;
  } catch {
    cachedLocationModule = null;
    return null;
  }
}

export async function reverseGeocodeCoords(latitude, longitude) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );

    if (!response.ok) throw new Error("Failed to fetch location data");

    const data = await response.json();

    let city = "Unknown location";
    if (data.city) city = data.city;
    else if (data.principalSubdivision) city = data.principalSubdivision;
    else if (data.locality) city = data.locality;

    const parts = [data.locality, data.principalSubdivision].filter(Boolean);
    const unique = [...new Set(parts)].filter((p) => p !== city);
    const subline = unique.join(", ") || data.localityInfo?.administrative?.[2]?.name || "";

    return { city, subline, error: null };
  } catch (err) {
    if (err.name === "AbortError") {
      return { city: "Location timeout", subline: "", error: "Location timeout" };
    }
    return { city: "Location unavailable", subline: "", error: "Location unavailable" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Forward-geocode a place string via native Expo Location (more reliable in-app).
 */
export async function geocodePlaceString(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  const Location = getLocationModule();
  if (Location?.geocodeAsync) {
    try {
      const results = await Location.geocodeAsync(q);
      const hit = results?.[0];
      if (hit && Number.isFinite(hit.latitude) && Number.isFinite(hit.longitude)) {
        return { latitude: hit.latitude, longitude: hit.longitude };
      }
    } catch {
      // fall through
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WeMakeoverApp/1.0 (contact: support@wemakeover.co.in)",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit?.lat || !hit?.lon) return null;
    return { latitude: Number(hit.lat), longitude: Number(hit.lon) };
  } catch {
    return null;
  }
}

export async function fetchDeviceCoords() {
  const Location = getLocationModule();
  if (!Location) {
    return {
      error: "rebuild_required",
      message: "Location unavailable",
    };
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { error: "permission_denied", message: "Location access denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      error: null,
    };
  } catch {
    return { error: "unavailable", message: "Location unavailable" };
  }
}
