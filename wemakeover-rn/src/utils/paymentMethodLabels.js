const LABELS = {
  google_pay: "Google Pay",
  phone_pe: "PhonePe",
  bhim: "BHIM",
  upi: "UPI",
  card: "Card",
  cod: "Pay After Service",
  cash: "Pay After Service",
  online: "Online",
};

export function getPaymentMethodLabel(method) {
  if (!method) return "Online";
  return LABELS[method] || LABELS[String(method).toLowerCase()] || "Online";
}
