import { geocodePlaceString } from "../lib/locationService";

/** Haversine distance in kilometers between two WGS84 points. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Display like "452.26 km" or "320 m". */
export function formatDistanceKm(km) {
  if (km == null || Number.isNaN(km) || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

export function buildAddressGeocodeQueries(addr) {
  if (!addr) return [];
  const house = addr.houseFlatNumber && addr.houseFlatNumber !== "N/A" ? addr.houseFlatNumber : null;
  const area = addr.streetAreaName || null;
  const complete = addr.completeAddress || null;
  const city = addr.city || null;
  const state = addr.state || null;
  const pin = addr.pincode || null;

  const candidates = [
    [house, area, city, state, pin, "India"].filter(Boolean).join(", "),
    [area || complete, city, pin, "India"].filter(Boolean).join(", "),
    [city, state, pin, "India"].filter(Boolean).join(", "),
    [city, pin, "India"].filter(Boolean).join(", "),
    pin ? `${pin}, India` : null,
  ].filter(Boolean);

  // de-dupe while keeping order
  return [...new Set(candidates)];
}

/** Try several query shapes until one geocodes. */
export async function geocodeSavedAddress(addr) {
  const queries = buildAddressGeocodeQueries(addr);
  for (const q of queries) {
    const hit = await geocodePlaceString(q);
    if (hit) return hit;
  }
  return null;
}

// Back-compat helpers
export function buildAddressGeocodeQuery(addr) {
  return buildAddressGeocodeQueries(addr)[0] || "";
}

export async function geocodeAddressQuery(query) {
  return geocodePlaceString(query);
}
