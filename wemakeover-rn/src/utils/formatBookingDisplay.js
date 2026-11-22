const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daySuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

/** Figma style: Sun, 17th Jul 2025 */
export function formatBookingSummaryDate(date) {
  if (!date) return "";
  const d = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`)
    : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const day = d.getDate();
  return `${DAYS[d.getDay()]}, ${day}${daySuffix(day)} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatBookingSummaryTime(slot) {
  if (!slot) return "";
  if (/am|pm/i.test(String(slot))) return String(slot);
  const [hours, minutes] = String(slot).split(":");
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return String(slot);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${minutes || "00"} ${ampm}`;
}

export function formatBookingAddress(address) {
  if (!address || typeof address !== "object") return "";
  const parts = [
    address.completeAddress,
    address.streetAreaName || address.street,
    address.houseFlatNumber,
    address.landmark,
    [address.city, address.state].filter(Boolean).join(", "),
    address.pincode,
  ].filter(Boolean);
  const unique = [...new Set(parts.map((p) => String(p).trim()).filter(Boolean))];
  return unique.join(", ") || "Address on file";
}

export function formatDurationShort(minutes) {
  const n = Number.parseInt(minutes, 10);
  if (!Number.isFinite(n) || n <= 0) return "60 mins";
  return `${n} mins`;
}
