import { calculateOrderPricing } from "./pricingUtils";

export const formatAmount = (amount, currency = "INR") => {
  if (typeof amount !== "number" || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const convertToPaise = (amountInRupees) => {
  if (typeof amountInRupees !== "number" || isNaN(amountInRupees)) return 0;
  return Math.round(amountInRupees * 100);
};

export const calculateTax = (subtotal) => calculateOrderPricing(subtotal).taxAmount;
export const calculateTotal = (subtotal) => calculateOrderPricing(subtotal).totalAmount;

export const validateIndianPhone = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(cleaned);
};

export const parseDurationToMinutes = (duration) => {
  if (duration == null || duration === "") return 60;
  if (typeof duration === "number" && !Number.isNaN(duration)) {
    return Math.max(15, Math.round(duration));
  }
  const str = String(duration).trim().toLowerCase();
  if (!str) return 60;

  let totalMinutes = 0;
  const hrMatch = str.match(/(\d+)\s*(?:hr|hour)s?/);
  if (hrMatch) totalMinutes += parseInt(hrMatch[1], 10) * 60;
  const minMatch = str.match(/(\d+)\s*(?:min|mins|minute)s?/);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);

  if (totalMinutes === 0) {
    const num = parseInt(str, 10);
    if (!Number.isNaN(num)) totalMinutes = num;
    else return 60;
  }
  return Math.max(15, totalMinutes);
};

export const calculateServiceDuration = (services) => {
  if (!services || services.length === 0) return 0;
  return services.reduce(
    (total, service) => total + parseDurationToMinutes(service.duration) * service.quantity,
    0
  );
};

export const formatDuration = (minutes) => {
  if (typeof minutes !== "number" || isNaN(minutes)) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
};

export const formatDate = (date) => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
};

export const formatTime = (time) => {
  if (!time) return "";
  if (time.includes("AM") || time.includes("PM")) return time;
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/** Convert "09:00 AM" to "09:00" 24-hour. */
export const convertSlotTo24Hour = (slot) => {
  if (!slot) return "";
  const trimmed = slot.trim();
  if (!trimmed.toUpperCase().includes("AM") && !trimmed.toUpperCase().includes("PM")) {
    return trimmed;
  }
  const [timePart, periodRaw] = trimmed.split(" ");
  const [hoursStr, minutesStr] = timePart.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10) || 0;
  const period = periodRaw.toUpperCase();
  let hour24 = hours;
  if (period === "PM" && hours !== 12) hour24 = hours + 12;
  else if (period === "AM" && hours === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};
