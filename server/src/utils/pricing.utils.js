export const TRANSPORTATION_DISPOSABLES_FEE = 150;

/** @deprecated Use TRANSPORTATION_DISPOSABLES_FEE */
export const TRANSPORTATION_PLATFORM_FEE = TRANSPORTATION_DISPOSABLES_FEE;

/** Legacy GST rate — only used when displaying old bookings that include tax */
export const GST_RATE = 18;

export const FEE_LABEL = 'Transportation & Disposables Fee';

/**
 * Calculate full order pricing from product subtotal.
 * Total = (discounted subtotal - WM coins) + transportation & disposables fee (no GST on new orders).
 * WM Coins apply to product total only — never to the platform fee.
 * @param {number} productSubtotal
 * @param {{ discountAmount?: number, wmCoinAmount?: number }} [options]
 */
export const calculateOrderPricing = (productSubtotal, options = {}) => {
  const subtotal = Math.max(0, Math.round(productSubtotal || 0));
  const discountAmount = Math.min(
    Math.max(0, Math.round(options.discountAmount || 0)),
    subtotal
  );
  const discountedSubtotal = subtotal - discountAmount;
  const wmCoinAmount = Math.min(
    Math.max(0, Math.round(options.wmCoinAmount || 0)),
    discountedSubtotal
  );
  const productDue = discountedSubtotal - wmCoinAmount;
  const platformFee = TRANSPORTATION_DISPOSABLES_FEE;
  const taxAmount = 0;
  const totalAmount = productDue + platformFee;

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    wmCoinAmount,
    platformFee,
    taxAmount,
    totalAmount,
  };
};
