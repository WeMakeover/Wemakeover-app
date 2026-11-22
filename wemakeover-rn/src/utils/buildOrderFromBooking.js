/**
 * Build payment create-order payload from an existing unpaid booking.
 * Matches the web CompletePaymentModal shape (includes bookingId).
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildOrderDataFromBooking(booking, user = null) {
  if (!booking) return null;

  const services = (booking.services || []).map((service) => {
    const serviceId = service.serviceId || service.id || service._id;
    return {
      id: serviceId,
      serviceId,
      name: service.name,
      description: service.description || `${service.name} - Professional beauty service`,
      price: toNumber(service.price),
      quantity: toNumber(service.quantity, 1) || 1,
      image: service.image || "",
      category: service.category || "Regular",
      duration: service.duration || 60,
      optionLabel: service.optionLabel || null,
    };
  });

  const servicesSubtotal = services.reduce(
    (sum, s) => sum + s.price * s.quantity,
    0
  );

  const pricing = booking.pricing || {};
  const subtotal = toNumber(pricing.subtotal ?? booking.subtotal, servicesSubtotal);
  const platformFee = toNumber(pricing.platformFee ?? booking.platformFee, 0);
  const taxAmount = toNumber(pricing.taxAmount ?? booking.taxAmount, 0);
  const discountAmount = toNumber(pricing.discountAmount, 0);
  const wmCoinAmount = toNumber(pricing.wmCoinAmount, 0);
  const totalAmount = toNumber(
    pricing.totalAmount ?? booking.totalAmount,
    Math.max(0, subtotal - discountAmount - wmCoinAmount + platformFee + taxAmount)
  );

  const details = booking.bookingDetails || booking.booking || {};
  const rawAddress = details.address || booking.address || {};
  const phone =
    rawAddress.phone ||
    details.customerPhone ||
    user?.phoneNumber ||
    "";

  const address = {
    street: rawAddress.streetAreaName || rawAddress.street || rawAddress.completeAddress || "",
    city: rawAddress.city || "",
    state: rawAddress.state || "",
    pincode: rawAddress.pincode || "",
    phone,
    name: rawAddress.name || details.customerName || user?.name || "",
    email: rawAddress.email || details.customerEmail || user?.email || "",
    houseFlatNumber: rawAddress.houseFlatNumber || "",
    streetAreaName: rawAddress.streetAreaName || rawAddress.street || "",
    completeAddress: rawAddress.completeAddress || rawAddress.street || "",
    landmark: rawAddress.landmark || "",
    country: rawAddress.country || "India",
  };

  const date = details.date || booking.date || null;
  const slot = details.slot || booking.slot || booking.timeSlot || "";
  const duration =
    details.duration ||
    services.reduce((t, s) => t + (Number.parseInt(s.duration, 10) || 60) * s.quantity, 0);

  const bookingPayload = {
    date,
    slot,
    duration,
    address,
    notes: details.notes || null,
  };

  const customerName = details.customerName || user?.name || address.name || "Customer";
  const customerPhone = details.customerPhone || phone;
  const customerEmail = details.customerEmail || user?.email || address.email || "";

  return {
    bookingId: booking._id || booking.id,
    orderNumber: booking.orderNumber || null,
    services,
    pricing: {
      subtotal,
      platformFee,
      taxAmount,
      discountAmount,
      wmCoinAmount,
      totalAmount,
      currency: pricing.currency || "INR",
    },
    booking: bookingPayload,
    bookingDetails: {
      ...bookingPayload,
      customerName,
      customerPhone,
      customerEmail,
    },
    totalAmount,
    subtotal,
    platformFee,
    taxAmount,
    discountAmount,
    wmCoinAmount,
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
  };
}

export function isBookingPaid(booking) {
  const status = String(booking?.paymentStatus || "").toLowerCase();
  return status === "paid" || status === "completed";
}

export function getBookingPaymentMethod(booking) {
  return (
    booking?.paymentDetails?.paymentMethod ||
    booking?.paymentMethod ||
    "cod"
  );
}
