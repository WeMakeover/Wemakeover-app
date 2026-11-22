export const TRANSPORTATION_PLATFORM_FEE = 150;
export const GST_RATE = 0;

/**
 * Calculate full order pricing from product subtotal.
 * Matches server: subtotal - discount - WM coins + transportation fee (no GST).
 * WM Coins apply to product total only — never to the platform fee.
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
  const platformFee = TRANSPORTATION_PLATFORM_FEE;
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
