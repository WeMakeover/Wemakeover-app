export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[6-9]\d{9}$/;

export function parseContact(value) {
  const trimmed = value.trim();
  if (EMAIL_RE.test(trimmed)) {
    return { channel: "email", email: trimmed.toLowerCase(), phoneNumber: "" };
  }
  const digits = trimmed.replace(/\D/g, "");
  if (PHONE_RE.test(digits)) {
    return { channel: "phone", email: "", phoneNumber: digits };
  }
  return { channel: null, email: "", phoneNumber: "" };
}

export function formatPhoneDisplay(phoneNumber) {
  if (!phoneNumber) return "";
  return `+91-${phoneNumber}`;
}

export function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0] || ""}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phoneNumber) {
  if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
  return `+91-******${phoneNumber.slice(-4)}`;
}

export function getOtpDestination({ channel, email, phoneNumber }) {
  if (channel === "phone") {
    return formatPhoneDisplay(phoneNumber);
  }
  return email || "";
}
