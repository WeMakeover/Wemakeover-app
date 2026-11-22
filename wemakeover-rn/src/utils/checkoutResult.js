/**
 * Normalize checkout / payment thunk results into a single shape the UI can trust.
 * Handles nested API envelopes, Prisma/Mongo id fields, and stringified errors.
 */

function asString(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
  }
  return null;
}

function extractErrorMessage(raw) {
  if (raw == null) return "Something went wrong. Please try again.";
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        return extractErrorMessage(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed || "Something went wrong. Please try again.";
  }
  if (typeof raw === "object") {
    return (
      raw.message ||
      raw.description ||
      raw.error?.description ||
      raw.error?.message ||
      (typeof raw.error === "string" ? raw.error : null) ||
      raw.payload ||
      "Something went wrong. Please try again."
    );
  }
  return "Something went wrong. Please try again.";
}

/**
 * @param {object} actionResult - result of await dispatch(thunk(...))
 * @returns {{
 *   ok: boolean,
 *   orderId: string|null,
 *   bookingId: string|null,
 *   orderNumber: string|null,
 *   paymentId: string|null,
 *   error: string|null,
 * }}
 */
export function normalizeCheckoutResult(actionResult) {
  const status = actionResult?.meta?.requestStatus;

  if (status === "rejected") {
    return {
      ok: false,
      orderId: null,
      bookingId: null,
      orderNumber: null,
      paymentId: null,
      error: extractErrorMessage(actionResult?.payload ?? actionResult?.error),
    };
  }

  if (status !== "fulfilled") {
    return {
      ok: false,
      orderId: null,
      bookingId: null,
      orderNumber: null,
      paymentId: null,
      error: "Checkout did not complete. Please try again.",
    };
  }

  const root = actionResult?.payload;
  // Support: { data: {...} }, { success, data }, or flat {...}
  const data =
    root?.data?.orderId || root?.data?.bookingId || root?.data?.orderNumber
      ? root.data
      : root?.data?.data && typeof root.data.data === "object"
        ? root.data.data
        : root?.data && typeof root.data === "object" && !Array.isArray(root.data)
          ? root.data
          : root;

  const orderId =
    asString(data?.orderId) ||
    asString(data?.order_id) ||
    asString(data?.id) ||
    asString(data?._id);
  const bookingId = asString(data?.bookingId) || asString(data?.booking_id);
  const orderNumber = asString(data?.orderNumber) || asString(data?.order_number);
  const paymentId = asString(data?.paymentId) || asString(data?.payment_id);

  const explicitSuccess =
    root?.success === true ||
    data?.success === true ||
    data?.status === "confirmed" ||
    data?.paymentMethod === "cod";

  const ok = Boolean(explicitSuccess || orderId || bookingId || paymentId || orderNumber);

  return {
    ok,
    orderId,
    bookingId,
    orderNumber,
    paymentId,
    error: ok ? null : extractErrorMessage(root),
  };
}

/** Map errors to short UX copy for online payment failures. */
export function getOnlinePaymentFailCopy(raw) {
  const blob = String(extractErrorMessage(raw) || "").toLowerCase();

  if (
    blob.includes("cancel") ||
    blob.includes("dismiss") ||
    blob.includes("back pressed") ||
    blob.includes("user_cancelled") ||
    blob.includes("payment_cancelled") ||
    blob.includes("payment_authentication")
  ) {
    return {
      key: "cancelled",
      title: "Payment failed",
      detail: "You cancelled the payment. Your cart is still saved.",
    };
  }

  if (
    blob.includes("network") ||
    blob.includes("timeout") ||
    blob.includes("timed out") ||
    blob.includes("connect") ||
    blob.includes("internet") ||
    blob.includes("offline") ||
    blob.includes("fetch failed")
  ) {
    return {
      key: "network",
      title: "Payment failed",
      detail: "Network issue. Check your connection and try again.",
    };
  }

  if (
    blob.includes("production build") ||
    blob.includes("expo go") ||
    blob.includes("native module")
  ) {
    return {
      key: "unavailable",
      title: "Payment failed",
      detail: "Online payment needs the app build. Use Pay After Service for now.",
    };
  }

  return {
    key: "failed",
    title: "Payment failed",
    detail: "Payment could not be completed. Your cart is still saved.",
  };
}

/** Friendly copy when Pay After Service / COD booking fails. */
export function getBookingFailCopy(raw) {
  const message = extractErrorMessage(raw);
  const blob = message.toLowerCase();

  if (blob.includes("slot") || blob.includes("unavailable")) {
    return {
      key: "slot",
      title: "Booking failed",
      detail: "That time slot is no longer available. Please pick another slot.",
    };
  }

  if (
    blob.includes("network") ||
    blob.includes("timeout") ||
    blob.includes("connect") ||
    blob.includes("fetch failed")
  ) {
    return {
      key: "network",
      title: "Booking failed",
      detail: "Network issue. Check your connection and try again.",
    };
  }

  return {
    key: "failed",
    title: "Booking failed",
    detail: message || "Could not confirm your booking. Your cart is still saved.",
  };
}
