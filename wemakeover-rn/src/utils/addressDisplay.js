/** Capitalize address type for UI (home → Home). Maps DB "office" → Work. */
export function formatAddressType(type) {
  const raw = String(type === "office" ? "work" : type || "home").trim();
  if (!raw) return "Home";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/**
 * Header / dropdown second line:
 * "Home - 15, Near old Jain temple" (type, house/flat, ~3–4 words of street/area).
 */
export function formatSavedAddressSubline(address, { maxWords = 4 } = {}) {
  if (!address) return "";

  const type = formatAddressType(address.addressType);
  const house = String(address.houseFlatNumber || "").trim();
  const areaRaw =
    address.streetAreaName ||
    address.completeAddress ||
    address.landmark ||
    [address.city, address.state].filter(Boolean).join(", ") ||
    "";
  const words = String(areaRaw)
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");

  const detail = [house, words].filter(Boolean).join(", ");
  return detail ? `${type} - ${detail}` : type;
}
