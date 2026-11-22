/**
 * Build booking/payment payload from cart + address + slot.
 */
import { parseDurationToMinutes } from "./paymentUtils";
import { calculateOrderPricing } from "./pricingUtils";

export function buildCartOrderData({
  items,
  summary,
  address,
  user,
  selectedDate,
  selectedSlot,
  appliedCoupon,
}) {
  const pricing = calculateOrderPricing(summary.subtotal, {
    discountAmount: summary.discountAmount,
    wmCoinAmount: summary.wmCoinAmount || 0,
  });

  const services = (items || []).map((item) => {
    const serviceId = item.service_id || item.id;
    return {
      // Server COD path historically reads service.id; keep both.
      id: serviceId,
      serviceId,
      name: item.cardHeader,
      description: item.description || `${item.cardHeader} - Professional beauty service`,
      price: item.price,
      quantity: item.quantity,
      image: item.img || "",
      category: item.category || "Regular",
      duration: parseDurationToMinutes(item.duration),
      optionLabel: item.optionLabel || null,
      isReferralReward:
        Boolean(item.isReferralReward) ||
        /referral\s*reward/i.test(String(item.description || "")),
    };
  });

  const totalDuration = services.reduce((t, s) => t + s.duration * s.quantity, 0);

  const addressWithPhone = {
    street: address?.streetAreaName || address?.completeAddress || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
    phone: address?.phone || user?.phoneNumber || "",
    name: user?.name || "",
    email: user?.email || "",
  };

  const formattedBookingDetails = {
    date: selectedDate,
    slot: selectedSlot,
    address: addressWithPhone,
    customerName: user?.name || "",
    customerPhone: addressWithPhone.phone,
    notes: null,
    duration: totalDuration,
  };

  return {
    services,
    pricing: {
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      discountedSubtotal: pricing.discountedSubtotal,
      wmCoinAmount: pricing.wmCoinAmount || 0,
      platformFee: pricing.platformFee,
      taxAmount: pricing.taxAmount,
      totalAmount: pricing.totalAmount,
      currency: "INR",
    },
    booking: {
      date: selectedDate,
      slot: selectedSlot,
      duration: totalDuration,
      address: addressWithPhone,
      notes: null,
    },
    bookingDetails: formattedBookingDetails,
    totalAmount: pricing.totalAmount,
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    platformFee: pricing.platformFee,
    taxAmount: pricing.taxAmount,
    couponCode: appliedCoupon?.code || null,
    wmCoinAmount: pricing.wmCoinAmount || 0,
  };
}
